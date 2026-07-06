namespace TasksManager.API.Models;

public class CookingItem
{
    public Guid Id { get; set; }
    public Guid PersonalListId { get; set; }

    /// <summary>Dish or recipe name.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional URL to recipe (website, YouTube, etc.).</summary>
    public string? RecipeUrl { get; set; }

    /// <summary>JSON array of {title, quantity?, unit?} objects.</summary>
    public string? IngredientsJson { get; set; }

    /// <summary>Free-text cooking notes.</summary>
    public string? Notes { get; set; }

    /// <summary>Date this dish is planned to be cooked.</summary>
    public DateOnly? PlannedDate { get; set; }

    /// <summary>JSON array of tag strings e.g. ["shabbat", "dairy", "quick"].</summary>
    public string? TagsJson { get; set; }

    /// <summary>Whether this cooking item was marked as completed (cooked).</summary>
    public bool IsCompleted { get; set; }

    /// <summary>Which meal slot this dish belongs to (Shabbat or weekday category).</summary>
    public MealSlot MealSlot { get; set; } = MealSlot.None;

    /// <summary>Shopping list that ingredients were last pushed to.</summary>
    public Guid? LinkedShoppingListId { get; set; }

    /// <summary>Linked task created from this cooking item (if any).</summary>
    public Guid? LinkedTaskId { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public PersonalList PersonalList { get; set; } = null!;
}
