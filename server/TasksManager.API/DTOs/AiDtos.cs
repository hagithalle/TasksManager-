using System.ComponentModel.DataAnnotations;

namespace TasksManager.API.DTOs;

public record AiParseRequestDto([Required][MaxLength(2000)] string Text, string? Language = "he");

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

// ── Goals Analysis Agent ──────────────────────────────────────────────────────

public record AiGoalSummaryDto(
    string Id,
    string Title,
    string Category,
    string? DueDate,
    int TotalTasks,
    int CompletedTasks,
    DateTime CreatedAt
);

public record AiGoalAnalysisRequestDto(
    List<AiGoalSummaryDto> Goals,
    string? Language = "he"
);

public record AiGoalResultDto(
    string Id,
    string Status,          // "on-track"|"at-risk"|"completed"|"stalled"
    string Assessment,      // 1-2 sentence analysis
    string? Recommendation  // actionable suggestion
);

public record AiGoalAnalysisResponseDto(
    string OverallMessage,
    List<AiGoalResultDto> Goals,
    string? Strategy        // overall strategy suggestion
);

// ── Shopping List Intelligence Agent ─────────────────────────────────────────

public record AiListItemStatDto(
    string Title,
    int Occurrences,
    string? LastSeenDate
);

public record AiListIntelligenceRequestDto(
    int TotalLists,
    int OldestListDaysAgo,
    List<AiListItemStatDto> RecurringItems,  // items seen in 2+ lists
    List<string> RecentListTitles,
    string? Language = "he"
);

public record AiListCategoryDto(
    string Name,            // e.g. "ירקות ופירות", "ניקיון"
    string Emoji,
    List<string> Items
);

public record AiListIntelligenceResponseDto(
    string OverallMessage,
    List<AiListCategoryDto> SmartTemplate,  // suggested list template by category
    List<string> WeeklyStaples,             // buy every week
    List<string> MightNeedSoon,             // not seen recently but likely needed
    string? ShoppingPattern                 // e.g. "You shop weekly, usually ~15 items"
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

// ── Task Plan Analysis ────────────────────────────────────────────────────────

public record AiPlanRequestDto([Required][MaxLength(2000)] string Text, string? Language = "he");

public record AiPlanSubTaskDto(string Title, int? EstimatedMinutes);

public record AiPlanTaskDto(
    string Title,
    string? RelatedGoal,
    string? DueDate,
    string Priority,
    string ExecutionType,
    int? EstimatedMinutes,
    string? Frequency,
    List<AiPlanSubTaskDto> SubTasks
);

public record AiPlanGoalDto(
    string Title,
    string Category,
    string? DueDate,
    string Priority,
    int? EstimatedTotalHours,
    string? Rationale
);

public record AiPlanResponseDto(
    string Summary,
    List<AiPlanGoalDto> Goals,
    List<AiPlanTaskDto> Tasks
);
