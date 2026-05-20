namespace TasksManager.API.Models;

public class ShoppingItem
{
    public Guid Id { get; set; }
    public Guid PersonalListId { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Numeric quantity (e.g. 2, 0.5).</summary>
    public decimal? Quantity { get; set; }

    /// <summary>Unit label (e.g. "kg", "pack", "bottle").</summary>
    public string? Unit { get; set; }

    public ShoppingDepartment Department { get; set; } = ShoppingDepartment.Other;

    public ShoppingItemType ItemType { get; set; } = ShoppingItemType.Regular;

    /// <summary>True when the item is on the current shopping trip list.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>True when checked off during the current shopping trip.</summary>
    public bool IsBought { get; set; }

    /// <summary>Timestamp when checked off in the current trip.</summary>
    public DateTime? BoughtAt { get; set; }

    /// <summary>Timestamp of the most recent completed purchase (any trip).</summary>
    public DateTime? LastBoughtAt { get; set; }

    public int SortOrder { get; set; }

    // ── Product details (for sending someone else shopping) ──────────────────

    /// <summary>URL of a product image to help identify the right item.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Preferred brand name.</summary>
    public string? PreferredBrand { get; set; }

    /// <summary>Comma-separated list of acceptable alternative brands.</summary>
    public string? AlternativeBrandsJson { get; set; }

    /// <summary>Free-text note for the buyer (e.g. "only the green pack").</summary>
    public string? NoteForBuyer { get; set; }

    // Navigation
    public PersonalList PersonalList { get; set; } = null!;
}
