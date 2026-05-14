using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class GoalService : IGoalService
{
    private readonly AppDbContext _db;

    public GoalService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<GoalDto>> GetAllByUserAsync(Guid userId)
    {
        var goals = await _db.Goals
            .AsNoTracking()
            .Where(g => g.UserId == userId)
            .Include(g => g.Tasks)
            .ToListAsync();
        return goals.Select(ToDto);
    }

    public async Task<GoalDto?> GetByIdAsync(Guid id)
    {
        var goal = await _db.Goals
            .AsNoTracking()
            .Include(g => g.Tasks)
            .FirstOrDefaultAsync(g => g.Id == id);
        return goal is null ? null : ToDto(goal);
    }

    public async Task<GoalDto> CreateAsync(CreateGoalDto dto)
    {
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Title = dto.Title,
            Category = dto.Category,
            GoalType = dto.GoalType,
            DueDate = dto.DueDate,
            IsPinned = dto.IsPinned,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Goals.Add(goal);
        await _db.SaveChangesAsync();
        return ToDto(goal);
    }

    public async Task<GoalDto?> UpdateAsync(Guid id, UpdateGoalDto dto)
    {
        var goal = await _db.Goals.Include(g => g.Tasks).FirstOrDefaultAsync(g => g.Id == id);
        if (goal is null) return null;

        if (dto.Title is not null)    goal.Title    = dto.Title;
        if (dto.Category is not null) goal.Category = dto.Category.Value;
        if (dto.GoalType is not null) goal.GoalType = dto.GoalType.Value;
        if (dto.DueDate.HasValue)     goal.DueDate  = dto.DueDate;
        if (dto.IsPinned.HasValue)    goal.IsPinned = dto.IsPinned.Value;
        goal.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(goal);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var goal = await _db.Goals.FirstOrDefaultAsync(g => g.Id == id);
        if (goal is null) return false;
        _db.Goals.Remove(goal);
        await _db.SaveChangesAsync();
        return true;
    }

    private static GoalDto ToDto(Goal g) => new(
        g.Id, g.UserId, g.Title, g.Category, g.GoalType,
        g.DueDate, g.IsPinned,
        g.Tasks.Count,
        g.Tasks.Count(t => t.IsCompleted),
        g.CreatedAt, g.UpdatedAt
    );
}
