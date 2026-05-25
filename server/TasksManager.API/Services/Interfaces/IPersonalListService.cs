using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IPersonalListService
{
    Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId);
    Task<PersonalListDto?> GetByIdAsync(Guid id);
    Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto);
    Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto, Guid callerId);
    Task<bool> DeleteAsync(Guid id, Guid callerId);

    // Generic list item operations
    Task<PersonalListItemDto?> AddItemAsync(Guid listId, CreatePersonalListItemDto dto, Guid callerId);
    Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto, Guid callerId);
    Task<bool> DeleteItemAsync(Guid itemId, Guid callerId);

    // Shopping item operations
    Task<ShoppingItemDto?> AddShoppingItemAsync(Guid listId, CreateShoppingItemDto dto, Guid callerId);
    Task<ShoppingItemDto?> UpdateShoppingItemAsync(Guid itemId, UpdateShoppingItemDto dto, Guid callerId);
    Task<bool> DeleteShoppingItemAsync(Guid itemId, Guid callerId);

    // Shopping list settings
    Task<ShoppingListSettingsDto?> GetShoppingSettingsAsync(Guid listId);
    Task<ShoppingListSettingsDto?> UpsertShoppingSettingsAsync(Guid listId, UpdateShoppingListSettingsDto dto, Guid callerId);

    // Clear trip: mark all bought items as inactive and update lastBoughtAt
    Task<PersonalListDto?> ClearTripAsync(Guid listId, Guid callerId);
}

