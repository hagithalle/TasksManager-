using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleCalendarService> _logger;

    // Tag we add to calendar events so we can identify ours
    private const string AppTag = "TasksManager";

    public GoogleCalendarService(AppDbContext db, IConfiguration config, ILogger<GoogleCalendarService> logger)
    {
        _db     = db;
        _config = config;
        _logger = logger;
    }

    public async Task<GoogleCalendarSyncResult> PushToCalendarAsync(Guid userId, string accessToken)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return new GoogleCalendarSyncResult(0, 0, 0, "User not found.");

        CalendarService calService;
        try
        {
            calService = BuildCalendarServiceFromAccessToken(accessToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build calendar service for user {UserId}", userId);
            return new GoogleCalendarSyncResult(0, 0, 0, "AUTH_ERROR");
        }

        var tasks = await _db.Tasks
            .Where(t => t.UserId == userId && t.DueDate != null && !t.IsCompleted)
            .Include(t => t.SubTasks)
            .ToListAsync();

        var goals = await _db.Goals
            .Where(g => g.UserId == userId && g.DueDate != null)
            .Include(g => g.Tasks)
            .ToListAsync();

        int created = 0, updated = 0, skipped = 0;

        // ── Push tasks ────────────────────────────────────────────────────────
        foreach (var task in tasks)
        {
            try
            {
                var eventId = await UpsertEventAsync(calService, new EventSpec(
                    Title:       $"✅ {task.Title}",
                    Description: BuildTaskDescription(task),
                    Date:        task.DueDate!.Value,
                    Time:        task.PlannedTime,
                    Duration:    task.DurationMinutes ?? 30,
                    ExternalId:  $"task-{task.Id}",
                    ColorId:     PriorityColorId(task.Priority.ToString())
                ));
                if (eventId is not null) created++;
                else updated++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync task {TaskId}", task.Id);
                skipped++;
            }
        }

        // ── Push goals ────────────────────────────────────────────────────────
        foreach (var goal in goals)
        {
            try
            {
                var eventId = await UpsertEventAsync(calService, new EventSpec(
                    Title:       $"🎯 {goal.Title}",
                    Description: $"מטרה: {goal.Title}\nהתקדמות: {goal.Tasks.Count(t => t.IsCompleted)}/{goal.Tasks.Count}",
                    Date:        goal.DueDate!.Value,
                    Time:        null,
                    Duration:    60,
                    ExternalId:  $"goal-{goal.Id}",
                    ColorId:     "5" // banana yellow
                ));
                if (eventId is not null) created++;
                else updated++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync goal {GoalId}", goal.Id);
                skipped++;
            }
        }

        return new GoogleCalendarSyncResult(created, updated, skipped);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CalendarService BuildCalendarServiceFromAccessToken(string accessToken)
    {
        var credential = GoogleCredential.FromAccessToken(accessToken);
        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName       = AppTag,
        });
    }

    /// <summary>
    /// Creates or updates a calendar event identified by our custom ExternalId tag.
    /// Returns the event ID if created (null if updated).
    /// </summary>
    private async Task<string?> UpsertEventAsync(CalendarService svc, EventSpec spec)
    {
        // Search for existing event with our tag
        var listReq = svc.Events.List("primary");
        listReq.PrivateExtendedProperty = $"tmId={spec.ExternalId}";
        listReq.MaxResults = 1;
        listReq.ShowDeleted = false;

        var existing = await listReq.ExecuteAsync();
        var gcEvent  = BuildGcEvent(spec);

        if (existing.Items?.Count > 0)
        {
            var existingEvent = existing.Items[0];
            await svc.Events.Update(gcEvent, "primary", existingEvent.Id).ExecuteAsync();
            return null; // updated
        }
        else
        {
            var created = await svc.Events.Insert(gcEvent, "primary").ExecuteAsync();
            return created.Id; // created
        }
    }

    private static Event BuildGcEvent(EventSpec spec)
    {
        var date = spec.Date.Date;
        EventDateTime start, end;

        if (spec.Time is not null && TimeSpan.TryParse(spec.Time, out var t))
        {
            var startDt = date.Add(t);
            var endDt   = startDt.AddMinutes(spec.Duration);
            start = new EventDateTime { DateTimeDateTimeOffset = startDt, TimeZone = "Asia/Jerusalem" };
            end   = new EventDateTime { DateTimeDateTimeOffset = endDt,   TimeZone = "Asia/Jerusalem" };
        }
        else
        {
            // All-day event
            start = new EventDateTime { Date = date.ToString("yyyy-MM-dd") };
            end   = new EventDateTime { Date = date.AddDays(1).ToString("yyyy-MM-dd") };
        }

        return new Event
        {
            Summary     = spec.Title,
            Description = spec.Description,
            Start       = start,
            End         = end,
            ColorId     = spec.ColorId,
            ExtendedProperties = new Event.ExtendedPropertiesData
            {
                Private__ = new Dictionary<string, string>
                {
                    ["tmId"]     = spec.ExternalId,
                    ["tmSource"] = AppTag,
                },
            },
        };
    }

    private static string BuildTaskDescription(Models.TaskItem task)
    {
        var parts = new List<string> { $"משימה: {task.Title}" };
        if (!string.IsNullOrEmpty(task.Priority.ToString()))
            parts.Add($"עדיפות: {task.Priority}");
        if (task.DurationMinutes.HasValue)
            parts.Add($"משך: {task.DurationMinutes} דקות");
        if ((task.SubTasks?.Count ?? 0) > 0)
            parts.Add($"תתי-משימות: {task.SubTasks!.Count(s => s.IsCompleted)}/{task.SubTasks!.Count}");
        return string.Join("\n", parts);
    }

    private static string PriorityColorId(string priority) => priority switch
    {
        "Critical" => "11", // tomato red
        "High"     => "6",  // tangerine
        "Medium"   => "9",  // blueberry
        _          => "8",  // graphite
    };

    private record EventSpec(
        string Title,
        string Description,
        DateTime Date,
        string? Time,
        int Duration,
        string ExternalId,
        string ColorId
    );
}
