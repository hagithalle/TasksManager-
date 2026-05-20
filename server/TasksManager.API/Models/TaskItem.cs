namespace TasksManager.API.Models;

public class TaskItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }

    public Priority Priority { get; set; }
    public ExecutionType ExecutionType { get; set; }
    public Difficulty? Difficulty { get; set; }

    public DateTime? DueDate { get; set; }
    public string? PlannedTime { get; set; }
    public int? DurationMinutes { get; set; }

    public Guid? GoalId { get; set; }
    public Guid? ListId { get; set; }

    public DateTime? ReminderAt { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public int RecurrenceInterval { get; set; } = 1;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public TaskNature Nature { get; set; } = TaskNature.Action;

    // Navigation
    public User User { get; set; } = null!;
    public Goal? Goal { get; set; }
    public PersonalList? PersonalList { get; set; }
    public ICollection<SubTask> SubTasks { get; set; } = new List<SubTask>();
}
