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
