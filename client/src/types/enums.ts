// ─────────────────────────────────────────────────────────────────────────────
// Enums
// All string values map to i18n translation keys where appropriate.
// ─────────────────────────────────────────────────────────────────────────────

/** Whether a goal has a definite end-state or is maintained indefinitely */
export enum GoalType {
  /** Has a clear completion point (e.g. "Learn Python basics") */
  Finite  = 'finite',
  /** Ongoing habit / maintenance (e.g. "Stay healthy") */
  Ongoing = 'ongoing',
}

/** Broad category used for goal icon / colour coding */
export enum GoalCategory {
  Home     = 'home',
  Work     = 'work',
  Health   = 'health',
  Business = 'business',
  Python   = 'python',
  Hobby    = 'hobby',
  Personal = 'personal',
}

/**
 * How urgently a task should be addressed.
 * Maps to translation key `priority.<value>`.
 */
export enum Priority {
  Low      = 'low',
  Medium   = 'medium',
  High     = 'high',
  Critical = 'critical',
}

/**
 * Perceived difficulty of a task.
 * Maps to translation key `difficulty.<value>`.
 */
export enum Difficulty {
  Easy   = 'easy',
  Medium = 'medium',
  Hard   = 'hard',
}

/**
 * Rough estimate of how long a task takes to execute.
 * Used to suggest "quick win" tasks.
 * Maps to translation key `executionType.<value>`.
 */
export enum ExecutionType {
  /** Under 2 minutes */
  Quick  = 'quick',
  /** 2–10 minutes */
  Short  = 'short',
  /** 10–30 minutes */
  Medium = 'medium',
  /** 30+ minutes */
  Long   = 'long',
}

/**
 * How a task should repeat after completion.
 * Maps to translation key `recurrence.<value>`.
 */
export enum RecurrenceType {
  None    = 'none',
  Daily   = 'daily',
  Weekly  = 'weekly',
  Monthly = 'monthly',
}

/**
 * The nature / category of a task.
 * Maps to translation key `taskNature.<value>`.
 */
export enum TaskNature {
  /** Something you do yourself */
  Action      = 'action',
  /** Scheduled meeting with others */
  Meeting     = 'meeting',
  /** Fixed external appointment (doctor, dentist, admin, etc.) */
  Appointment = 'appointment',
}

/**
 * Lifecycle status of a task.
 * Maps to translation key `taskStatus.<value>`.
 */
export enum TaskStatus {
  Open        = 'open',
  Completed   = 'completed',
  Archived    = 'archived',
  /** Past-due time-sensitive task that was not completed */
  Missed      = 'missed',
  /** Past-due task carried forward to today */
  CarriedOver = 'carriedOver',
}

/**
 * The type / purpose of a personal list.
 * Maps to translation key `listType.<value>`.
 */
export enum ListType {
  Checklist   = 'checklist',
  Shopping    = 'shopping',
  Notes       = 'notes',
  Ideas       = 'ideas',
  Equipment   = 'equipment',
  CookingPlan = 'cookingplan',
}

/**
 * Supermarket / store department for grouping shopping items.
 * Maps to translation key `shoppingDepartment.<value>`.
 */
export enum ShoppingDepartment {
  FruitsAndVegetables = 'fruitsAndVegetables',
  Dairy               = 'dairy',
  MeatAndFish         = 'meatAndFish',
  Bakery              = 'bakery',
  Pantry              = 'pantry',
  Frozen              = 'frozen',
  Cleaning            = 'cleaning',
  Disposable          = 'disposable',
  Baby                = 'baby',
  Other               = 'other',
}

/**
 * How often a shopping item is purchased — drives smart suggestion logic.
 * Maps to translation key `shoppingItemType.<value>`.
 */
export enum ShoppingItemType {
  /** Always suggest again after being bought */
  Regular    = 'regular',
  /** Suggest again after X days (configurable per list) */
  Occasional = 'occasional',
  /** Never auto-suggest */
  OneTime    = 'oneTime',
}

/** Meal slot for a cooking item — Shabbat slots or weekday categories. */
export enum MealSlot {
  None            = 'none',
  // Shabbat meals
  FridayDinner    = 'fridaydinner',
  SaturdayMorning = 'saturdaymorning',
  Additions       = 'additions',
  ThirdMeal       = 'thirdmeal',
  // Weekday categories
  MainDish        = 'maindish',
  Side            = 'side',
  Salad           = 'salad',
  Dessert         = 'dessert',
  Other           = 'other',
}

/** Whether a cooking list is structured for Shabbat or regular weekday cooking. */
export enum CookingMode {
  Regular = 'regular',
  Shabbat = 'shabbat',
}

