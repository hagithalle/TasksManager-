using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class PersonalListService : IPersonalListService
{
    private readonly AppDbContext _db;

    public PersonalListService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId)
    {
        // Own lists
        var ownLists = await _db.PersonalLists
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .ToListAsync();

        // Shared lists accepted by this user
        var sharedIds = await _db.ShareInvites
            .Where(s => s.AcceptedByUserId == userId && s.ResourceType == Models.ShareResourceType.List)
            .Select(s => s.ResourceId)
            .ToListAsync();

        var sharedLists = sharedIds.Any()
            ? await _db.PersonalLists
                .AsNoTracking()
                .Where(l => sharedIds.Contains(l.Id))
                .Include(l => l.Items)
                .Include(l => l.ShoppingItems)
                .Include(l => l.ShoppingSettings)
                .ToListAsync()
            : new List<PersonalList>();

        return ownLists.Concat(sharedLists).Select(ToDto);
    }

    public async Task<PersonalListDto?> GetByIdAsync(Guid id)
    {
        var list = await _db.PersonalLists
            .AsNoTracking()
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .FirstOrDefaultAsync(l => l.Id == id);
        return list is null ? null : ToDto(list);
    }

    public async Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto)
    {
        var listType = Enum.TryParse<ListType>(dto.ListType, ignoreCase: true, out var lt) ? lt : ListType.Checklist;

        var list = new PersonalList
        {
            Id        = Guid.NewGuid(),
            UserId    = dto.UserId,
            Title     = dto.Title,
            Emoji     = dto.Emoji,
            ListType  = listType,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.PersonalLists.Add(list);

        // Auto-create default settings for shopping lists
        if (listType == ListType.Shopping)
        {
            _db.ShoppingListSettings.Add(new ShoppingListSettings
            {
                Id           = Guid.NewGuid(),
                PersonalListId = list.Id,
            });
        }

        await _db.SaveChangesAsync();

        list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .FirstAsync(l => l.Id == list.Id);

        return ToDto(list);
    }

    public async Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto)
    {
        var list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (list is null) return null;

        if (dto.Title is not null) list.Title = dto.Title;
        if (dto.Emoji is not null) list.Emoji = dto.Emoji;
        list.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(list);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var list = await _db.PersonalLists.FirstOrDefaultAsync(l => l.Id == id);
        if (list is null) return false;
        _db.PersonalLists.Remove(list);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Generic items ─────────────────────────────────────────────────────────

    public async Task<PersonalListItemDto> AddItemAsync(Guid listId, CreatePersonalListItemDto dto)
    {
        var item = new PersonalListItem
        {
            Id             = Guid.NewGuid(),
            PersonalListId = listId,
            Title          = dto.Title,
            SortOrder      = dto.SortOrder
        };
        _db.PersonalListItems.Add(item);
        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto)
    {
        var item = await _db.PersonalListItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return null;

        if (dto.Title is not null)    item.Title       = dto.Title;
        if (dto.IsCompleted.HasValue) item.IsCompleted = dto.IsCompleted.Value;
        if (dto.SortOrder.HasValue)   item.SortOrder   = dto.SortOrder.Value;

        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<bool> DeleteItemAsync(Guid itemId)
    {
        var item = await _db.PersonalListItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return false;
        _db.PersonalListItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Shopping items ────────────────────────────────────────────────────────

    public async Task<ShoppingItemDto> AddShoppingItemAsync(Guid listId, CreateShoppingItemDto dto)
    {
        var dept     = Enum.TryParse<ShoppingDepartment>(dto.Department, ignoreCase: true, out var d) ? d : ShoppingDepartment.Other;
        var itemType = Enum.TryParse<ShoppingItemType>(dto.ItemType, ignoreCase: true, out var t)     ? t : ShoppingItemType.Regular;

        var item = new ShoppingItem
        {
            Id             = Guid.NewGuid(),
            PersonalListId = listId,
            Title          = dto.Title,
            Quantity       = dto.Quantity,
            Unit           = dto.Unit,
            Department     = dept,
            ItemType       = itemType,
            IsActive       = true,
            SortOrder      = dto.SortOrder,
            ImageUrl       = dto.ImageUrl,
            PreferredBrand = dto.PreferredBrand,
            AlternativeBrandsJson = dto.AlternativeBrands is not null
                ? JsonSerializer.Serialize(dto.AlternativeBrands)
                : null,
            NoteForBuyer   = dto.NoteForBuyer,
        };
        _db.ShoppingItems.Add(item);
        await _db.SaveChangesAsync();
        return ToShoppingItemDto(item);
    }

    public async Task<ShoppingItemDto?> UpdateShoppingItemAsync(Guid itemId, UpdateShoppingItemDto dto)
    {
        var item = await _db.ShoppingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return null;

        if (dto.Title is not null)     item.Title    = dto.Title;
        if (dto.Quantity.HasValue)     item.Quantity = dto.Quantity;
        if (dto.Unit is not null)      item.Unit     = dto.Unit;
        if (dto.SortOrder.HasValue)    item.SortOrder = dto.SortOrder.Value;
        if (dto.IsActive.HasValue)     item.IsActive = dto.IsActive.Value;

        if (dto.ImageUrl is not null)       item.ImageUrl       = string.IsNullOrEmpty(dto.ImageUrl) ? null : dto.ImageUrl;
        if (dto.PreferredBrand is not null) item.PreferredBrand = string.IsNullOrEmpty(dto.PreferredBrand) ? null : dto.PreferredBrand;
        if (dto.NoteForBuyer is not null)   item.NoteForBuyer   = string.IsNullOrEmpty(dto.NoteForBuyer)   ? null : dto.NoteForBuyer;
        if (dto.AlternativeBrands is not null)
            item.AlternativeBrandsJson = JsonSerializer.Serialize(dto.AlternativeBrands);

        if (dto.Department is not null &&
            Enum.TryParse<ShoppingDepartment>(dto.Department, ignoreCase: true, out var dept))
            item.Department = dept;

        if (dto.ItemType is not null &&
            Enum.TryParse<ShoppingItemType>(dto.ItemType, ignoreCase: true, out var itype))
            item.ItemType = itype;

        // Handle buy/unbuy
        if (dto.IsBought.HasValue)
        {
            if (dto.IsBought.Value && !item.IsBought)
            {
                item.IsBought = true;
                item.BoughtAt = DateTime.UtcNow;
            }
            else if (!dto.IsBought.Value && item.IsBought)
            {
                item.IsBought = false;
                item.BoughtAt = null;
            }
        }

        await _db.SaveChangesAsync();
        return ToShoppingItemDto(item);
    }

    public async Task<bool> DeleteShoppingItemAsync(Guid itemId)
    {
        var item = await _db.ShoppingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return false;
        _db.ShoppingItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Shopping settings ─────────────────────────────────────────────────────

    public async Task<ShoppingListSettingsDto?> GetShoppingSettingsAsync(Guid listId)
    {
        var s = await _db.ShoppingListSettings.AsNoTracking().FirstOrDefaultAsync(s => s.PersonalListId == listId);
        return s is null ? null : ToSettingsDto(s);
    }

    public async Task<ShoppingListSettingsDto> UpsertShoppingSettingsAsync(Guid listId, UpdateShoppingListSettingsDto dto)
    {
        var s = await _db.ShoppingListSettings.FirstOrDefaultAsync(s => s.PersonalListId == listId);
        if (s is null)
        {
            s = new ShoppingListSettings { Id = Guid.NewGuid(), PersonalListId = listId };
            _db.ShoppingListSettings.Add(s);
        }

        if (dto.EnableSmartSuggestions.HasValue)  s.EnableSmartSuggestions = dto.EnableSmartSuggestions.Value;
        if (dto.OccasionalIntervalDays.HasValue)  s.OccasionalIntervalDays = dto.OccasionalIntervalDays.Value;
        if (dto.GroupByDepartment.HasValue)        s.GroupByDepartment      = dto.GroupByDepartment.Value;
        if (dto.ShowBoughtSection.HasValue)        s.ShowBoughtSection      = dto.ShowBoughtSection.Value;

        await _db.SaveChangesAsync();
        return ToSettingsDto(s);
    }

    // ── Clear trip ────────────────────────────────────────────────────────────

    public async Task<PersonalListDto?> ClearTripAsync(Guid listId)
    {
        var list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .FirstOrDefaultAsync(l => l.Id == listId);
        if (list is null) return null;

        var now = DateTime.UtcNow;
        foreach (var item in list.ShoppingItems.Where(i => i.IsBought))
        {
            item.IsActive     = false;
            item.IsBought     = false;
            item.LastBoughtAt = item.BoughtAt ?? now;
            item.BoughtAt     = null;
        }

        list.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return ToDto(list);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static PersonalListDto ToDto(PersonalList l) => new(
        l.Id,
        l.UserId,
        l.Title,
        l.Emoji,
        l.ListType.ToString().ToLower(),
        l.Items.Select(ToItemDto).OrderBy(i => i.SortOrder),
        l.ShoppingItems.Select(ToShoppingItemDto).OrderBy(i => i.SortOrder),
        l.ShoppingSettings is null ? null : ToSettingsDto(l.ShoppingSettings),
        l.CreatedAt,
        l.UpdatedAt
    );

    private static PersonalListItemDto ToItemDto(PersonalListItem i) =>
        new(i.Id, i.PersonalListId, i.Title, i.IsCompleted, i.SortOrder);

    private static ShoppingItemDto ToShoppingItemDto(ShoppingItem i)
    {
        IEnumerable<string> altBrands = i.AlternativeBrandsJson is null
            ? Enumerable.Empty<string>()
            : JsonSerializer.Deserialize<IEnumerable<string>>(i.AlternativeBrandsJson) ?? Enumerable.Empty<string>();

        return new ShoppingItemDto(
            i.Id,
            i.PersonalListId,
            i.Title,
            i.Quantity,
            i.Unit,
            i.Department.ToString().ToLower(),
            i.ItemType.ToString().ToLower(),
            i.IsActive,
            i.IsBought,
            i.BoughtAt,
            i.LastBoughtAt,
            i.SortOrder,
            i.ImageUrl,
            i.PreferredBrand,
            altBrands,
            i.NoteForBuyer
        );
    }

    private static ShoppingListSettingsDto ToSettingsDto(ShoppingListSettings s) => new(
        s.EnableSmartSuggestions,
        s.OccasionalIntervalDays,
        s.GroupByDepartment,
        s.ShowBoughtSection
    );
}

