using System.Text;
using System.Text.Json;
using TasksManager.API.DTOs;

namespace TasksManager.API.Services;

public class AiService
{
    private readonly IConfiguration _config;
    private readonly ILogger<AiService> _logger;
    private static readonly HttpClient _http = new();

    public AiService(IConfiguration config, ILogger<AiService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<AiParseResponseDto> ParseTextAsync(string text, string language = "he")
    {
        var apiKey = _config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini API key is not configured.");

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
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 2048
            }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";
        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(url, content);
        var responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini API error: {Status} {Body}", response.StatusCode, responseText);
            throw new InvalidOperationException("AI service error.");
        }

        // Extract text from Gemini response
        using var doc = JsonDocument.Parse(responseText);
        var generatedText = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
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
            var result = JsonSerializer.Deserialize<AiParseResponseDto>(generatedText, options);
            return result ?? new AiParseResponseDto([], [], []);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini response: {Text}", generatedText);
            return new AiParseResponseDto([], [], []);
        }
    }
}
