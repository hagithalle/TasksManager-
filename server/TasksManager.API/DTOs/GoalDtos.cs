using System.ComponentModel.DataAnnotations;
using TasksManager.API.Models;

namespace TasksManager.API.DTOs;

public record GoalDto(
    Guid Id,
    Guid UserId,
    string Title,
    string Category,
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
    [Required][MaxLength(200)] string Title,
    [Required][MaxLength(100)] string Category,
    GoalType GoalType,
    DateTime? DueDate,
    bool IsPinned = false
);

public record UpdateGoalDto(
    [MaxLength(200)] string? Title,
    [MaxLength(100)] string? Category,
    GoalType? GoalType,
    DateTime? DueDate,
    bool? IsPinned
);
