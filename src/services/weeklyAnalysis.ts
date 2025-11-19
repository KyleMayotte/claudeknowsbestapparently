/**
 * Weekly Analysis Service
 * Analyzes workout history from the last 7 days
 * Reads data from AsyncStorage (same keys as WorkoutScreen)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Match WorkoutScreen.tsx structure (lines 67-76)
interface Set {
  id: string;
  reps: string; // Can be empty string
  weight: string; // Can be empty string
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string; // Format: "YYYY-MM-DD"
  duration: number; // minutes
  exercises: Exercise[];
}

// Template structure (matches WorkoutScreen.tsx)
interface WorkoutTemplate {
  id: string;
  name: string;
  emoji: string;
  category?: string;
  exercises: Exercise[];
  isActive?: boolean;
}

// Analysis result structure
export interface ExerciseAnalysis {
  name: string;
  thisWeek: {
    totalVolume: number; // Sum of (weight × reps) for all sets this week
    totalSets: number;
    maxWeight: number; // Heaviest weight used this week
    avgReps: number; // Average reps per set this week
  };
  lastWeek?: {
    totalVolume: number;
    maxWeight: number;
    totalSets: number;
  };
  change?: {
    weightDelta: number; // +5 lbs, -10 lbs, etc. (maxWeight comparison)
    volumePercent: number; // +15%, -8%, etc. (volume comparison)
    isNew: boolean; // true if exercise wasn't done last week
  };
}

export interface WeeklyTrend {
  direction: 'up' | 'down' | 'flat'; // 📈 📉 →
  emoji: string; // '📈' | '📉' | '→'
  title: string; // "You're on a Roll" | "Let's Regroup" | "Steady Progress"
  subtitle: string; // "+15% volume vs last week" | "Volume dropped 20%"
  volumeChange: number; // Percentage change
  workoutsChange: number; // Difference in workout count
}

export interface DayToDayComparison {
  // Last week at this same day-of-week
  lastWeekSameDayWorkouts: number;
  lastWeekSameDayVolume: number;
  // This week so far (up to today)
  thisWeekSoFarWorkouts: number;
  thisWeekSoFarVolume: number;
  // Deltas
  workoutsDelta: number; // thisWeek - lastWeek (can be negative)
  volumeDelta: number; // thisWeek - lastWeek (can be negative)
  volumePercentChange: number; // percentage change
  // Progress toward last week's full total
  lastWeekFullTotal: number; // Total workouts last week completed
  lastWeekFullVolume: number; // Total volume last week completed
  progressPercent: number; // (thisWeek / lastWeekFull) * 100
  remainingWorkouts: number; // lastWeekFull - thisWeek
  remainingVolume: number; // lastWeekFullVolume - thisWeekVolume
}

export interface WeeklyAnalysisResult {
  workoutsCompleted: number;
  totalVolume: number; // Sum of (weight × reps × sets)
  totalSets: number;
  totalDuration: number; // minutes
  exercises: ExerciseAnalysis[];
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  // Week-over-week comparison
  trend: WeeklyTrend;
  previousWeek: {
    workoutsCompleted: number;
    totalVolume: number;
    totalSets: number;
  };
  // Day-to-day comparison (for non-check-in days)
  dayToDayComparison?: DayToDayComparison;
}

// New interface for custom period comparison
export interface ExerciseComparison {
  name: string;
  current: {
    totalVolume: number; // Sum of all (weight × reps) across all instances
    totalSets: number;
    maxWeight: number; // Heaviest single set weight in the period
    avgReps: number; // Average reps per set
    completedSets: number;
  };
  previous: {
    totalVolume: number;
    totalSets: number;
    maxWeight: number;
    avgReps: number;
    completedSets: number;
  };
  change: {
    weightDelta: number; // +5 lbs, -10 lbs (maxWeight comparison)
    volumeDelta: number; // +450 lbs, -300 lbs (absolute volume change)
    volumePercent: number; // +15%, -8% (percentage volume change)
    isNew: boolean; // true if exercise wasn't done in previous period
  };
}

export interface CustomPeriodComparison {
  currentPeriod: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    workoutsCompleted: number;
    totalVolume: number;
    totalSets: number;
  };
  previousPeriod: {
    startDate: string;
    endDate: string;
    workoutsCompleted: number;
    totalVolume: number;
    totalSets: number;
  };
  exercises: ExerciseComparison[];
  trend: WeeklyTrend;
}

/**
 * Get date 7 days ago in YYYY-MM-DD format
 * Uses local timezone to match WorkoutScreen.tsx date format
 */
