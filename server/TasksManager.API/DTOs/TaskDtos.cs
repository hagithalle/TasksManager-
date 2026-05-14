using TasksManager.API.Models;

namespace TasksManager.API.DTOs;

public record SubTaskDto(
    Guid Id,
    Guid TaskItemId,
    string Title,
    bool IsCompleted,
    Guid? LinkedListId
);

public record CreateSubTaskDto(
    string Title,
    Guid? LinkedListId
);

public record UpdateSubTaskDto(
    string? Title,
    bool? IsCompleted,
    Guid? LinkedListId
);

public record TaskItemDto(
    Guid Id,
    Guid UserId,
    string Title,
    bool IsCompleted,
    Priority Priority,
    ExecutionType ExecutionType,
    Difficulty? Difficulty,
    DateTime? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId,
    IEnumerable<SubTaskDto> SubTasks,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateTaskItemDto(
    Guid UserId,
    string Title,
    Priority Priority,
    ExecutionType ExecutionType,
    Difficulty? Difficulty,
    DateTime? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId
);

public record UpdateTaskItemDto(
    string? Title,
    bool? IsCompleted,
    Priority? Priority,
    ExecutionType? ExecutionType,
    Difficulty? Difficulty,
    DateTime? DueDate,
    string? PlannedTime,
    int? DurationMinutes,
    Guid? GoalId,
    Guid? ListId
);
