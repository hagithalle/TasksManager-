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
