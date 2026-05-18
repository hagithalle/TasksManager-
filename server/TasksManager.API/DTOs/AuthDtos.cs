namespace TasksManager.API.DTOs;

public record RegisterDto(
    string DisplayName,
    string Email,
    string Password,
    string Language = "en"
);

public record LoginDto(
    string Email,
    string Password
);

public record AuthResponseDto(
    string Token,
    UserDto User
);

public record GoogleLoginDto(
    string IdToken,
    string? RefreshToken = null
);
