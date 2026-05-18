namespace TasksManager.API.Services.Interfaces;

public interface IGoogleCalendarService
{
    /// <summary>Push tasks/goals for a user to their Google Calendar.</summary>
    Task<GoogleCalendarSyncResult> PushToCalendarAsync(Guid userId);
}

public record GoogleCalendarSyncResult(int Created, int Updated, int Skipped, string? Error = null);
