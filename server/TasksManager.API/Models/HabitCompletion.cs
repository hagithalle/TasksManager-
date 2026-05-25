using System;

namespace TasksManager.API.Models
{
    public class HabitCompletion
    {
        public int Id { get; set; }
        public Guid TaskId { get; set; }
        public Guid UserId { get; set; }
        public DateTime Date { get; set; } // YYYY-MM-DD
        public bool Completed { get; set; }
        public DateTime? CompletedAt { get; set; }

        public TaskItem Task { get; set; } = null!;
    }
}
