namespace TasksManager.API.Models;

public enum GoalType
{
    Finite = 0,
    Ongoing = 1
}

public enum RecurrenceType
{
    None    = 0,
    Daily   = 1,
    Weekly  = 2,
    Monthly = 3
}

public enum Priority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum Difficulty
{
    Easy = 0,
    Medium = 1,
    Hard = 2
}

public enum ExecutionType
{
    Quick  = 0,
    Short  = 1,
    Medium = 2,
    Long   = 3
}

public enum TaskNature
{
    Action      = 0,  // something you DO yourself
    Meeting     = 1,  // scheduled meeting with others
    Appointment = 2,  // fixed external appointment (doctor, dentist, etc.)
}

public enum ItemStatus
{
    Open        = 0,  // default – not yet completed
    Completed   = 1,  // user marked as done
    Archived    = 2,  // manually archived
    Missed      = 3,  // time-sensitive task that passed without completion
    CarriedOver = 4,  // past-due non-time-sensitive task brought forward
}

public enum ListType
{
    Checklist   = 0,  // default – generic checklist
    Shopping    = 1,  // smart shopping list with departments + suggestions
    Notes       = 2,  // free-form notes
    Ideas       = 3,  // idea collection
    Equipment   = 4,  // packing / equipment list
    CookingPlan = 5,  // meal / cooking planning list
}

public enum ShoppingDepartment
{
    FruitsAndVegetables = 0,
    Dairy               = 1,
    MeatAndFish         = 2,
    Bakery              = 3,
    Pantry              = 4,
    Frozen              = 5,
    Cleaning            = 6,
    Disposable          = 7,
    Baby                = 8,
    Other               = 9,
}

public enum ShoppingItemType
{
    Regular    = 0,  // always suggest again after being bought
    Occasional = 1,  // suggest again after X days
    OneTime    = 2,  // never auto-suggest
}

/// <summary>Which meal slot a cooking item belongs to.</summary>
public enum MealSlot
{
    None            = 0,
    // Shabbat meals
    FridayDinner    = 1,   // ערב שבת
    SaturdayMorning = 2,   // בוקר שבת
    Additions       = 3,   // תוספות (חלות, מיצים...)
    ThirdMeal       = 4,   // סעודה שלישית
    // Weekday categories
    MainDish        = 10,  // עיקרי
    Side            = 11,  // תוספת
    Salad           = 12,  // סלט
    Dessert         = 13,  // קינוח
    Other           = 99,
}

/// <summary>How a cooking list is structured.</summary>
public enum CookingMode
{
    Regular = 0,  // weekday cooking – optional category grouping
    Shabbat = 1,  // Shabbat cooking – divided by meal slots
}
