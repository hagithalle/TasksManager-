namespace TasksManager.API.Models;

public enum ShareResourceType { List, Task, Goal }

public class ShareInvite
{
    public Guid   Id             { get; set; }
    public string Token          { get; set; } = string.Empty;   // unique random token
    public ShareResourceType ResourceType { get; set; }
    public Guid   ResourceId     { get; set; }
    public Guid   OwnerId        { get; set; }
    public Guid?  AcceptedByUserId { get; set; }

    public DateTime  CreatedAt   { get; set; }
    public DateTime? AcceptedAt  { get; set; }

    // Navigation
    public User  Owner            { get; set; } = null!;
    public User? AcceptedByUser   { get; set; }
}
