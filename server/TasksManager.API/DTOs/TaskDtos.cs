using System.ComponentModel.DataAnnotations;
using TasksManager.API.Models;

namespace TasksManager.API.DTOs;

public record SubTaskDto(
    Guid Id,
    Guid TaskItemId,
    string Title,
    bool IsCompleted,
    ExecutionType? ExecutionType,
    Priority? Priority,
    int? DurationMinutes,
    Guid? LinkedListId
);

public record CreateSubTaskDto(
    [Required][MaxLength(200)] string Title,
    ExecutionType? ExecutionType,
    Priority? Priority,
    int? DurationMinutes,
    Guid? LinkedListId
);

public record UpdateSubTaskDto(
    string? Title,
    bool? IsCompleted,
    ExecutionType? ExecutionType,
    Priority? Priority,
    int? DurationMinutes,
    Guid? LinkedListId
);

public record TaskItemDto(
    Guid Id,
    Guid UserId,
    string Title,
    string? Notes,
    bool IsCompleted,
    DateTime? CompletedAt,
    Priority Priority,
    ExecutionType ExecutionType,
    Difficulty? Difficulty,
    string? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId,
    IEnumerable<SubTaskDto> SubTasks,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ReminderAt,
    string RecurrenceType,
    int RecurrenceInterval,
    string Nature,
    ItemStatus Status
);

public record CreateTaskItemDto(
    Guid UserId,
    [Required][MaxLength(200)] string Title,
    [MaxLength(4000)] string? Notes,
    Priority Priority,
    ExecutionType ExecutionType,
    Difficulty? Difficulty,
    DateTime? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId,
    DateTime? ReminderAt = null,
    string RecurrenceType = "none",
    int RecurrenceInterval = 1,
    string Nature = "action"
);

public record UpdateTaskItemDto(
    string? Title,
    string? Notes,
    bool? IsCompleted,
    Priority? Priority,
    ExecutionType? ExecutionType,
    Difficulty? Difficulty,
    DateTime? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId,
    DateTime? ReminderAt = null,
    string? RecurrenceType = null,
    int? RecurrenceInterval = null,
    string? Nature = null,
    ItemStatus? Status = null
);
