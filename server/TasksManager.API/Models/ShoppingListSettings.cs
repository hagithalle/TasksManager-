namespace TasksManager.API.Models;

public class ShoppingListSettings
{
    public Guid Id { get; set; }
    public Guid PersonalListId { get; set; }

    /// <summary>Show the smart suggestions section.</summary>
    public bool EnableSmartSuggestions { get; set; } = true;

    /// <summary>How many days before an Occasional item is suggested again.</summary>
    public int OccasionalIntervalDays { get; set; } = 30;

    /// <summary>Group the active list by department.</summary>
    public bool GroupByDepartment { get; set; } = true;

    /// <summary>Show the "Bought today" section within the list detail page.</summary>
    public bool ShowBoughtSection { get; set; } = true;

    // Navigation
    public PersonalList PersonalList { get; set; } = null!;
}
