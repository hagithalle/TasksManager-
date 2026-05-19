namespace TasksManager.API.DTOs;

public record AiParseRequestDto(string Text, string? Language = "he");

// ── Day Analysis ──────────────────────────────────────────────────────────────

public record AiTaskSummaryDto(
    string Id,
    string Title,
    string Priority,
    string ExecutionType,
    int? DurationMinutes,
    string? PlannedTime,
    string? DueDate
);

public record AiDayAnalysisRequestDto(
    List<AiTaskSummaryDto> Tasks,
    string? Language = "he"
);

public record AiMoveTaskDto(string Id, string Reason);

public record AiDayAnalysisDto(
    string LoadLevel,       // "light"|"moderate"|"heavy"|"overloaded"
    string Message,
    string Encouragement,
    List<AiMoveTaskDto> TasksToMove
);

// ── Natural Language Search ───────────────────────────────────────────────────

public record AiSearchRequestDto(
    string Query,
    List<AiTaskSummaryDto> Tasks,
    string? Language = "he"
);

public record AiSearchResponseDto(
    List<string> TaskIds,
    string Explanation
);

// ── Behavior Insights ────────────────────────────────────────────────────────

public record AiWeekDayStatsDto(string Date, int Total, int Completed);

public record AiInsightsRequestDto(
    int TotalTasks,
    int CompletedTasks,
    int OverdueTasks,
    int FrogTasksCompleted,
    int FrogTasksTotal,
    List<AiWeekDayStatsDto> Last7Days,
    string? Language = "he"
);

public record AiPatternDto(
    string Type,        // "procrastination"|"overload"|"strength"|"tip"
    string Message,
    string? Suggestion,
    string Emoji
);

public record AiInsightsResponseDto(
    string OverallMessage,
    List<AiPatternDto> Patterns
);

public record AiParsedTaskDto(
    string Title,
    string? DueDate,       // "YYYY-MM-DD" or null
    string? Priority,      // "low"/"medium"/"high" or null
    string? ExecutionType, // "quick"/"short"/"medium"/"long" or null
    List<string>? SubTasks // breakdown steps for complex tasks
);

public record AiParsedGoalDto(
    string Title,
    string? Category,  // "health"/"work"/"personal" etc.
    string? DueDate
);

public record AiParsedListItemDto(
    string Title,
    string? Quantity,  // "2", "1 kg", etc. or null
    string? ListName   // suggested list name in original language
);

public record AiParseResponseDto(
    List<AiParsedTaskDto> Tasks,
    List<AiParsedGoalDto> Goals,
    List<AiParsedListItemDto> ListItems
);
