namespace TasksManager.API.Services.Interfaces;

public interface IGoogleCalendarService
{
    Task<GoogleCalendarSyncResult> PushToCalendarAsync(Guid userId, string accessToken);
}

public record GoogleCalendarSyncResult(int Created, int Updated, int Skipped, string? Error = null);
