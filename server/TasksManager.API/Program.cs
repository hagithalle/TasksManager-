using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TasksManager.API.Data;
using TasksManager.API.Services;
using TasksManager.API.Services.Interfaces;

// Allow DateTime with Unspecified Kind (dates without time component)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

// Fail fast if the JWT key is still the placeholder in non-development environments
var jwtSection = builder.Configuration.GetSection("Jwt");
if (!builder.Environment.IsDevelopment())
{
    var jwtKey = jwtSection["Key"] ?? string.Empty;
    if (jwtKey.Contains("CHANGE_ME") || jwtKey.Length < 32)
        throw new InvalidOperationException(
            "JWT Key is not configured. Set the 'Jwt:Key' environment variable before running in production.");
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter(
                System.Text.Json.JsonNamingPolicy.CamelCase));
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// EF Core – PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Dependency injection
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IGoalService, GoalService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IPersonalListService, PersonalListService>();
builder.Services.AddScoped<AiService>();
builder.Services.AddScoped<IGoogleCalendarService, GoogleCalendarService>();
builder.Services.AddScoped<UserSettingsService>();

// JWT Authentication
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSection["Issuer"],
            ValidAudience            = jwtSection["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSection["Key"]!))
        };
    });

// CORS – allow the React dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientPolicy", policy =>
    {
        var origins = new List<string>
        {
            "https://tasks-manager-psi.vercel.app",
            builder.Configuration["AllowedOrigin"] ?? "https://tasks-manager-psi.vercel.app"
        };
        if (builder.Environment.IsDevelopment())
        {
            origins.Add("http://localhost:5173");
            origins.Add("http://localhost:3000");
        }
        policy.WithOrigins(origins.Distinct().ToArray())
              .AllowAnyHeader()
              .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS");
    });
});

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.Window            = TimeSpan.FromMinutes(1);
        o.PermitLimit       = 10;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit        = 0;
    });
    options.AddFixedWindowLimiter("ai", o =>
    {
        o.Window            = TimeSpan.FromMinutes(1);
        o.PermitLimit       = 20;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit        = 0;
    });
});

var app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Security response headers
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options", "DENY");
    ctx.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("ClientPolicy");
app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-apply migrations on startup (development convenience)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
