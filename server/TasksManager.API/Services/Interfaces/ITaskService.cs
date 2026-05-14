using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface ITaskService
{
    Task<IEnumerable<TaskItemDto>> GetAllByUserAsync(Guid userId);
    Task<IEnumerable<TaskItemDto>> GetByGoalAsync(Guid goalId);
    Task<TaskItemDto?> GetByIdAsync(Guid id);
    Task<TaskItemDto> CreateAsync(CreateTaskItemDto dto);
    Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskItemDto dto);
    Task<bool> DeleteAsync(Guid id);

    // SubTask operations
    Task<SubTaskDto> AddSubTaskAsync(Guid taskId, CreateSubTaskDto dto);
    Task<SubTaskDto?> UpdateSubTaskAsync(Guid subTaskId, UpdateSubTaskDto dto);
    Task<bool> DeleteSubTaskAsync(Guid subTaskId);
}
