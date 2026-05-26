using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Utils;

namespace TasksManager.API.Controllers;

[ApiController]
[Route("api/habits")]
[Authorize]
public class HabitsController : ControllerBase
{
    private readonly AppDbContext _db;
    public HabitsController(AppDbContext db) => _db = db;

    // GET: api/habits/today
    [HttpGet("today")]
    public async Task<ActionResult<IEnumerable<HabitCompletionDto>>> GetTodayHabits()
    {
        var userId = User.GetUserId();
        var today = DateTime.UtcNow.Date;
        // מצא את כל המשימות היומיות של המשתמש
        var habitTasks = await _db.Tasks
            .Where(t => t.UserId == userId && t.RecurrenceType == RecurrenceType.Daily)
            .ToListAsync();
        // עבור כל משימה יומית, ודא שיש מופע להיום
        foreach (var habit in habitTasks)
        {
            if (!await _db.HabitCompletions.AnyAsync(h => h.TaskId == habit.Id && h.Date == today))
            {
                _db.HabitCompletions.Add(new HabitCompletion
                {
                    TaskId = habit.Id,
                    UserId = userId,
                    Date = today,
                    Completed = false
                });
            }
        }
        await _db.SaveChangesAsync();
        // החזר את כל המופעים של היום
        var todayHabits = await _db.HabitCompletions
            .Include(h => h.Task)
            .Where(h => h.UserId == userId && h.Date == today)
            .ToListAsync();
        return todayHabits.Select(h => new HabitCompletionDto(
            h.Id, h.TaskId, h.UserId, h.Date, h.Completed, h.CompletedAt
        )).ToList();
    }

    // POST: api/habits/{id}/complete
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteHabit(int id)
    {
        var userId = User.GetUserId();
        var habit = await _db.HabitCompletions.Include(h => h.Task)
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId);
        if (habit == null) return NotFound();
        habit.Completed = true;
        habit.CompletedAt = DateTime.UtcNow;
        // Mark the original task as completed too
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == habit.TaskId && t.UserId == userId);
        if (task != null && !task.IsCompleted)
        {
            task.IsCompleted = true;
            task.CompletedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
