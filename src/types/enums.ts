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
