using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TasksManager.API.DTOs;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class GoalsController : ControllerBase
{
    private readonly IGoalService _service;

    public GoalsController(IGoalService service) => _service = service;

    private Guid? GetCallerId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var callerId = GetCallerId();
        if (callerId is null || callerId != userId) return Forbid();
        return Ok(await _service.GetAllByUserAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var goal = await _service.GetByIdAsync(id);
        return goal is null ? NotFound() : Ok(goal);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateGoalDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        dto = dto with { UserId = callerId.Value };
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateGoalDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var updated = await _service.UpdateAsync(id, dto, callerId.Value);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var deleted = await _service.DeleteAsync(id, callerId.Value);
        return deleted ? NoContent() : NotFound();
    }
}
