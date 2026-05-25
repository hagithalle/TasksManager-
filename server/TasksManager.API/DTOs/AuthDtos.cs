using System.ComponentModel.DataAnnotations;

namespace TasksManager.API.DTOs;

public record RegisterDto(
    [Required][MaxLength(100)] string DisplayName,
    [Required][EmailAddress][MaxLength(200)] string Email,
    [Required][MinLength(8)][MaxLength(100)] string Password,
    string Language = "en"
);

public record LoginDto(
    [Required][EmailAddress][MaxLength(200)] string Email,
    [Required] string Password
);

public record AuthResponseDto(
    string Token,
    UserDto User
);

public record GoogleLoginDto(string IdToken);
