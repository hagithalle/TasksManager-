using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TasksManager.API.DTOs;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;

    public TasksController(ITaskService service) => _service = service;

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

    [HttpGet("goal/{goalId:guid}")]
    public async Task<IActionResult> GetByGoal(Guid goalId) =>
        Ok(await _service.GetByGoalAsync(goalId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var task = await _service.GetByIdAsync(id);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTaskItemDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        dto = dto with { UserId = callerId.Value };
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTaskItemDto dto)
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

    // ── SubTasks ──────────────────────────────────────────────────────────────

    [HttpPost("{taskId:guid}/subtasks")]
    public async Task<IActionResult> AddSubTask(Guid taskId, CreateSubTaskDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var sub = await _service.AddSubTaskAsync(taskId, dto, callerId.Value);
        return sub is null ? NotFound() : Created(string.Empty, sub);
    }

    [HttpPatch("subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> UpdateSubTask(Guid subTaskId, UpdateSubTaskDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var sub = await _service.UpdateSubTaskAsync(subTaskId, dto, callerId.Value);
        return sub is null ? NotFound() : Ok(sub);
    }

    [HttpDelete("subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> DeleteSubTask(Guid subTaskId)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var deleted = await _service.DeleteSubTaskAsync(subTaskId, callerId.Value);
        return deleted ? NoContent() : NotFound();
    }
}
