using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CalendarController : ControllerBase
{
    private readonly IGoogleCalendarService _calendar;
    private readonly ILogger<CalendarController> _logger;

    public CalendarController(IGoogleCalendarService calendar, ILogger<CalendarController> logger)
    {
        _calendar = calendar;
        _logger   = logger;
    }

    // POST api/calendar/push
    [HttpPost("push")]
    public async Task<IActionResult> Push([FromBody] CalendarPushDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userId, out var uid))
            return Unauthorized();

        if (string.IsNullOrEmpty(dto.AccessToken))
            return BadRequest(new { code = "NO_ACCESS_TOKEN", message = "Access token is required." });

        _logger.LogInformation("Calendar push requested for user {UserId}", uid);

        var result = await _calendar.PushToCalendarAsync(uid, dto.AccessToken);

        _logger.LogInformation("Calendar push result: created={Created}, updated={Updated}, skipped={Skipped}, error={Error}",
            result.Created, result.Updated, result.Skipped, result.Error);

        if (result.Error == "AUTH_ERROR")
            return StatusCode(503, new { code = "AUTH_ERROR", message = "Failed to authenticate with Google Calendar." });

        if (result.Error is not null)
            return StatusCode(500, new { code = "ERROR", message = result.Error });

        return Ok(new { created = result.Created, updated = result.Updated, skipped = result.Skipped });
    }
}

public record CalendarPushDto(string AccessToken);
