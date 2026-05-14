using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var users = await _db.Users.AsNoTracking().ToListAsync();
        return users.Select(ToDto);
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? null : ToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            DisplayName = dto.DisplayName,
            AvatarUrl = dto.AvatarUrl,
            Language = dto.Language,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return null;

        if (dto.DisplayName is not null) user.DisplayName = dto.DisplayName;
        if (dto.AvatarUrl is not null)   user.AvatarUrl   = dto.AvatarUrl;
        if (dto.Language is not null)    user.Language    = dto.Language;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return false;
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return true;
    }

    private static UserDto ToDto(User u) =>
        new(u.Id, u.DisplayName, u.AvatarUrl, u.Language, u.CreatedAt, u.UpdatedAt);
}
