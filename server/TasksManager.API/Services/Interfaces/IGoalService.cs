using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IGoalService
{
    Task<IEnumerable<GoalDto>> GetAllByUserAsync(Guid userId);
    Task<GoalDto?> GetByIdAsync(Guid id);
    Task<GoalDto> CreateAsync(CreateGoalDto dto);
    Task<GoalDto?> UpdateAsync(Guid id, UpdateGoalDto dto, Guid callerId);
    Task<bool> DeleteAsync(Guid id, Guid callerId);
}
