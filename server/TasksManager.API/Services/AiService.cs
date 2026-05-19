using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using TasksManager.API.DTOs;

namespace TasksManager.API.Services;

public class AiService
{
    private readonly IConfiguration _config;
    private readonly ILogger<AiService> _logger;
    private readonly IMemoryCache _cache;
    private static readonly HttpClient _http = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    public AiService(IConfiguration config, ILogger<AiService> logger, IMemoryCache cache)
    {
        _config = config;
        _logger = logger;
        _cache = cache;
    }

    private static string CacheKey(string text, string language)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{language}:{text}"));
        return "ai:" + Convert.ToHexString(hash);
    }

    public async Task<AiParseResponseDto> ParseTextAsync(string text, string language = "he")
    {
        var cacheKey = CacheKey(text, language);
        if (_cache.TryGetValue(cacheKey, out AiParseResponseDto? cached) && cached is not null)
        {
            _logger.LogInformation("AI parse cache hit");
            return cached;
        }

        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var langInstruction = language == "he"
            ? "The input text is in Hebrew. Extract tasks, goals, and list items from it."
            : "The input text is in English. Extract tasks, goals, and list items from it.";

        var prompt = $@"
{langInstruction}
Today's date is {today}.

Analyze the following text and extract:
1. TASKS: specific actionable items (things to do, calls to make, appointments, etc.)
2. GOALS: broader objectives or aspirations (long-term plans, things to achieve)
3. LIST_ITEMS: items that belong to a shopping list or any other list (products to buy, books to read, etc.) — include quantity if mentioned

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  ""tasks"": [
    {{
      ""title"": ""task title in the original language"",
      ""dueDate"": ""YYYY-MM-DD or null"",
      ""priority"": ""low|medium|high or null"",
      ""executionType"": ""quick|short|medium|long or null"",
      ""subTasks"": [""sub-task 1 title"", ""sub-task 2 title""]
    }}
  ],
  ""goals"": [
    {{
      ""title"": ""goal title in the original language"",
      ""category"": ""health|work|personal|finance|education|other or null"",
      ""dueDate"": ""YYYY-MM-DD or null""
    }}
  ],
  ""listItems"": [
    {{
      ""title"": ""item name in the original language (without quantity)"",
      ""quantity"": ""numeric or descriptive quantity e.g. 2, 1 kg — or null"",
      ""listName"": ""suggested list name in original language e.g. קניות, shopping""
    }}
  ]
}}

Rules:
- Keep titles in the ORIGINAL language of the input
- If a date is mentioned (e.g. ""Friday"", ""next week"", ""end of month""), convert it to YYYY-MM-DD relative to today ({today})
- Quick tasks (< 15 min) get executionType ""quick"", short (15-30 min) ""short"", medium (30-60 min) ""medium"", long (>1 hr) ""long""
- If something is a broad goal (like ""get fit"", ""learn programming""), put it in goals
- If something is a specific action (like ""call doctor"", ""submit report""), put it in tasks
- If a task is complex or multi-step (e.g., ""organize birthday party"", ""plan a trip"", ""prepare a presentation""), break it down into 3-7 concrete sub-tasks in the ""subTasks"" array
- Simple tasks (like ""buy milk"", ""call mom"") should have an empty ""subTasks"" array []
- Sub-task titles should be short, actionable, and in the ORIGINAL language
- If something is a list item to buy or collect (like ""buy milk"", ""2 sugar"", ""1 flour""), put it in listItems with the quantity extracted
- listItems should NOT also appear in tasks

