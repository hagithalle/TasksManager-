using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new InvalidOperationException("Email already in use.");

        var user = new User
        {
            Id           = Guid.NewGuid(),
            DisplayName  = dto.DisplayName.Trim(),
            Email        = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Language     = dto.Language,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new AuthResponseDto(GenerateToken(user), ToDto(user));
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        return new AuthResponseDto(GenerateToken(user), ToDto(user));
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        return user is null ? null : ToDto(user);
    }

    public async Task<AuthResponseDto> LoginWithGoogleAsync(GoogleLoginDto dto)
    {
        // Support both id_token (JWT) and access_token (opaque)
        // Try id_token first, fall back to access_token via userinfo endpoint
        string email, name, picture;

        // access_token is short (<512 chars), id_token is a long JWT (>512 chars)
        if (dto.IdToken.Length > 512 && dto.IdToken.Contains('.'))
        {
            // Looks like a JWT — validate as id_token
            var clientId = _config["Google:ClientId"]
                ?? throw new InvalidOperationException("Google ClientId is not configured.");
            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(
                    dto.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } });
            }
            catch (InvalidJwtException)
            {
                throw new UnauthorizedAccessException("Invalid Google token.");
            }
            email   = payload.Email.Trim().ToLowerInvariant();
            name    = payload.Name ?? email;
            picture = payload.Picture ?? string.Empty;
        }
        else
        {
            // Treat as access_token — verify via Google userinfo endpoint
            using var http = new System.Net.Http.HttpClient();
            http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", dto.IdToken);
            var response = await http.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
            if (!response.IsSuccessStatusCode)
                throw new UnauthorizedAccessException("Invalid Google access token.");
            var json = await response.Content.ReadAsStringAsync();
            var info = System.Text.Json.JsonDocument.Parse(json).RootElement;
            email   = (info.GetProperty("email").GetString() ?? "").Trim().ToLowerInvariant();
            name    = info.TryGetProperty("name", out var n) ? n.GetString() ?? email : email;
            picture = info.TryGetProperty("picture", out var p) ? p.GetString() ?? "" : "";
        }

        var user  = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                Id           = Guid.NewGuid(),
                DisplayName  = name,
                Email        = email,
                PasswordHash = Guid.NewGuid().ToString("N"),
                AvatarUrl    = picture,
                Language     = "he",
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else if (!string.IsNullOrEmpty(picture) && user.AvatarUrl != picture)
        {
            user.AvatarUrl = picture;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Save refresh token if provided
        if (!string.IsNullOrEmpty(dto.RefreshToken) && user.GoogleRefreshToken != dto.RefreshToken)
        {
            user.GoogleRefreshToken = dto.RefreshToken;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return new AuthResponseDto(GenerateToken(user), ToDto(user));
    }

    // ── JWT ───────────────────────────────────────────────────────────────────

    private string GenerateToken(User user)
    {
        var jwtSection = _config.GetSection("Jwt");
        var key        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var creds      = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name,  user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             jwtSection["Issuer"],
            audience:           jwtSection["Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(
                                    double.Parse(jwtSection["ExpiryDays"] ?? "7")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto ToDto(User u) =>
        new(u.Id, u.DisplayName, u.Email, u.AvatarUrl, u.Language, u.CreatedAt, u.UpdatedAt);
}
