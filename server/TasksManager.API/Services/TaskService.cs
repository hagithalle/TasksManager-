using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<TaskItemDto>> GetAllByUserAsync(Guid userId)
    {
        var ownTasks = await _db.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .Include(t => t.SubTasks)
            .ToListAsync();

        var sharedIds = await _db.ShareInvites
            .Where(s => s.AcceptedByUserId == userId && s.ResourceType == Models.ShareResourceType.Task)
            .Select(s => s.ResourceId)
            .ToListAsync();

        var sharedTasks = sharedIds.Any()
            ? await _db.Tasks
                .AsNoTracking()
                .Where(t => sharedIds.Contains(t.Id))
                .Include(t => t.SubTasks)
                .ToListAsync()
            : new List<TaskItem>();

        return ownTasks.Concat(sharedTasks).Select(ToDto);
    }

    public async Task<IEnumerable<TaskItemDto>> GetByGoalAsync(Guid goalId)
    {
        var tasks = await _db.Tasks
            .AsNoTracking()
            .Where(t => t.GoalId == goalId)
            .Include(t => t.SubTasks)
            .ToListAsync();
        return tasks.Select(ToDto);
    }

    public async Task<TaskItemDto?> GetByIdAsync(Guid id)
    {
        var task = await _db.Tasks
            .AsNoTracking()
            .Include(t => t.SubTasks)
            .FirstOrDefaultAsync(t => t.Id == id);
        return task is null ? null : ToDto(task);
    }

    public async Task<TaskItemDto> CreateAsync(CreateTaskItemDto dto)
    {
        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Title = dto.Title,
            Notes = dto.Notes,
            Priority = dto.Priority,
            ExecutionType = dto.ExecutionType,
            Difficulty = dto.Difficulty,
            DueDate = dto.DueDate,
            PlannedTime = dto.PlannedTime,
            DurationMinutes = dto.DurationMinutes,
            GoalId = dto.GoalId,
            ListId = dto.ListId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return ToDto(task);
    }

    public async Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskItemDto dto)
    {
        var task = await _db.Tasks.Include(t => t.SubTasks).FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return null;

        if (dto.Title is not null)         task.Title         = dto.Title;
        if (dto.Notes is not null)          task.Notes         = dto.Notes;
        if (dto.IsCompleted.HasValue)      task.IsCompleted   = dto.IsCompleted.Value;
        if (dto.Priority.HasValue)         task.Priority      = dto.Priority.Value;
        if (dto.ExecutionType.HasValue)    task.ExecutionType = dto.ExecutionType.Value;
        if (dto.Difficulty.HasValue)       task.Difficulty    = dto.Difficulty;
        if (dto.DueDate.HasValue)          task.DueDate       = dto.DueDate;
        if (dto.PlannedTime is not null)   task.PlannedTime   = dto.PlannedTime;
        if (dto.DurationMinutes.HasValue)  task.DurationMinutes = dto.DurationMinutes;
        if (dto.GoalId.HasValue)           task.GoalId        = dto.GoalId;
        if (dto.ListId.HasValue)           task.ListId        = dto.ListId;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(task);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return false;
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── SubTask ───────────────────────────────────────────────────────────────

    public async Task<SubTaskDto> AddSubTaskAsync(Guid taskId, CreateSubTaskDto dto)
    {
        var sub = new SubTask
        {
            Id = Guid.NewGuid(),
            TaskItemId = taskId,
            Title = dto.Title,
            ExecutionType = dto.ExecutionType,
            Priority = dto.Priority,
            DurationMinutes = dto.DurationMinutes,
            LinkedListId = dto.LinkedListId
        };
        _db.SubTasks.Add(sub);
        await _db.SaveChangesAsync();
        return ToSubDto(sub);
    }

    public async Task<SubTaskDto?> UpdateSubTaskAsync(Guid subTaskId, UpdateSubTaskDto dto)
    {
        var sub = await _db.SubTasks.FirstOrDefaultAsync(s => s.Id == subTaskId);
        if (sub is null) return null;

        if (dto.Title is not null)           sub.Title           = dto.Title;
        if (dto.IsCompleted.HasValue)          sub.IsCompleted     = dto.IsCompleted.Value;
        if (dto.ExecutionType.HasValue)        sub.ExecutionType   = dto.ExecutionType;
        if (dto.Priority.HasValue)             sub.Priority        = dto.Priority;
        if (dto.DurationMinutes.HasValue)      sub.DurationMinutes = dto.DurationMinutes;
        if (dto.LinkedListId.HasValue)         sub.LinkedListId    = dto.LinkedListId;

        await _db.SaveChangesAsync();

        // Auto-complete parent task when all subtasks are done
        if (dto.IsCompleted == true)
        {
            var allSiblings = await _db.SubTasks
                .Where(s => s.TaskItemId == sub.TaskItemId)
                .ToListAsync();

            if (allSiblings.Count > 0 && allSiblings.All(s => s.IsCompleted))
            {
                var parent = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == sub.TaskItemId);
                if (parent is not null && !parent.IsCompleted)
                {
                    parent.IsCompleted = true;
                    parent.UpdatedAt   = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }
        }

        return ToSubDto(sub);
    }

    public async Task<bool> DeleteSubTaskAsync(Guid subTaskId)
    {
        var sub = await _db.SubTasks.FirstOrDefaultAsync(s => s.Id == subTaskId);
        if (sub is null) return false;
        _db.SubTasks.Remove(sub);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static TaskItemDto ToDto(TaskItem t) => new(
        t.Id, t.UserId, t.Title, t.Notes, t.IsCompleted,
        t.Priority, t.ExecutionType, t.Difficulty,
        t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : null,
        t.PlannedTime, t.DurationMinutes,
        t.GoalId, t.ListId,
        t.SubTasks.Select(ToSubDto),
        t.CreatedAt, t.UpdatedAt
    );

    private static SubTaskDto ToSubDto(SubTask s) =>
        new(s.Id, s.TaskItemId, s.Title, s.IsCompleted,
            s.ExecutionType, s.Priority, s.DurationMinutes, s.LinkedListId);
}
