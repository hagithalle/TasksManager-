namespace TasksManager.API.Models;

public class PersonalList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Emoji { get; set; }

    public ListType ListType { get; set; } = ListType.Checklist;

    /// <summary>For CookingPlan lists: whether this is a Shabbat or regular weekday plan.</summary>
    public CookingMode CookingMode { get; set; } = CookingMode.Regular;

    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<PersonalListItem> Items { get; set; } = new List<PersonalListItem>();
    public ICollection<ShoppingItem> ShoppingItems { get; set; } = new List<ShoppingItem>();
    public ShoppingListSettings? ShoppingSettings { get; set; }
    public ICollection<CookingItem> CookingItems { get; set; } = new List<CookingItem>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
