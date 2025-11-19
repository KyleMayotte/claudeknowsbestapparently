import type { UnitSystem } from '../types/preferences';

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Set {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
  notes?: string;
}

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string;
  duration: number;
  exercises: Exercise[];
}

interface ExerciseComparison {
  name: string;
  oldWeight: number;
  newWeight: number;
  change: number;
}

/**
 * Generate a data-driven comparison message for workout completion
 * Shows comparison vs last workout of same type OR highlights for first workout
 */
export function generateWorkoutComparison(
  currentWorkout: WorkoutHistory,
  workoutHistory: WorkoutHistory[],
  unitSystem: UnitSystem
): string | null {
  // Find previous workout with same template
  const previousWorkout = workoutHistory.find(
    (w) => w.templateId === currentWorkout.templateId && w.id !== currentWorkout.id
  );

  // Calculate current workout stats
  const currentStats = calculateWorkoutStats(currentWorkout);

  // If no previous workout, show first-time highlights
  if (!previousWorkout) {
    const bestExercise = findBestSet(currentWorkout);
    return formatFirstWorkoutMessage(currentStats, bestExercise, unitSystem, currentWorkout.templateName);
  }

  // Calculate previous workout stats
  const previousStats = calculateWorkoutStats(previousWorkout);

  // Calculate days since last workout
  const daysSince = calculateDaysBetween(previousWorkout.date, currentWorkout.date);

  // Find exercise improvements
  const improvements = findExerciseImprovements(currentWorkout, previousWorkout);

  return formatComparisonMessage(
    currentStats,
    previousStats,
    improvements,
    daysSince,
    unitSystem,
    currentWorkout.templateName
  );
}

/**
 * Calculate key stats for a workout
 */
function calculateWorkoutStats(workout: WorkoutHistory) {
  let totalVolume = 0;
  let totalSets = 0;

  workout.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.completed) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        totalVolume += weight * reps;
        totalSets++;
      }
    });
  });

  return {
    volume: totalVolume,
    sets: totalSets,
    duration: workout.duration,
  };
}

/**
 * Find best set in current workout
 */
function findBestSet(workout: WorkoutHistory) {
  let bestSet = { exercise: '', weight: 0, reps: 0 };

  workout.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.completed) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        const estimated1RM = weight * (1 + reps / 30);

        if (estimated1RM > bestSet.weight * (1 + bestSet.reps / 30)) {
          bestSet = { exercise: exercise.name, weight, reps };
        }
      }
    });
  });

  return bestSet;
}

/**
 * Find exercises that improved from last workout
 */
function findExerciseImprovements(
  currentWorkout: WorkoutHistory,
  previousWorkout: WorkoutHistory
): ExerciseComparison[] {
  const improvements: ExerciseComparison[] = [];

  currentWorkout.exercises.forEach((currentExercise) => {
    const previousExercise = previousWorkout.exercises.find(
      (e) => e.name === currentExercise.name
    );

    if (previousExercise) {
      // Find best sets from each workout
      const currentBest = findBestSetInExercise(currentExercise);
      const previousBest = findBestSetInExercise(previousExercise);

      if (currentBest && previousBest) {
        const currentMax = currentBest.weight;
        const previousMax = previousBest.weight;

        if (currentMax > previousMax) {
          improvements.push({
            name: currentExercise.name,
            oldWeight: previousMax,
            newWeight: currentMax,
            change: currentMax - previousMax,
          });
        }
      }
    }
  });

  return improvements;
}

/**
 * Find best set in a single exercise
 */
function findBestSetInExercise(exercise: Exercise) {
  let best = { weight: 0, reps: 0 };

  exercise.sets.forEach((set) => {
    if (set.completed) {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;

      if (weight > best.weight) {
        best = { weight, reps };
      }
    }
  });

  return best.weight > 0 ? best : null;
}

/**
 * Calculate days between two dates
 */
function calculateDaysBetween(dateStr1: string, dateStr2: string): number {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format message for first workout
 */
function formatFirstWorkoutMessage(
  stats: { volume: number; sets: number; duration: number },
  bestSet: { exercise: string; weight: number; reps: number },
  unitSystem: UnitSystem,
  workoutName: string
): string {
  const volumeFormatted = (stats.volume / 1000).toFixed(1);
  const lines = [];

  // Bold header with workout name
  lines.push(`**FIRST ${workoutName.toUpperCase()}**`);
  lines.push('');

  lines.push(`💪 ${volumeFormatted}k ${unitSystem} crushed`);

  if (bestSet.exercise) {
    lines.push(`🔥 ${bestSet.exercise}: ${bestSet.weight}×${bestSet.reps}`);
  }

  if (stats.duration > 0) {
    lines.push(`⚡ ${stats.duration} min - solid pace`);
  }

  return lines.join('\n');
}

/**
 * Format comparison message
 */
function formatComparisonMessage(
  currentStats: { volume: number; sets: number; duration: number },
  previousStats: { volume: number; sets: number; duration: number },
  improvements: ExerciseComparison[],
  daysSince: number,
  unitSystem: UnitSystem,
  workoutName: string
): string {
  const volumeChange = currentStats.volume - previousStats.volume;
  const volumePercent = previousStats.volume > 0
    ? Math.round((volumeChange / previousStats.volume) * 100)
    : 0;

  const lines = [];

  // Bold header with workout name
  lines.push(`**COMPARED TO LAST ${workoutName.toUpperCase()}**`);
  lines.push('');

  // Volume comparison with energy
  if (volumePercent > 0) {
    lines.push(`💪 Crushed +${Math.abs(volumeChange).toFixed(0)} ${unitSystem} (↑${Math.abs(volumePercent)}%)`);
  } else if (volumePercent < 0) {
    lines.push(`📉 ${Math.abs(volumeChange).toFixed(0)} ${unitSystem} down (${volumePercent}%)`);
  } else {
    lines.push(`💪 Matched ${(currentStats.volume / 1000).toFixed(1)}k ${unitSystem}`);
  }

  // Exercise improvements (max 2) with fire emoji
  improvements.slice(0, 2).forEach((imp) => {
    lines.push(`🔥 ${imp.name}: ${imp.oldWeight}→${imp.newWeight} ${unitSystem}`);
  });

  // Duration comparison with lightning
  if (currentStats.duration !== previousStats.duration && currentStats.duration > 0 && previousStats.duration > 0) {
    const timeDiff = previousStats.duration - currentStats.duration;
    if (timeDiff > 0) {
      lines.push(`⚡ ${timeDiff} min faster`);
    }
  }

  return lines.join('\n');
}
