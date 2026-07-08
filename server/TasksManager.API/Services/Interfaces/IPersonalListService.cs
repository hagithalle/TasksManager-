using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IPersonalListService
{
    Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId);
    Task<PersonalListDto?> GetByIdAsync(Guid id);
    Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto);
    Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto, Guid callerId);
    Task<PersonalListDto?> ArchiveAsync(Guid id, Guid callerId, bool archive);
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

    // Cooking item operations
    Task<CookingItemDto?> AddCookingItemAsync(Guid listId, CreateCookingItemDto dto, Guid callerId);
    Task<CookingItemDto?> UpdateCookingItemAsync(Guid itemId, UpdateCookingItemDto dto, Guid callerId);
    Task<bool> DeleteCookingItemAsync(Guid itemId, Guid callerId);

    // Extract ingredients from a cooking list and compare to an existing shopping list
    Task<ExtractIngredientsResultDto?> ExtractIngredientsAsync(Guid cookingListId, Guid shoppingListId, Guid callerId);

    // Push selected ingredients to a shopping list (user must confirm first)
    Task<bool> PushIngredientsToShoppingAsync(Guid cookingListId, PushToShoppingRequestDto dto, Guid callerId);

    // Rule-based cooking suggestions based on the user's cooking history
    Task<IEnumerable<CookingSuggestionDto>> GetCookingSuggestionsAsync(Guid userId);
}

