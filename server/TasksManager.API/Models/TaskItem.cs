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
    /// <summary>Minutes before DueDate/PlannedTime to fire the reminder (e.g. 60 = 1 hour before).</summary>
    public int? ReminderOffsetMinutes { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public int RecurrenceInterval { get; set; } = 1;
    /// <summary>For recurring tasks: the date this task was last marked complete. Used instead of IsCompleted.</summary>
    public DateOnly? LastCompletedDate { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public TaskNature Nature { get; set; } = TaskNature.Action;
    public DailyRole DailyRole { get; set; } = DailyRole.Focus;
    public ItemStatus Status { get; set; } = ItemStatus.Open;

    // Navigation
    public User User { get; set; } = null!;
    public Goal? Goal { get; set; }
    public PersonalList? PersonalList { get; set; }
    public ICollection<SubTask> SubTasks { get; set; } = new List<SubTask>();
}
