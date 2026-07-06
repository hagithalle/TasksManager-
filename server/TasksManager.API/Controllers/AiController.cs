using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TasksManager.API.DTOs;
using TasksManager.API.Services;

namespace TasksManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("ai")]
public class AiController : ControllerBase
{
    // POST api/ai/extract-recipe
    [AllowAnonymous]
    [HttpPost("extract-recipe")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult> ExtractRecipe([FromForm] string? url, [FromForm] IFormFile? file)
    {
        // דמו: מחזיר מתכון "מחולץ" לפי סוג הבקשה
        if (!string.IsNullOrWhiteSpace(url))
        {
            return Ok(new
            {
                title = "פסטה בולונז (מחולץ מ-URL)",
                ingredients = new[] { "פסטה 500 גרם", "בשר טחון 300 גרם", "עגבניות 2" },
                notes = "לבשל הכל יחד."
            });
        }
        if (file != null)
        {
            return Ok(new
            {
                title = "עוגת שוקולד (מחולץ מקובץ)",
                ingredients = new[] { "קקאו 2 כפות", "קמח 1 כוס", "סוכר 1/2 כוס" },
                notes = "לאפות 30 דקות."
            });
        }
        return BadRequest("יש לספק כתובת או קובץ");
    }
    private readonly AiService _ai;
    private readonly ILogger<AiController> _logger;

    public AiController(AiService ai, ILogger<AiController> logger)
    {
        _ai = ai;
        _logger = logger;
    }

    // POST api/ai/parse
    [HttpPost("parse")]
    public async Task<IActionResult> Parse(AiParseRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest(new { message = "Text is required." });

        try
        {
            var result = await _ai.ParseTextAsync(dto.Text, dto.Language ?? "he");
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/day-analysis
    [HttpPost("day-analysis")]
    public async Task<IActionResult> AnalyzeDay(AiDayAnalysisRequestDto dto)
    {
        if (dto.Tasks == null || dto.Tasks.Count == 0)
            return Ok(new AiDayAnalysisDto("light", "", "", []));

        try
        {
            var result = await _ai.AnalyzeDayAsync(dto.Tasks, dto.Language ?? "he");
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in day-analysis");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/search
    [HttpPost("search")]
    public async Task<IActionResult> Search(AiSearchRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Query))
            return BadRequest(new { message = "Query is required." });

        try
        {
            var result = await _ai.SearchTasksAsync(dto.Query, dto.Tasks ?? [], dto.Language ?? "he");
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in search");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/insights
    [HttpPost("insights")]
    public async Task<IActionResult> GetInsights(AiInsightsRequestDto dto)
    {
        try
        {
            var result = await _ai.GetInsightsAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in insights");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/goal-analysis
    [HttpPost("goal-analysis")]
    public async Task<IActionResult> AnalyzeGoals(AiGoalAnalysisRequestDto dto)
    {
        if (dto.Goals == null || dto.Goals.Count == 0)
            return BadRequest(new { message = "No goals provided." });

        try
        {
            var result = await _ai.AnalyzeGoalsAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in goal-analysis");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/list-intelligence
    [HttpPost("list-intelligence")]
    public async Task<IActionResult> AnalyzeLists(AiListIntelligenceRequestDto dto)
    {
        if (dto.TotalLists < 2)
            return BadRequest(new { message = "Need at least 2 lists to detect patterns." });

        try
        {
            var result = await _ai.AnalyzeListsAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in list-intelligence");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/shabbat-plan
    [HttpPost("shabbat-plan")]
    public async Task<IActionResult> PlanShabbat(ShabbatPlanRequestDto dto)
    {
        try
        {
            var result = await _ai.PlanShabbatAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in shabbat-plan");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }

    // POST api/ai/plan
    [HttpPost("plan")]
    public async Task<IActionResult> AnalyzePlan(AiPlanRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest(new { message = "Text is required." });

        try
        {
            var result = await _ai.AnalyzePlanAsync(dto.Text, dto.Language ?? "he");
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { code = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected AI error in plan analysis");
            return StatusCode(500, new { code = "AI_ERROR" });
        }
    }
}
