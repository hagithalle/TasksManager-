namespace TasksManager.API.DTOs;

public record AiParseRequestDto(string Text, string? Language = "he");

public record AiParsedTaskDto(
    string Title,
    string? DueDate,       // "YYYY-MM-DD" or null
    string? Priority,      // "low"/"medium"/"high" or null
    string? ExecutionType  // "quick"/"short"/"medium"/"long" or null
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
