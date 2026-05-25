using System;

namespace TasksManager.API.DTOs
{
    public record HabitCompletionDto(
        int Id,
        Guid TaskId,
        Guid UserId,
        DateTime Date,
        bool Completed,
        DateTime? CompletedAt
    );
}
