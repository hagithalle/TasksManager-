using Microsoft.EntityFrameworkCore;
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
        var lists = await _db.PersonalLists
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Include(l => l.Items)
            .ToListAsync();
        return lists.Select(ToDto);
    }

    public async Task<PersonalListDto?> GetByIdAsync(Guid id)
    {
        var list = await _db.PersonalLists
            .AsNoTracking()
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id);
        return list is null ? null : ToDto(list);
    }

    public async Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto)
    {
        var list = new PersonalList
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Title = dto.Title,
            Emoji = dto.Emoji,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.PersonalLists.Add(list);
        await _db.SaveChangesAsync();
        return ToDto(list);
    }

    public async Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto)
    {
        var list = await _db.PersonalLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
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

    // ── Items ─────────────────────────────────────────────────────────────────

    public async Task<PersonalListItemDto> AddItemAsync(Guid listId, CreatePersonalListItemDto dto)
    {
        var item = new PersonalListItem
        {
            Id = Guid.NewGuid(),
            PersonalListId = listId,
            Title = dto.Title,
            SortOrder = dto.SortOrder
        };
        _db.PersonalListItems.Add(item);
        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto)
    {
        var item = await _db.PersonalListItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null) return null;

        if (dto.Title is not null)       item.Title       = dto.Title;
        if (dto.IsCompleted.HasValue)    item.IsCompleted = dto.IsCompleted.Value;
        if (dto.SortOrder.HasValue)      item.SortOrder   = dto.SortOrder.Value;

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

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static PersonalListDto ToDto(PersonalList l) => new(
        l.Id, l.UserId, l.Title, l.Emoji,
        l.Items.Select(ToItemDto).OrderBy(i => i.SortOrder),
        l.CreatedAt, l.UpdatedAt
    );

    private static PersonalListItemDto ToItemDto(PersonalListItem i) =>
        new(i.Id, i.PersonalListId, i.Title, i.IsCompleted, i.SortOrder);
}
