using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;

namespace TasksManager.API.Services;

public class UserSettingsService(AppDbContext db)
{
    public async Task<UserSettingsDto> GetOrCreateAsync(Guid userId)
    {
        var settings = await db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings == null)
        {
            settings = new UserSettings { UserId = userId };
            db.UserSettings.Add(settings);
            await db.SaveChangesAsync();
        }
        return ToDto(settings);
    }

    public async Task<UserSettingsDto> UpdateAsync(Guid userId, UpdateUserSettingsDto dto)
    {
        var settings = await db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings == null)
        {
            settings = new UserSettings { UserId = userId };
            db.UserSettings.Add(settings);
        }

        if (dto.GoalCategories      != null) settings.GoalCategoriesJson      = JsonSerializer.Serialize(dto.GoalCategories);
        if (dto.CoachTone            != null) settings.CoachTone               = dto.CoachTone;
        if (dto.CoachFrequency       != null) settings.CoachFrequency          = dto.CoachFrequency;
        if (dto.WorkStartHour        != null) settings.WorkStartHour           = dto.WorkStartHour.Value;
        if (dto.WorkEndHour          != null) settings.WorkEndHour             = dto.WorkEndHour.Value;
        if (dto.FirstDayOfWeek       != null) settings.FirstDayOfWeek          = dto.FirstDayOfWeek.Value;
        if (dto.Language             != null) settings.Language                = dto.Language;
        if (dto.DefaultReminderMinutes != null) settings.DefaultReminderMinutes = dto.DefaultReminderMinutes.Value;
        if (dto.PushNotificationsEnabled != null) settings.PushNotificationsEnabled = dto.PushNotificationsEnabled.Value;

        await db.SaveChangesAsync();
        return ToDto(settings);
    }

    private static UserSettingsDto ToDto(UserSettings s)
    {
        List<string> categories;
        try   { categories = JsonSerializer.Deserialize<List<string>>(s.GoalCategoriesJson) ?? new(); }
        catch { categories = new List<string> { "home", "work", "health", "personal" }; }

        return new UserSettingsDto
        {
            GoalCategories           = categories,
            CoachTone                = s.CoachTone,
            CoachFrequency           = s.CoachFrequency,
            WorkStartHour            = s.WorkStartHour,
            WorkEndHour              = s.WorkEndHour,
            FirstDayOfWeek           = s.FirstDayOfWeek,
            Language                 = s.Language,
            DefaultReminderMinutes   = s.DefaultReminderMinutes,
            PushNotificationsEnabled = s.PushNotificationsEnabled,
        };
    }
}
