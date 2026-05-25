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
        // ── Auto carry-over: mark overdue open tasks as CarriedOver or Missed ──
        var today = DateTime.UtcNow.Date;
        var overdue = await _db.Tasks
            .Where(t => t.UserId == userId
                     && t.DeletedAt == null
                     && t.Status == ItemStatus.Open
                     && !t.IsCompleted
                     && t.DueDate.HasValue
                     && t.DueDate.Value.Date < today)
            .ToListAsync();

        if (overdue.Any())
        {
            foreach (var task in overdue)
            {
                // Time-sensitive (has a specific planned time) → Missed
                // Otherwise (just a date, no clock time) → CarriedOver
                task.Status    = task.PlannedTime != null ? ItemStatus.Missed : ItemStatus.CarriedOver;
                task.UpdatedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
        }

        var ownTasks = await _db.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.DeletedAt == null)
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
            .Where(t => t.GoalId == goalId && t.DeletedAt == null)
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
        var recurrence = Enum.TryParse<RecurrenceType>(dto.RecurrenceType, true, out var rt)
            ? rt : RecurrenceType.None;
        var nature = Enum.TryParse<TaskNature>(dto.Nature, true, out var tn)
            ? tn : TaskNature.Action;

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
            ReminderAt = dto.ReminderAt,
            RecurrenceType = recurrence,
            RecurrenceInterval = dto.RecurrenceInterval,
            Nature = nature,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Status = ItemStatus.Open,
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return ToDto(task);
    }

    public async Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskItemDto dto, Guid callerId)
    {
        var task = await _db.Tasks.Include(t => t.SubTasks).FirstOrDefaultAsync(t => t.Id == id);
        if (task is null || task.UserId != callerId) return null;

        if (dto.Title is not null)         task.Title         = dto.Title;
        if (dto.Notes is not null)          task.Notes         = dto.Notes;
        if (dto.IsCompleted.HasValue)
        {
            task.IsCompleted = dto.IsCompleted.Value;
            if (dto.IsCompleted.Value && task.CompletedAt is null)
                task.CompletedAt = DateTime.UtcNow;
            else if (!dto.IsCompleted.Value)
                task.CompletedAt = null;
            // Sync status with completion toggle (unless Status is also being set explicitly)
            if (!dto.Status.HasValue)
                task.Status = dto.IsCompleted.Value ? ItemStatus.Completed : ItemStatus.Open;
        }
        if (dto.Priority.HasValue)         task.Priority      = dto.Priority.Value;
        if (dto.ExecutionType.HasValue)    task.ExecutionType = dto.ExecutionType.Value;
        if (dto.Difficulty.HasValue)       task.Difficulty    = dto.Difficulty;
        if (dto.DueDate.HasValue)          task.DueDate       = dto.DueDate;
        if (dto.PlannedTime is not null)   task.PlannedTime   = dto.PlannedTime;
        if (dto.DurationMinutes.HasValue)  task.DurationMinutes = dto.DurationMinutes;
        if (dto.GoalId.HasValue)           task.GoalId        = dto.GoalId;
        if (dto.ListId.HasValue)           task.ListId        = dto.ListId;
        if (dto.ReminderAt.HasValue)       task.ReminderAt    = dto.ReminderAt;
        if (dto.RecurrenceType is not null &&
            Enum.TryParse<RecurrenceType>(dto.RecurrenceType, true, out var rt))
            task.RecurrenceType = rt;
        if (dto.RecurrenceInterval.HasValue) task.RecurrenceInterval = dto.RecurrenceInterval.Value;
        if (dto.Nature is not null &&
            Enum.TryParse<TaskNature>(dto.Nature, true, out var tn))
            task.Nature = tn;
        if (dto.Status.HasValue)
        {
            task.Status = dto.Status.Value;
            // Sync IsCompleted with explicit Status transitions
            if (dto.Status.Value == ItemStatus.Completed && !task.IsCompleted)
            {
                task.IsCompleted = true;
                if (task.CompletedAt is null) task.CompletedAt = DateTime.UtcNow;
            }
            else if (dto.Status.Value == ItemStatus.Open && task.IsCompleted)
            {
                task.IsCompleted = false;
                task.CompletedAt = null;
            }
        }
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Auto-create next occurrence when a recurring task is completed
        if (dto.IsCompleted == true && task.RecurrenceType != RecurrenceType.None && task.DueDate.HasValue)
        {
            var interval = task.RecurrenceInterval < 1 ? 1 : task.RecurrenceInterval;
            var nextDue = task.RecurrenceType switch
            {
                RecurrenceType.Daily   => task.DueDate.Value.AddDays(interval),
                RecurrenceType.Weekly  => task.DueDate.Value.AddDays(7 * interval),
                RecurrenceType.Monthly => task.DueDate.Value.AddMonths(interval),
                _                      => (DateTime?)null
            };

            if (nextDue.HasValue)
            {
                var next = new TaskItem
                {
                    Id = Guid.NewGuid(),
                    UserId = task.UserId,
                    Title = task.Title,
                    Notes = task.Notes,
                    Priority = task.Priority,
                    ExecutionType = task.ExecutionType,
                    Difficulty = task.Difficulty,
                    DueDate = nextDue,
                    PlannedTime = task.PlannedTime,
                    DurationMinutes = task.DurationMinutes,
                    GoalId = task.GoalId,
                    ListId = task.ListId,
                    RecurrenceType = task.RecurrenceType,
                    RecurrenceInterval = task.RecurrenceInterval,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Tasks.Add(next);
                await _db.SaveChangesAsync();
            }
        }

        return ToDto(task);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid callerId)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);
        if (task is null || task.UserId != callerId) return false;
        task.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ── SubTask ───────────────────────────────────────────────────────────────

    private async Task<bool> HasTaskAccessAsync(Guid taskId, Guid callerId)
    {
        if (await _db.Tasks.AnyAsync(t => t.Id == taskId && t.UserId == callerId)) return true;
        return await _db.ShareInvites.AnyAsync(s =>
            s.ResourceId == taskId &&
            s.ResourceType == Models.ShareResourceType.Task &&
            s.AcceptedByUserId == callerId);
    }

    public async Task<SubTaskDto?> AddSubTaskAsync(Guid taskId, CreateSubTaskDto dto, Guid callerId)
    {
        if (!await HasTaskAccessAsync(taskId, callerId)) return null;
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

    public async Task<SubTaskDto?> UpdateSubTaskAsync(Guid subTaskId, UpdateSubTaskDto dto, Guid callerId)
    {
        var sub = await _db.SubTasks.FirstOrDefaultAsync(s => s.Id == subTaskId);
        if (sub is null || !await HasTaskAccessAsync(sub.TaskItemId, callerId)) return null;

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

    public async Task<bool> DeleteSubTaskAsync(Guid subTaskId, Guid callerId)
    {
        var sub = await _db.SubTasks.FirstOrDefaultAsync(s => s.Id == subTaskId);
        if (sub is null || !await HasTaskAccessAsync(sub.TaskItemId, callerId)) return false;
        _db.SubTasks.Remove(sub);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static TaskItemDto ToDto(TaskItem t) => new(
        t.Id, t.UserId, t.Title, t.Notes, t.IsCompleted, t.CompletedAt,
        t.Priority, t.ExecutionType, t.Difficulty,
        t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : null,
        t.PlannedTime, t.DurationMinutes,
        t.GoalId, t.ListId,
        t.SubTasks.Select(ToSubDto),
        t.CreatedAt, t.UpdatedAt,
        t.ReminderAt,
        t.RecurrenceType.ToString().ToLower(),
        t.RecurrenceInterval,
        t.Nature.ToString().ToLower(),
        t.Status
    );

    private static SubTaskDto ToSubDto(SubTask s) =>
        new(s.Id, s.TaskItemId, s.Title, s.IsCompleted,
            s.ExecutionType, s.Priority, s.DurationMinutes, s.LinkedListId);
}
