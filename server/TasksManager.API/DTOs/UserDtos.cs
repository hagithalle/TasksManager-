namespace TasksManager.API.DTOs;

public record UserDto(
    Guid Id,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string Language,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateUserDto(
    string DisplayName,
    string? AvatarUrl,
    string Language
);

public record UpdateUserDto(
    string? DisplayName,
    string? AvatarUrl,
    string? Language
);
