namespace TasksManager.API.Models;

public class UserSettings
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // ── Goal categories (JSON array of strings) ───────────────────────────
    public string GoalCategoriesJson { get; set; } = """["home","work","health","personal"]""";

    // ── Personal coach ────────────────────────────────────────────────────
    /// <summary>encouraging | direct | strict</summary>
    public string CoachTone { get; set; } = "encouraging";
    /// <summary>daily | weekly | asNeeded</summary>
    public string CoachFrequency { get; set; } = "daily";

    // ── Working hours ─────────────────────────────────────────────────────
    public int WorkStartHour { get; set; } = 8;
    public int WorkEndHour   { get; set; } = 20;

    // ── Calendar / language ───────────────────────────────────────────────
    /// <summary>0 = Sunday, 1 = Monday</summary>
    public int FirstDayOfWeek { get; set; } = 0;
    public string Language { get; set; } = "en";

    // ── Notifications ─────────────────────────────────────────────────────
    /// <summary>Default minutes before due time for reminders</summary>
    public int DefaultReminderMinutes { get; set; } = 30;
    public bool PushNotificationsEnabled { get; set; } = true;
}
