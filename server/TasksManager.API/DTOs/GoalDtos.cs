using System.ComponentModel.DataAnnotations;
using TasksManager.API.Models;

namespace TasksManager.API.DTOs;

public record GoalDto(
    Guid Id,
    Guid UserId,
    string Title,
    string? Description,
    string Category,
    GoalType GoalType,
    DateTime? DueDate,
    bool IsPinned,
    bool IsCompleted,
    DateTime? CompletedAt,
    int TotalTasks,
    int CompletedTasks,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsArchived,
    DateTime? ArchivedAt
);

public record CreateGoalDto(
    Guid UserId,
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description,
    [Required][MaxLength(100)] string Category,
    GoalType GoalType,
    DateTime? DueDate,
    bool IsPinned = false
);

public record UpdateGoalDto(
    [MaxLength(200)] string? Title,
    [MaxLength(2000)] string? Description,
    [MaxLength(100)] string? Category,
    GoalType? GoalType,
    DateTime? DueDate,
    bool? IsPinned,
    bool? IsCompleted,
    bool? IsArchived
);