function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  // Use local date components (same as WorkoutScreen.tsx:977)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * Uses local timezone to match WorkoutScreen.tsx date format
 */
function getTodayDate(): string {
  const today = new Date();
  // Use local date components (same as WorkoutScreen.tsx:977)
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * Format volume for display (e.g., "12,450 lbs")
 */
export function formatVolume(volume: number): string {
  return `${Math.round(volume).toLocaleString()} lbs`;
}

/**
 * Format duration for display (e.g., "45 min")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Parse weight string to number (handles "185", "185.5", empty string)
 */
function parseWeight(weight: string): number {
  const parsed = parseFloat(weight);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse reps string to number (handles "10", "12", empty string)
 */
function parseReps(reps: string): number {
  const parsed = parseInt(reps, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper: Aggregate exercises across ALL workouts in a date range
 * Combines all instances of the same exercise (e.g., bench press on multiple days)
 */
function aggregateExercisesByName(
  allWorkouts: WorkoutHistory[],
  startDate: string,
  endDate: string
): Map<string, {
  totalVolume: number;
  totalSets: number;
  maxWeight: number;
  totalReps: number;
  completedSets: number;
}> {
  // Filter workouts to date range
  const rangeWorkouts = allWorkouts.filter(w => w.date >= startDate && w.date <= endDate);

  const exerciseMap = new Map<string, {
    totalVolume: number;
    totalSets: number;
    maxWeight: number;
    totalReps: number;
    completedSets: number;
  }>();

  // Aggregate ALL instances of each exercise across ALL workouts in the period
  for (const workout of rangeWorkouts) {
    for (const exercise of workout.exercises) {
      // Initialize exercise if not exists
      if (!exerciseMap.has(exercise.name)) {
        exerciseMap.set(exercise.name, {
          totalVolume: 0,
          totalSets: 0,
          maxWeight: 0,
          totalReps: 0,
          completedSets: 0,
        });
      }

      const exerciseData = exerciseMap.get(exercise.name)!;

      // Process each set
      for (const set of exercise.sets) {
        exerciseData.totalSets++;

        if (set.completed) {
          exerciseData.completedSets++;
        }

        const weight = parseWeight(set.weight);
        const reps = parseReps(set.reps);

        if (weight > 0 && reps > 0) {
          // Track max weight
          if (weight > exerciseData.maxWeight) {
            exerciseData.maxWeight = weight;
          }

          // Accumulate volume (weight × reps)
          exerciseData.totalVolume += weight * reps;

          // Track total reps
          exerciseData.totalReps += reps;
        }
      }
    }
  }

  return exerciseMap;
}

/**
 * Helper: Get date N days before a given date in YYYY-MM-DD format
 */
function getDateNDaysBefore(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local time
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Generate trend message based on week-over-week comparison
 */
function generateTrend(
  thisWeekVolume: number,
  lastWeekVolume: number,
  thisWeekWorkouts: number,
  lastWeekWorkouts: number
): WeeklyTrend {
  // Calculate percentage change
  let volumeChange = 0;
  if (lastWeekVolume > 0) {
    volumeChange = ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100;
  } else if (thisWeekVolume > 0) {
    volumeChange = 100; // First week
  }

  const workoutsChange = thisWeekWorkouts - lastWeekWorkouts;

  // Determine direction
  if (volumeChange > 5) {
    return {
      direction: 'up',
      emoji: '📈',
      title: "You're on a Roll",
      subtitle: `+${Math.round(volumeChange)}% volume vs last week`,
      volumeChange,
      workoutsChange,
    };
  } else if (volumeChange < -5) {
    return {
      direction: 'down',
      emoji: '📉',
      title: "Let's Regroup",
      subtitle: `${Math.round(volumeChange)}% volume vs last week`,
      volumeChange,
      workoutsChange,
    };
  } else {
    return {
      direction: 'flat',
      emoji: '→',
      title: 'Steady Progress',
      subtitle: 'Volume consistent with last week',
      volumeChange,
      workoutsChange,
    };
  }
}

/**
 * Calculate day-to-day comparison for non-check-in days
 * Compares "this week so far" vs "last week at same point"
 */
function calculateDayToDayComparison(
  allWorkouts: WorkoutHistory[],
  currentWeekStart: string,
  currentWeekEnd: string,
  previousWeekStart: string,
  previousWeekEnd: string,
  today: string
): DayToDayComparison {
  // Filter to workouts up to today in current week
  const thisWeekSoFar = allWorkouts.filter(w => w.date >= currentWeekStart && w.date <= today);

  // Calculate how many days into the week we are
  const currentWeekStartDate = new Date(currentWeekStart + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const daysIntoWeek = Math.floor((todayDate.getTime() - currentWeekStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Get same day-of-week from last week
  const lastWeekSameDayDate = getDateNDaysBefore(today, 7);
  const lastWeekSameDay = allWorkouts.filter(w =>
    w.date >= previousWeekStart && w.date <= lastWeekSameDayDate
  );

  // Get full last week stats
  const lastWeekFull = allWorkouts.filter(w =>
    w.date >= previousWeekStart && w.date <= previousWeekEnd
  );

  // Calculate volumes
  const thisWeekSoFarVolume = thisWeekSoFar.reduce((sum, w) => {
    let workoutVolume = 0;
    for (const ex of w.exercises) {
      for (const set of ex.sets) {
        const weight = parseWeight(set.weight);
        const reps = parseReps(set.reps);
        if (weight > 0 && reps > 0) {
          workoutVolume += weight * reps;
        }
      }
    }
    return sum + workoutVolume;
  }, 0);

  const lastWeekSameDayVolume = lastWeekSameDay.reduce((sum, w) => {
    let workoutVolume = 0;
    for (const ex of w.exercises) {
      for (const set of ex.sets) {
        const weight = parseWeight(set.weight);
        const reps = parseReps(set.reps);
        if (weight > 0 && reps > 0) {
          workoutVolume += weight * reps;
        }
      }
    }
    return sum + workoutVolume;
  }, 0);

  const lastWeekFullVolume = lastWeekFull.reduce((sum, w) => {
    let workoutVolume = 0;
    for (const ex of w.exercises) {
      for (const set of ex.sets) {
        const weight = parseWeight(set.weight);
        const reps = parseReps(set.reps);
        if (weight > 0 && reps > 0) {
          workoutVolume += weight * reps;
        }
      }
    }
    return sum + workoutVolume;
  }, 0);

  // Calculate deltas
  const workoutsDelta = thisWeekSoFar.length - lastWeekSameDay.length;
  const volumeDelta = thisWeekSoFarVolume - lastWeekSameDayVolume;
  const volumePercentChange = lastWeekSameDayVolume > 0
    ? ((volumeDelta / lastWeekSameDayVolume) * 100)
    : (thisWeekSoFarVolume > 0 ? 100 : 0);

  // Calculate progress toward last week's full total
  const progressPercent = lastWeekFullVolume > 0
    ? (thisWeekSoFarVolume / lastWeekFullVolume) * 100
    : 0;

  const remainingWorkouts = Math.max(0, lastWeekFull.length - thisWeekSoFar.length);
  const remainingVolume = Math.max(0, lastWeekFullVolume - thisWeekSoFarVolume);

  return {
    lastWeekSameDayWorkouts: lastWeekSameDay.length,
    lastWeekSameDayVolume,
    thisWeekSoFarWorkouts: thisWeekSoFar.length,
    thisWeekSoFarVolume,
    workoutsDelta,
    volumeDelta,
    volumePercentChange,
    lastWeekFullTotal: lastWeekFull.length,
    lastWeekFullVolume,
    progressPercent,
    remainingWorkouts,
    remainingVolume,
  };
}

/**
 * Analyze last week's workouts
 * Returns exercise-by-exercise breakdown with week-over-week comparison
 *
 * @param userEmail - User's email (used to fetch workout history from AsyncStorage)
 * @param checkinDay - Day of week for check-in (0 = Sunday, 6 = Saturday) - NOT USED, kept for backwards compatibility
 * @returns Weekly analysis result
 */
export async function analyzeLastWeek(userEmail: string, checkinDay: number = 0): Promise<WeeklyAnalysisResult> {
  try {
    // Read workout history from AsyncStorage (same key as WorkoutScreen.tsx:59)
    const storageKey = `@muscleup/workout_history_${userEmail}`;
    console.log('📦 WEEKLY ANALYSIS - Reading from AsyncStorage');
    console.log('  Storage key:', storageKey);
    console.log('  User email:', userEmail);

    const historyJson = await AsyncStorage.getItem(storageKey);

    if (!historyJson) {
      console.log('❌ NO WORKOUT HISTORY FOUND');
      console.log('  Reasons:');
      console.log('  1. No workouts completed yet');
      console.log('  2. User email mismatch');
      console.log('  3. Different storage key');
      // No workout history found - return empty analysis
      return {
        workoutsCompleted: 0,
        totalVolume: 0,
        totalSets: 0,
        totalDuration: 0,
        exercises: [],
        dateRange: {
          start: getDateNDaysAgo(7),
          end: getTodayDate(),
        },
        trend: {
          direction: 'flat',
          emoji: '📊',
          title: 'No Data Yet',
          subtitle: 'Complete some workouts to see your progress',
          volumeChange: 0,
          workoutsChange: 0,
        },
        previousWeek: {
          workoutsCompleted: 0,
          totalVolume: 0,
          totalSets: 0,
        },
        dayToDayComparison: {
          lastWeekSameDayWorkouts: 0,
          lastWeekSameDayVolume: 0,
          thisWeekSoFarWorkouts: 0,
          thisWeekSoFarVolume: 0,
          workoutsDelta: 0,
          volumeDelta: 0,
          volumePercentChange: 0,
          lastWeekFullTotal: 0,
          lastWeekFullVolume: 0,
          progressPercent: 0,
          remainingWorkouts: 0,
          remainingVolume: 0,
        },
      };
    }

    console.log('✅ FOUND workout history!');
    console.log('  JSON length:', historyJson.length, 'chars');

    const allWorkouts: WorkoutHistory[] = JSON.parse(historyJson);
    console.log('✅ Parsed', allWorkouts.length, 'workouts');

    // Log first 3 workouts in detail
    console.log('\n📝 First 3 workouts from history:');
    allWorkouts.slice(0, 3).forEach((w, i) => {
      console.log(`\n  Workout ${i + 1}:`);
      console.log(`    Date: ${w.date}`);
      console.log(`    Name: ${w.templateName}`);
      console.log(`    Exercises: ${w.exercises.length}`);
      w.exercises.forEach((ex, j) => {
        console.log(`      ${j + 1}. ${ex.name}: ${ex.sets.length} sets`);
        ex.sets.slice(0, 2).forEach((set, k) => {
          console.log(`         Set ${k + 1}: ${set.weight} lbs × ${set.reps} reps (${set.completed ? 'done' : 'skipped'})`);
        });
      });
    });

    // Sort all workouts by date (most recent first)
    allWorkouts.sort((a, b) => b.date.localeCompare(a.date));

    // Define date ranges - always show last 7 days from today
    const today = getTodayDate();

    // Current week: last 7 days from today
    const currentWeekEnd = today;
    const currentWeekStart = getDateNDaysBefore(currentWeekEnd, 6);

    // Previous week: 7 days before that
    const previousWeekEnd = getDateNDaysBefore(currentWeekStart, 1);
    const previousWeekStart = getDateNDaysBefore(previousWeekEnd, 6);

    console.log('📅 Week ranges (rolling 7-day windows):');
    console.log('  Current week:', currentWeekStart, 'to', currentWeekEnd);
    console.log('  Previous week:', previousWeekStart, 'to', previousWeekEnd);

    // Aggregate exercises by name for both periods
    const currentPeriodExercises = aggregateExercisesByName(allWorkouts, currentWeekStart, currentWeekEnd);
    const previousPeriodExercises = aggregateExercisesByName(allWorkouts, previousWeekStart, previousWeekEnd);

    // Calculate period totals
    let currentVolume = 0;
    let currentSets = 0;
    for (const [_, data] of currentPeriodExercises) {
      currentVolume += data.totalVolume;
      currentSets += data.totalSets;
    }

    let previousVolume = 0;
    let previousSets = 0;
    for (const [_, data] of previousPeriodExercises) {
      previousVolume += data.totalVolume;
      previousSets += data.totalSets;
    }

    // Count actual workouts (not deduplicated)
    const currentWorkouts = allWorkouts.filter(w => w.date >= currentWeekStart && w.date <= currentWeekEnd);
    const previousWorkouts = allWorkouts.filter(w => w.date >= previousWeekStart && w.date <= previousWeekEnd);

    // Generate trend
    const trend = generateTrend(
      currentVolume,
      previousVolume,
      currentWorkouts.length,
      previousWorkouts.length
    );

    // Calculate day-to-day comparison
    const dayToDayComparison = calculateDayToDayComparison(
      allWorkouts,
      currentWeekStart,
      currentWeekEnd,
      previousWeekStart,
      previousWeekEnd,
      today
    );

    // Build exercise analysis array
    const exercises: ExerciseAnalysis[] = [];

    // Get all unique exercise names from both periods
    const allExerciseNames = new Set([
      ...Array.from(currentPeriodExercises.keys()),
      ...Array.from(previousPeriodExercises.keys()),
    ]);

    for (const name of allExerciseNames) {
      const currentData = currentPeriodExercises.get(name);
      const previousData = previousPeriodExercises.get(name);

      // Only include exercises from current period
      if (!currentData) continue;

      const avgReps = currentData.totalSets > 0
        ? currentData.totalReps / currentData.totalSets
        : 0;

      const exercise: ExerciseAnalysis = {
        name,
        thisWeek: {
          totalVolume: currentData.totalVolume,
          totalSets: currentData.totalSets,
          maxWeight: currentData.maxWeight,
          avgReps,
        },
      };

      // Add comparison if previous data exists
      if (previousData) {
        const previousAvgReps = previousData.totalSets > 0
          ? previousData.totalReps / previousData.totalSets
          : 0;

        exercise.lastWeek = {
          totalVolume: previousData.totalVolume,
          maxWeight: previousData.maxWeight,
          totalSets: previousData.totalSets,
        };

        const weightDelta = currentData.maxWeight - previousData.maxWeight;
        const volumePercent = previousData.totalVolume > 0
          ? ((currentData.totalVolume - previousData.totalVolume) / previousData.totalVolume) * 100
          : 100;

        exercise.change = {
          weightDelta,
          volumePercent,
          isNew: false,
        };
      } else {
        // New exercise
        exercise.change = {
          weightDelta: currentData.maxWeight,
          volumePercent: 100,
          isNew: true,
        };
      }

      exercises.push(exercise);
    }

    // Sort by total volume (descending)
    exercises.sort((a, b) => b.thisWeek.totalVolume - a.thisWeek.totalVolume);

    // Calculate total duration
    const totalDuration = currentWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);

    return {
      workoutsCompleted: currentWorkouts.length,
      totalVolume: currentVolume,
      totalSets: currentSets,
      totalDuration,
      exercises,
      dateRange: {
        start: currentWeekStart,
        end: currentWeekEnd,
      },
      trend,
      previousWeek: {
        workoutsCompleted: previousWorkouts.length,
        totalVolume: previousVolume,
        totalSets: previousSets,
      },
      dayToDayComparison,
    };
  } catch (error) {
    console.error('💥 Weekly Analysis ERROR:', error);
    throw error;
  }
}

/**
 * NEW: Compare exercises between two custom date ranges
 * This is the core function for your custom comparison feature
 *
 * @param userEmail - User's email (used to fetch workout history)
 * @param currentStart - Start date for current period (YYYY-MM-DD)
 * @param currentEnd - End date for current period (YYYY-MM-DD)
 * @param previousStart - Start date for previous period (YYYY-MM-DD)
 * @param previousEnd - End date for previous period (YYYY-MM-DD)
 * @returns Custom period comparison with exercise-level aggregation
 */
export async function compareCustomPeriods(
  userEmail: string,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
): Promise<CustomPeriodComparison> {
  try {
    // Read workout history
    const storageKey = `@muscleup/workout_history_${userEmail}`;
    const historyJson = await AsyncStorage.getItem(storageKey);

    if (!historyJson) {
      // No history - return empty comparison
      return {
        currentPeriod: {
          startDate: currentStart,
          endDate: currentEnd,
          workoutsCompleted: 0,
          totalVolume: 0,
          totalSets: 0,
        },
        previousPeriod: {
          startDate: previousStart,
          endDate: previousEnd,
          workoutsCompleted: 0,
          totalVolume: 0,
          totalSets: 0,
        },
        exercises: [],
        trend: {
          direction: 'flat',
          emoji: '📊',
          title: 'No Data Yet',
          subtitle: 'Complete some workouts to see your progress',
          volumeChange: 0,
          workoutsChange: 0,
        },
      };
    }

    const allWorkouts: WorkoutHistory[] = JSON.parse(historyJson);

    // Aggregate exercises for both periods
    const currentPeriodExercises = aggregateExercisesByName(allWorkouts, currentStart, currentEnd);
    const previousPeriodExercises = aggregateExercisesByName(allWorkouts, previousStart, previousEnd);

    // Calculate period totals
    let currentVolume = 0;
    let currentSets = 0;
    for (const [_, data] of currentPeriodExercises) {
      currentVolume += data.totalVolume;
      currentSets += data.totalSets;
    }

    let previousVolume = 0;
    let previousSets = 0;
    for (const [_, data] of previousPeriodExercises) {
      previousVolume += data.totalVolume;
      previousSets += data.totalSets;
    }

    // Count workouts in each period
    const currentWorkouts = allWorkouts.filter(w => w.date >= currentStart && w.date <= currentEnd);
    const previousWorkouts = allWorkouts.filter(w => w.date >= previousStart && w.date <= previousEnd);

    // Generate trend
    const trend = generateTrend(
      currentVolume,
      previousVolume,
      currentWorkouts.length,
      previousWorkouts.length
    );

    // Build exercise comparison array
    const exercises: ExerciseComparison[] = [];

    // Get all unique exercise names
    const allExerciseNames = new Set([
      ...Array.from(currentPeriodExercises.keys()),
      ...Array.from(previousPeriodExercises.keys()),
    ]);

    for (const name of allExerciseNames) {
      const currentData = currentPeriodExercises.get(name);
      const previousData = previousPeriodExercises.get(name);

      // Build current period stats (use 0 if exercise not done)
      const current = currentData ? {
        totalVolume: currentData.totalVolume,
        totalSets: currentData.totalSets,
        maxWeight: currentData.maxWeight,
        avgReps: currentData.totalSets > 0 ? currentData.totalReps / currentData.totalSets : 0,
        completedSets: currentData.completedSets,
      } : {
        totalVolume: 0,
        totalSets: 0,
        maxWeight: 0,
        avgReps: 0,
        completedSets: 0,
      };

      // Build previous period stats (use 0 if exercise not done)
      const previous = previousData ? {
        totalVolume: previousData.totalVolume,
        totalSets: previousData.totalSets,
        maxWeight: previousData.maxWeight,
        avgReps: previousData.totalSets > 0 ? previousData.totalReps / previousData.totalSets : 0,
        completedSets: previousData.completedSets,
      } : {
        totalVolume: 0,
        totalSets: 0,
        maxWeight: 0,
        avgReps: 0,
        completedSets: 0,
      };

      // Calculate changes
      const weightDelta = current.maxWeight - previous.maxWeight;
      const volumeDelta = current.totalVolume - previous.totalVolume;
      const volumePercent = previous.totalVolume > 0
        ? ((volumeDelta / previous.totalVolume) * 100)
        : (current.totalVolume > 0 ? 100 : 0);
      const isNew = !previousData && !!currentData;

      exercises.push({
        name,
        current,
        previous,
        change: {
          weightDelta,
          volumeDelta,
          volumePercent,
          isNew,
        },
      });
    }

    // Sort by current period volume (descending)
    exercises.sort((a, b) => b.current.totalVolume - a.current.totalVolume);

    return {
      currentPeriod: {
        startDate: currentStart,
        endDate: currentEnd,
        workoutsCompleted: currentWorkouts.length,
        totalVolume: currentVolume,
        totalSets: currentSets,
      },
      previousPeriod: {
        startDate: previousStart,
        endDate: previousEnd,
        workoutsCompleted: previousWorkouts.length,
        totalVolume: previousVolume,
        totalSets: previousSets,
      },
      exercises,
      trend,
    };
  } catch (error) {
    console.error('💥 Custom Period Comparison ERROR:', error);
    throw error;
  }
}
