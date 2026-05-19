namespace TasksManager.API.DTOs;

public class UserSettingsDto
{
    public List<string> GoalCategories         { get; set; } = new();
    public string       CoachTone              { get; set; } = "encouraging";
    public string       CoachFrequency         { get; set; } = "daily";
    public int          WorkStartHour          { get; set; } = 8;
    public int          WorkEndHour            { get; set; } = 20;
    public int          FirstDayOfWeek         { get; set; } = 0;
    public string       Language               { get; set; } = "en";
    public int          DefaultReminderMinutes { get; set; } = 30;
    public bool         PushNotificationsEnabled { get; set; } = true;
}

public class UpdateUserSettingsDto
{
    public List<string>? GoalCategories         { get; set; }
    public string?       CoachTone              { get; set; }
    public string?       CoachFrequency         { get; set; }
    public int?          WorkStartHour          { get; set; }
    public int?          WorkEndHour            { get; set; }
    public int?          FirstDayOfWeek         { get; set; }
    public string?       Language               { get; set; }
    public int?          DefaultReminderMinutes { get; set; }
    public bool?         PushNotificationsEnabled { get; set; }
}
