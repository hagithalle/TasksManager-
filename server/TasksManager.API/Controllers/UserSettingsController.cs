using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TasksManager.API.DTOs;
using TasksManager.API.Services;

namespace TasksManager.API.Controllers;

[ApiController]
[Route("api/user-settings")]
[Authorize]
public class UserSettingsController(UserSettingsService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await svc.GetOrCreateAsync(userId.Value));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateUserSettingsDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await svc.UpdateAsync(userId.Value, dto));
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
