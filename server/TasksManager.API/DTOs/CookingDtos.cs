using System.ComponentModel.DataAnnotations;

namespace TasksManager.API.DTOs;

// ── Cooking item ──────────────────────────────────────────────────────────────

public record CookingIngredientDto(
    string Title,
    decimal? Quantity,
    string? Unit
);

public record CookingItemDto(
    Guid Id,
    Guid PersonalListId,
    string Title,
    string? RecipeUrl,
    IEnumerable<CookingIngredientDto> Ingredients,
    string? Notes,
    DateOnly? PlannedDate,
    IEnumerable<string> Tags,
    bool IsCompleted,
    Guid? LinkedShoppingListId,
    Guid? LinkedTaskId,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateCookingItemDto(
    [Required][MaxLength(300)] string Title,
    string? RecipeUrl = null,
    IEnumerable<CookingIngredientDto>? Ingredients = null,
    string? Notes = null,
    DateOnly? PlannedDate = null,
    IEnumerable<string>? Tags = null,
    int SortOrder = 0,
    bool IsCompleted = false
);

public record UpdateCookingItemDto(
    string? Title = null,
    string? RecipeUrl = null,
    IEnumerable<CookingIngredientDto>? Ingredients = null,
    string? Notes = null,
    DateOnly? PlannedDate = null,
    IEnumerable<string>? Tags = null,
    Guid? LinkedShoppingListId = null,
    Guid? LinkedTaskId = null,
    int? SortOrder = null,
    bool? IsCompleted = null
);

// ── Ingredient extraction / shopping push ─────────────────────────────────────

/// <summary>A single ingredient with shopping context.</summary>
public record SuggestedShoppingItemDto(
    string Title,
    decimal? Quantity,
    string? Unit,
    string Department,          // matches ShoppingDepartment string value
    bool IsAlreadyOnList
);

public record ExtractIngredientsResultDto(
    IEnumerable<SuggestedShoppingItemDto> Items
);

public record PushToShoppingRequestDto(
    [Required] Guid ShoppingListId,
    [Required] IEnumerable<SuggestedShoppingItemDto> Items
);

// ── Cooking history suggestions (rule-based) ──────────────────────────────────

public record CookingSuggestionDto(
    string Title,
    int TimesCooked,
    IEnumerable<CookingIngredientDto> Ingredients,
    IEnumerable<string> Tags,
    DateTime LastCooked
);
