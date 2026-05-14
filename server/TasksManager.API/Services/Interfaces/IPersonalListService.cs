using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IPersonalListService
{
    Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId);
    Task<PersonalListDto?> GetByIdAsync(Guid id);
    Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto);
    Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto);
    Task<bool> DeleteAsync(Guid id);

    // Item operations
    Task<PersonalListItemDto> AddItemAsync(Guid listId, CreatePersonalListItemDto dto);
    Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto);
    Task<bool> DeleteItemAsync(Guid itemId);
}
