namespace TasksManager.API.Models;

public class PersonalListItem
{
    public Guid Id { get; set; }
    public Guid PersonalListId { get; set; }

    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }

    // Navigation
    public PersonalList PersonalList { get; set; } = null!;
}
