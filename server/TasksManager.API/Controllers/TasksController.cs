using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId) =>
        Ok(await _service.GetAllByUserAsync(userId));

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
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTaskItemDto dto)
    {
        var updated = await _service.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // ── SubTasks ──────────────────────────────────────────────────────────────

    [HttpPost("{taskId:guid}/subtasks")]
    public async Task<IActionResult> AddSubTask(Guid taskId, CreateSubTaskDto dto)
    {
        var sub = await _service.AddSubTaskAsync(taskId, dto);
        return Created(string.Empty, sub);
    }

    [HttpPatch("subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> UpdateSubTask(Guid subTaskId, UpdateSubTaskDto dto)
    {
        var sub = await _service.UpdateSubTaskAsync(subTaskId, dto);
        return sub is null ? NotFound() : Ok(sub);
    }

    [HttpDelete("subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> DeleteSubTask(Guid subTaskId)
    {
        var deleted = await _service.DeleteSubTaskAsync(subTaskId);
        return deleted ? NoContent() : NotFound();
    }
}