Text to analyze:
{text}
";

        var requestBody = new
        {
            model = "gpt-4o-mini",
            temperature = 0.2,
            max_tokens = 2048,
            messages = new[]
            {
                new { role = "user", content = prompt }
            }
        };

        var url = "https://api.openai.com/v1/chat/completions";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("Authorization", $"Bearer {apiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI API error: {Status} {Body}", response.StatusCode, responseText);
            if ((int)response.StatusCode == 429)
                throw new InvalidOperationException("RATE_LIMIT");
            throw new InvalidOperationException("AI_ERROR");
        }

        // Extract text from OpenAI response
        using var doc = JsonDocument.Parse(responseText);
        var generatedText = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        // Clean markdown code blocks if present
        generatedText = generatedText.Trim();
        if (generatedText.StartsWith("```"))
        {
            var lines = generatedText.Split('\n');
            generatedText = string.Join('\n', lines.Skip(1).Take(lines.Length - 2));
        }

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = JsonSerializer.Deserialize<AiParseResponseDto>(generatedText, options)
                         ?? new AiParseResponseDto([], [], []);
            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse OpenAI response: {Text}", generatedText);
            return new AiParseResponseDto([], [], []);
        }
    }

    // ── Day Analysis ─────────────────────────────────────────────────────────

    public async Task<AiDayAnalysisDto> AnalyzeDayAsync(List<AiTaskSummaryDto> tasks, string language = "he")
    {
        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var langHe = language == "he";
        var taskLines = tasks.Select(t =>
            $"- ID:{t.Id} | {t.Title} | priority:{t.Priority} | type:{t.ExecutionType}" +
            (t.DurationMinutes.HasValue ? $" | {t.DurationMinutes}min" : "") +
            (t.PlannedTime != null ? $" | at:{t.PlannedTime}" : ""));

        var prompt = $@"
You are a personal productivity coach. Analyze today's task list and respond in {(langHe ? "Hebrew" : "English")}.

Task list ({tasks.Count} tasks):
{string.Join('\n', taskLines)}

Return ONLY valid JSON (no markdown):
{{
  ""loadLevel"": ""light""|""moderate""|""heavy""|""overloaded"",
  ""message"": ""short friendly assessment of the day in {(langHe ? "Hebrew" : "English")}"",
  ""encouragement"": ""one motivating sentence in {(langHe ? "Hebrew" : "English")}"",
  ""tasksToMove"": [
    {{ ""id"": ""task-id"", ""reason"": ""brief reason in {(langHe ? "Hebrew" : "English")}"" }}
  ]
}}

Rules:
- loadLevel: light (≤4 tasks), moderate (5-7), heavy (8-10), overloaded (>10 or >4 critical/high)
- tasksToMove: suggest 2-4 low-priority or deferrable tasks if day is heavy/overloaded, otherwise []
- Keep messages warm and friendly
- Respond in {(langHe ? "Hebrew (עברית)" : "English")}
";

        var generated = await CallGptAsync(apiKey, prompt, 512);
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiDayAnalysisDto>(generated, opts)
                   ?? new AiDayAnalysisDto("moderate", langHe ? "יום רגיל" : "Regular day", langHe ? "בהצלחה!" : "Good luck!", []);
        }
        catch
        {
            return new AiDayAnalysisDto("moderate", langHe ? "יום רגיל" : "Regular day", langHe ? "בהצלחה!" : "Good luck!", []);
        }
    }

    // ── Natural Language Search ───────────────────────────────────────────────

    public async Task<AiSearchResponseDto> SearchTasksAsync(string query, List<AiTaskSummaryDto> tasks, string language = "he")
    {
        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var langHe = language == "he";
        var taskLines = tasks.Select(t =>
            $"ID:{t.Id} | {t.Title} | priority:{t.Priority} | type:{t.ExecutionType}" +
            (t.DurationMinutes.HasValue ? $" | {t.DurationMinutes}min" : "") +
            (t.DueDate != null ? $" | due:{t.DueDate}" : ""));

        var prompt = $@"
You are a task search assistant. The user searches in natural language.
User query: ""{query}""

Tasks:
{string.Join('\n', taskLines)}

Return ONLY valid JSON (no markdown):
{{
  ""taskIds"": [""id1"", ""id2""],
  ""explanation"": ""brief explanation of search results in {(langHe ? "Hebrew" : "English")}""
}}

Rules:
- Match tasks semantically — by urgency, type, duration, keywords, due date, etc.
- "urgent"/"דחוף" → critical or high priority
- "short"/"קצר"/"quick" → executionType quick or short
- "week"/"שבוע"/"this week" → due within next 7 days
- "frog"/"צפרדע" → heavy/critical tasks (long duration or critical priority)
- Return empty array if no matches
- Keep explanation concise (1 sentence)
";

        var generated = await CallGptAsync(apiKey, prompt, 512);
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiSearchResponseDto>(generated, opts)
                   ?? new AiSearchResponseDto([], langHe ? "לא נמצאו תוצאות" : "No results found");
        }
        catch
        {
            return new AiSearchResponseDto([], langHe ? "לא נמצאו תוצאות" : "No results found");
        }
    }

    // ── Behavior Insights ────────────────────────────────────────────────────

    public async Task<AiInsightsResponseDto> GetInsightsAsync(AiInsightsRequestDto req)
    {
        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var langHe = (req.Language ?? "he") == "he";
        var completionRate = req.TotalTasks > 0
            ? Math.Round((double)req.CompletedTasks / req.TotalTasks * 100, 0) : 0;
        var frogRate = req.FrogTasksTotal > 0
            ? Math.Round((double)req.FrogTasksCompleted / req.FrogTasksTotal * 100, 0) : 0;
        var weekSummary = string.Join(", ", req.Last7Days.Select(d => $"{d.Date}: {d.Completed}/{d.Total}"));

        var prompt = $@"
You are a behavioral productivity coach analyzing user task data.

Stats:
- Total tasks: {req.TotalTasks}, Completed: {req.CompletedTasks} ({completionRate}%)
- Overdue tasks: {req.OverdueTasks}
- Frog tasks completed: {req.FrogTasksCompleted}/{req.FrogTasksTotal} ({frogRate}%)
- Last 7 days (date: completed/total): {weekSummary}

Return ONLY valid JSON (no markdown):
{{
  ""overallMessage"": ""2-3 sentence personalized message in {(langHe ? "Hebrew" : "English")}"",
  ""patterns"": [
    {{
      ""type"": ""procrastination""|""overload""|""strength""|""tip"",
      ""message"": ""observation in {(langHe ? "Hebrew" : "English")}"",
      ""suggestion"": ""actionable suggestion or null"",
      ""emoji"": ""single emoji""
    }}
  ]
}}

Rules:
- Return 2-4 patterns based on what you observe
- If frog completion < 40%: procrastination pattern on frog tasks, suggest breaking into sub-tasks
- If completion rate < 50%: overload pattern, suggest reducing daily load
- If overdue > 5: suggest reviewing overdue tasks
- If streak days (consecutive completions): strength pattern
- Always end with at least one ""tip"" pattern with a practical suggestion
- Respond entirely in {(langHe ? "Hebrew (עברית)" : "English")}
";

        var generated = await CallGptAsync(apiKey, prompt, 700);
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiInsightsResponseDto>(generated, opts)
                   ?? new AiInsightsResponseDto(langHe ? "המשך כך!" : "Keep it up!", []);
        }
        catch
        {
            return new AiInsightsResponseDto(langHe ? "המשך כך!" : "Keep it up!", []);
        }
    }

    // ── Goals Analysis Agent ─────────────────────────────────────────────────

    public async Task<AiGoalAnalysisResponseDto> AnalyzeGoalsAsync(AiGoalAnalysisRequestDto req)
    {
        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var langHe = (req.Language ?? "he") == "he";
        var today  = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var goalLines = req.Goals.Select(g =>
        {
            var pct = g.TotalTasks > 0 ? Math.Round((double)g.CompletedTasks / g.TotalTasks * 100, 0) : 0;
            var daysOld = (DateTime.UtcNow - g.CreatedAt).Days;
            var overdue = g.DueDate != null && string.Compare(g.DueDate, today) < 0;
            return $"- ID:{g.Id} | \"{g.Title}\" | category:{g.Category} | {g.CompletedTasks}/{g.TotalTasks} tasks ({pct}%) | " +
                   (g.DueDate != null ? $"due:{g.DueDate}{(overdue ? " (OVERDUE)" : "")}" : "no due date") +
                   $" | created {daysOld}d ago";
        });

        var prompt = $@"
You are a goal achievement coach. Analyze the user's goals and give personalized advice in {(langHe ? "Hebrew (עברית)" : "English")}.

Today: {today}
Goals:
{string.Join('\n', goalLines)}

Return ONLY valid JSON (no markdown):
{{
  ""overallMessage"": ""2-3 sentence personal overview in {(langHe ? "Hebrew" : "English")}"",
  ""goals"": [
    {{
      ""id"": ""goal-id"",
      ""status"": ""on-track""|""at-risk""|""completed""|""stalled"",
      ""assessment"": ""1-2 sentence analysis in {(langHe ? "Hebrew" : "English")}"",
      ""recommendation"": ""specific actionable suggestion or null""
    }}
  ],
  ""strategy"": ""1 overall strategy tip in {(langHe ? "Hebrew" : "English")} or null""
}}

Rules:
- completed: 100% tasks done
- on-track: >50% done and not overdue, or no tasks yet but recent goal (<14d old)
- at-risk: overdue, or <30% done and due date approaching (within 14 days), or has due date passed
- stalled: 0% done and goal is >30 days old
- Be empathetic, encouraging, specific — not generic
- Respond entirely in {(langHe ? "Hebrew (עברית)" : "English")}
";

        var generated = await CallGptAsync(apiKey, prompt, 900);
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiGoalAnalysisResponseDto>(generated, opts)
                   ?? new AiGoalAnalysisResponseDto(langHe ? "נמשך לנתח..." : "Analyzing...", [], null);
        }
        catch
        {
            return new AiGoalAnalysisResponseDto(langHe ? "שגיאה בניתוח" : "Analysis error", [], null);
        }
    }

    // ── Shopping List Intelligence Agent ─────────────────────────────────────

    public async Task<AiListIntelligenceResponseDto> AnalyzeListsAsync(AiListIntelligenceRequestDto req)
    {
        var apiKey = _config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key is not configured.");

        var langHe = (req.Language ?? "he") == "he";

        var itemLines = req.RecurringItems
            .OrderByDescending(i => i.Occurrences)
            .Take(40)
            .Select(i => $"- \"{i.Title}\" appeared {i.Occurrences}x" +
                         (i.LastSeenDate != null ? $", last seen {i.LastSeenDate}" : ""));

        var prompt = $@"
You are a smart shopping assistant analyzing a user's purchase history. Respond in {(langHe ? "Hebrew (עברית)" : "English")}.

Shopping history:
- Total lists analyzed: {req.TotalLists}
- History spans: ~{req.OldestListDaysAgo} days
- Recent list titles: {string.Join(", ", req.RecentListTitles.Take(5))}

Recurring items (sorted by frequency):
{string.Join('\n', itemLines)}

Return ONLY valid JSON (no markdown):
{{
  ""overallMessage"": ""2-sentence friendly summary of shopping patterns in {(langHe ? "Hebrew" : "English")}"",
  ""smartTemplate"": [
    {{
      ""name"": ""category name in {(langHe ? "Hebrew" : "English")}"",
      ""emoji"": ""single emoji"",
      ""items"": [""item1"", ""item2"", ""item3""]
    }}
  ],
  ""weeklyStaples"": [""item1"", ""item2""],
  ""mightNeedSoon"": [""item1"", ""item2""],
  ""shoppingPattern"": ""brief insight about shopping frequency/habits in {(langHe ? "Hebrew" : "English")}""
}}

Rules:
- smartTemplate: group all recurring items into 3-6 sensible categories (produce, dairy, cleaning, etc.)
- weeklyStaples: items appearing in >60% of lists — the must-haves every week
- mightNeedSoon: items seen historically but with lastSeenDate >14 days ago — might be running low
- Keep item names in the ORIGINAL language from the input (preserve Hebrew if present)
- Respond entirely in {(langHe ? "Hebrew (עברית)" : "English")}
";

        var generated = await CallGptAsync(apiKey, prompt, 900);
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiListIntelligenceResponseDto>(generated, opts)
                   ?? new AiListIntelligenceResponseDto(langHe ? "לא מספיק נתונים עדיין" : "Not enough data yet", [], [], [], null);
        }
        catch
        {
            return new AiListIntelligenceResponseDto(langHe ? "שגיאה בניתוח" : "Analysis error", [], [], [], null);
        }
    }

    // ── Shared GPT helper ────────────────────────────────────────────────────

    private async Task<string> CallGptAsync(string apiKey, string prompt, int maxTokens)
    {
        var requestBody = new
        {
            model = "gpt-4o-mini",
            temperature = 0.3,
            max_tokens = maxTokens,
            messages = new[] { new { role = "user", content = prompt } }
        };

        var url = "https://api.openai.com/v1/chat/completions";
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("Authorization", $"Bearer {apiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), System.Text.Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI API error: {Status} {Body}", response.StatusCode, responseText);
            if ((int)response.StatusCode == 429) throw new InvalidOperationException("RATE_LIMIT");
            throw new InvalidOperationException("AI_ERROR");
        }

        using var doc = JsonDocument.Parse(responseText);
        var text = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        text = text.Trim();
        if (text.StartsWith("```"))
        {
            var lines = text.Split('\n');
            text = string.Join('\n', lines.Skip(1).Take(lines.Length - 2));
        }
        return text;
    }
}
