using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IPersonalListService
{
    Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId);
    Task<PersonalListDto?> GetByIdAsync(Guid id);
    Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto);
    Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto);
    Task<bool> DeleteAsync(Guid id);

    // Generic list item operations
    Task<PersonalListItemDto> AddItemAsync(Guid listId, CreatePersonalListItemDto dto);
    Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto);
    Task<bool> DeleteItemAsync(Guid itemId);

    // Shopping item operations
    Task<ShoppingItemDto> AddShoppingItemAsync(Guid listId, CreateShoppingItemDto dto);
    Task<ShoppingItemDto?> UpdateShoppingItemAsync(Guid itemId, UpdateShoppingItemDto dto);
    Task<bool> DeleteShoppingItemAsync(Guid itemId);

    // Shopping list settings
    Task<ShoppingListSettingsDto?> GetShoppingSettingsAsync(Guid listId);
    Task<ShoppingListSettingsDto> UpsertShoppingSettingsAsync(Guid listId, UpdateShoppingListSettingsDto dto);

    // Clear trip: mark all bought items as inactive and update lastBoughtAt
    Task<PersonalListDto?> ClearTripAsync(Guid listId);
}

