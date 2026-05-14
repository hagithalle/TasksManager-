namespace TasksManager.API.Models;

public class PersonalList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Emoji { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<PersonalListItem> Items { get; set; } = new List<PersonalListItem>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
