namespace TasksManager.API.DTOs;

public record PersonalListItemDto(
    Guid Id,
    Guid PersonalListId,
    string Title,
    bool IsCompleted,
    int SortOrder
);

public record CreatePersonalListItemDto(
    string Title,
    int SortOrder = 0
);

public record UpdatePersonalListItemDto(
    string? Title,
    bool? IsCompleted,
    int? SortOrder
);

public record PersonalListDto(
    Guid Id,
    Guid UserId,
    string Title,
    string? Emoji,
    IEnumerable<PersonalListItemDto> Items,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePersonalListDto(
    Guid UserId,
    string Title,
    string? Emoji
);

public record UpdatePersonalListDto(
    string? Title,
    string? Emoji
);
