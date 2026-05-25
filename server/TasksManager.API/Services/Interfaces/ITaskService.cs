using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface ITaskService
{
    Task<IEnumerable<TaskItemDto>> GetAllByUserAsync(Guid userId);
    Task<IEnumerable<TaskItemDto>> GetByGoalAsync(Guid goalId);
    Task<TaskItemDto?> GetByIdAsync(Guid id);
    Task<TaskItemDto> CreateAsync(CreateTaskItemDto dto);
    Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskItemDto dto, Guid callerId);
    Task<bool> DeleteAsync(Guid id, Guid callerId);

    // SubTask operations
    Task<SubTaskDto?> AddSubTaskAsync(Guid taskId, CreateSubTaskDto dto, Guid callerId);
    Task<SubTaskDto?> UpdateSubTaskAsync(Guid subTaskId, UpdateSubTaskDto dto, Guid callerId);
    Task<bool> DeleteSubTaskAsync(Guid subTaskId, Guid callerId);
}
