using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TasksManager.API.DTOs;
using TasksManager.API.Services;

namespace TasksManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
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
}
