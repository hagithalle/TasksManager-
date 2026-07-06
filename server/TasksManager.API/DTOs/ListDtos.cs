namespace TasksManager.API.DTOs;

// ── Generic list items ────────────────────────────────────────────────────────

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

// ── Shopping items ────────────────────────────────────────────────────────────

public record ShoppingItemDto(
    Guid Id,
    Guid PersonalListId,
    string Title,
    decimal? Quantity,
    string? Unit,
    string Department,
    string ItemType,
    bool IsActive,
    bool IsBought,
    DateTime? BoughtAt,
    DateTime? LastBoughtAt,
    int SortOrder,
    string? ImageUrl,
    string? PreferredBrand,
    IEnumerable<string> AlternativeBrands,
    string? NoteForBuyer
);

public record CreateShoppingItemDto(
    string Title,
    decimal? Quantity = null,
    string? Unit = null,
    string Department = "other",
    string ItemType = "regular",
    int SortOrder = 0,
    string? ImageUrl = null,
    string? PreferredBrand = null,
    IEnumerable<string>? AlternativeBrands = null,
    string? NoteForBuyer = null
);

public record UpdateShoppingItemDto(
    string? Title = null,
    decimal? Quantity = null,
    string? Unit = null,
    string? Department = null,
    string? ItemType = null,
    bool? IsActive = null,
    bool? IsBought = null,
    int? SortOrder = null,
    string? ImageUrl = null,
    string? PreferredBrand = null,
    IEnumerable<string>? AlternativeBrands = null,
    string? NoteForBuyer = null
);

// ── Shopping list settings ────────────────────────────────────────────────────

public record ShoppingListSettingsDto(
    bool EnableSmartSuggestions,
    int OccasionalIntervalDays,
    bool GroupByDepartment,
    bool ShowBoughtSection
);

public record UpdateShoppingListSettingsDto(
    bool? EnableSmartSuggestions = null,
    int? OccasionalIntervalDays = null,
    bool? GroupByDepartment = null,
    bool? ShowBoughtSection = null
);

// ── Personal lists ────────────────────────────────────────────────────────────

public record PersonalListDto(
    Guid Id,
    Guid UserId,
    string Title,
    string? Emoji,
    string ListType,
    string CookingMode,
    IEnumerable<PersonalListItemDto> Items,
    IEnumerable<ShoppingItemDto> ShoppingItems,
    ShoppingListSettingsDto? ShoppingSettings,
    IEnumerable<CookingItemDto> CookingItems,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePersonalListDto(
    Guid UserId,
    string Title,
    string? Emoji,
    string ListType = "checklist",
    string CookingMode = "regular"
);

public record UpdatePersonalListDto(
    string? Title,
    string? Emoji,
    string? ListType = null
);

