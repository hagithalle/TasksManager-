using TasksManager.API.Models;

namespace TasksManager.API.DTOs;

public record GoalDto(
    Guid Id,
    Guid UserId,
    string Title,
    GoalCategory Category,
    GoalType GoalType,
    DateTime? DueDate,
    bool IsPinned,
    int TotalTasks,
    int CompletedTasks,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateGoalDto(
    Guid UserId,
    string Title,
    GoalCategory Category,
    GoalType GoalType,
    DateTime? DueDate,
    bool IsPinned = false
);

public record UpdateGoalDto(
    string? Title,
    GoalCategory? Category,
    GoalType? GoalType,
    DateTime? DueDate,
    bool? IsPinned
);
