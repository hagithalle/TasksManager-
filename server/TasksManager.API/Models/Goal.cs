namespace TasksManager.API.Models;

public class Goal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public GoalCategory Category { get; set; }
    public GoalType GoalType { get; set; }

    public DateTime? DueDate { get; set; }
    public bool IsPinned { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
