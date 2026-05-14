namespace TasksManager.API.Models;

public class SubTask
{
    public Guid Id { get; set; }
    public Guid TaskItemId { get; set; }

    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }

    public Guid? LinkedListId { get; set; }

    // Navigation
    public TaskItem TaskItem { get; set; } = null!;
}
