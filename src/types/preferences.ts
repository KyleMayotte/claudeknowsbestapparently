// Workout Preferences Type Definitions

export type WeightIncrement = 2.5 | 5 | 10;
export type UnitSystem = 'lbs' | 'kg';
export type PrimaryGoal = 'muscle_gain' | 'strength' | 'weight_loss' | 'athletic_performance' | 'general_fitness';

/**
 * Progressive Overload Configuration
 *
 * How it works:
 * 1. User sets a target rep range (e.g., 8-12 reps) for reference
 * 2. User sets a specific threshold (e.g., 12 reps)
 * 3. When user hits the threshold, app suggests increasing weight
 * 4. Weight increases by weightIncrement (e.g., +5 lbs)
 * 5. User starts back at lower reps with new weight
 *
 * Example progression (target 8-12 reps, increase at 12, +5 lbs):
 * Workout 1: 185 lbs x 8 reps
 * Workout 2: 185 lbs x 10 reps (improving!)
 * Workout 3: 185 lbs x 12 reps (hit threshold!)
 * Workout 4: 190 lbs x 8 reps (increased weight, back to lower reps)
 */
export interface ProgressiveOverloadConfig {
  weightIncrement: number; // lbs/kg to increase when progressing
  targetRepRange: { min: number; max: number }; // Reference range (e.g., {min: 8, max: 12})
  increaseAtReps: number; // Specific threshold to trigger weight increase (e.g., 12)
}

export interface WeeklyStreakData {
  currentStreak: number;      // Consecutive weeks hitting goal
  longestStreak: number;      // All-time best
  lastStreakWeek?: string;    // ISO date of Sunday for last completed week
}

/**
 * Streak Freeze System (inspired by Duolingo)
 *
 * How it works:
 * 1. User gets 1 freeze per month (resets on 1st of month)
 * 2. Proactive: User can manually activate freeze for upcoming week
 * 3. Reactive: Auto-activates if streak would break and freeze available
 * 4. Tracks frozen weeks to prevent duplicate use on same week
 *
 * Example:
 * - User has 5-week streak, going on vacation next week
 * - Taps "Use Freeze" on Sunday before vacation
 * - Next week: 0 workouts, but freeze protects streak
 * - Following week: Back to training, streak continues at 6 weeks
 */
export interface StreakFreezeData {
  freezesAvailable: number;        // 0 or 1 (resets monthly)
  lastResetMonth: string;          // YYYY-MM format for tracking monthly reset
  frozenWeeks: string[];           // ISO dates of Sundays for weeks that used freeze
  pendingFreezeWeek?: string;      // ISO date of Sunday for proactively frozen week
}

export interface WorkoutPreferences {
  // User Profile
  primaryGoal: PrimaryGoal;
  age?: number; // Optional age for personalized coaching and progression
  currentWeight?: number;
  goalWeight?: number;
  weightHistory?: { date: string; weight: number }[];

  // Progressive Overload Settings
  enableProgressiveOverload: boolean;
  weightIncrement: WeightIncrement;
  progressiveOverloadConfig: ProgressiveOverloadConfig;

  // Workout Settings
  unitSystem: UnitSystem;
  weeklyWorkoutGoal?: number; // Target workouts per week (3, 4, 5, or 6)
  weeklyStreakData?: WeeklyStreakData; // Weekly streak tracking
  streakFreezeData?: StreakFreezeData; // Streak freeze system

  // Notifications & Reminders
  enableWorkoutReminders: boolean;
  reminderTime?: string; // HH:MM format
  reminderMessage?: string; // Custom reminder message
  reminderDays?: number[]; // Array of selected days: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  enableRestTimerSound: boolean;
  enableWeeklyCheckin?: boolean; // Weekly check-in reminder
  weeklyCheckinDay?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weeklyCheckinTime?: string; // HH:MM format (default: 20:00)
}

export const DEFAULT_PREFERENCES: WorkoutPreferences = {
  // User Profile
  primaryGoal: 'muscle_gain',
  age: undefined,
  currentWeight: undefined,
  goalWeight: undefined,
  weightHistory: [],

  // Progressive Overload
  enableProgressiveOverload: false, // Default: OFF (users can enable if they want)
  weightIncrement: 5,
  progressiveOverloadConfig: {
    weightIncrement: 5,
    targetRepRange: { min: 8, max: 12 },
    increaseAtReps: 12, // Default: increase at max reps
  },

  // Workout Settings
  unitSystem: 'lbs',
  weeklyWorkoutGoal: 4, // Default to 4 workouts per week
  weeklyStreakData: {
    currentStreak: 0,
    longestStreak: 0,
    lastStreakWeek: undefined,
  },
  streakFreezeData: {
    freezesAvailable: 1,
    lastResetMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    frozenWeeks: [],
    pendingFreezeWeek: undefined,
  },

  // Notifications
  enableWorkoutReminders: false,
  reminderMessage: "Time to grind! 💪 Let's get that workout in!",
  reminderDays: [1, 2, 3, 4, 5], // Default: Monday-Friday
  enableRestTimerSound: true,
  enableWeeklyCheckin: false,
  weeklyCheckinDay: 0, // Default: Sunday
  weeklyCheckinTime: '20:00', // Default: 8:00 PM
};

// Helper type for preference updates
export type PreferenceUpdate = Partial<WorkoutPreferences>;
