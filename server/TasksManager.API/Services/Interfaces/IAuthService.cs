using TasksManager.API.DTOs;

namespace TasksManager.API.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> LoginWithGoogleAsync(GoogleLoginDto dto);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
}
