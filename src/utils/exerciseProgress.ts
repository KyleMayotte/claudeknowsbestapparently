// Utility functions for aggregating and analyzing exercise progress data

interface ExerciseSet {
  weight?: number;
  reps?: number;
  completed?: boolean;
}

interface Exercise {
  name: string;
  sets?: ExerciseSet[];
}

interface Workout {
  date: string;
  exercises?: Exercise[];
}

export interface ExerciseDataPoint {
  date: string;
  value: number;
  reps?: number;
  sets?: number;
}

export interface ExerciseProgressData {
  exerciseName: string;
  dataPoints: ExerciseDataPoint[];
  personalBest: number;
  currentValue: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
}

/**
 * Calculate estimated 1RM (One Rep Max) using Epley formula
 * Formula: weight × (1 + reps / 30)
 * This is the most widely used formula in fitness apps
 */
export const calculateEstimated1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps > 12) return weight; // For very high reps, just return the weight as 1RM estimation becomes unreliable

  // Epley formula: 1RM = weight × (1 + reps / 30)
  return weight * (1 + reps / 30);
};

/**
 * Get the maximum weight lifted for a specific exercise on a given date
 */
export const getMaxWeightForExercise = (
  exercise: Exercise,
  metric: 'weight' | 'volume' | 'reps' | 'estimated1rm'
): { value: number; reps?: number; sets?: number } => {
  if (!exercise.sets || exercise.sets.length === 0) {
    return { value: 0 };
  }

  const completedSets = exercise.sets.filter(set => set.completed !== false);

  if (completedSets.length === 0) {
    return { value: 0 };
  }

  switch (metric) {
    case 'weight':
      // Return the highest weight lifted
      const maxWeightSet = completedSets.reduce((max, set) => {
        const weight = set.weight || 0;
        const maxWeight = max.weight || 0;
        return weight > maxWeight ? set : max;
      }, completedSets[0]);
      return {
        value: maxWeightSet.weight || 0,
        reps: maxWeightSet.reps,
      };

    case 'volume':
      // Return total volume (weight × reps) for all sets
      const totalVolume = completedSets.reduce((sum, set) => {
        return sum + (set.weight || 0) * (set.reps || 0);
      }, 0);
      return {
        value: totalVolume,
        sets: completedSets.length,
      };

    case 'reps':
      // Return the highest reps completed
      const maxRepsSet = completedSets.reduce((max, set) => {
        const reps = set.reps || 0;
        const maxReps = max.reps || 0;
        return reps > maxReps ? set : max;
      }, completedSets[0]);
      return {
        value: maxRepsSet.reps || 0,
        reps: maxRepsSet.reps,
      };

    case 'estimated1rm':
      // Return the highest estimated 1RM from all sets
      const max1RMSet = completedSets.reduce((max, set) => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        const estimated1RM = calculateEstimated1RM(weight, reps);

        const maxWeight = max.weight || 0;
        const maxReps = max.reps || 0;
        const maxEstimated1RM = calculateEstimated1RM(maxWeight, maxReps);

        return estimated1RM > maxEstimated1RM ? set : max;
      }, completedSets[0]);

      const e1rmWeight = max1RMSet.weight || 0;
      const e1rmReps = max1RMSet.reps || 0;

      return {
        value: calculateEstimated1RM(e1rmWeight, e1rmReps),
        reps: e1rmReps,
      };

    default:
      return { value: 0 };
  }
};

/**
 * Aggregate exercise data from workout history for a specific exercise
 */
export const aggregateExerciseData = (
  workoutHistory: Workout[],
  exerciseName: string,
  metric: 'weight' | 'volume' | 'reps' | 'estimated1rm' = 'weight'
): ExerciseProgressData => {
  const dataPoints: ExerciseDataPoint[] = [];
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;

  // Sort workouts by ID (timestamp) to preserve chronological order
  // This ensures correct ordering even when multiple workouts are on the same date
  const sortedWorkouts = [...workoutHistory].sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idA - idB;
  });

  sortedWorkouts.forEach(workout => {
    if (!workout.exercises) return;

    const exercise = workout.exercises.find(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );

    if (exercise && exercise.sets) {
      const result = getMaxWeightForExercise(exercise, metric);

      if (result.value > 0) {
        dataPoints.push({
          date: workout.date,
          value: result.value,
          reps: result.reps,
          sets: result.sets,
        });
      }

      // Calculate totals
      const completedSets = exercise.sets.filter(set => set.completed !== false);
      totalSets += completedSets.length;
      completedSets.forEach(set => {
        totalReps += set.reps || 0;
        totalVolume += (set.weight || 0) * (set.reps || 0);
      });
    }
  });

  const personalBest = dataPoints.length > 0
    ? Math.max(...dataPoints.map(d => d.value))
    : 0;

  const currentValue = dataPoints.length > 0
    ? dataPoints[dataPoints.length - 1].value
    : 0;

  return {
    exerciseName,
    dataPoints,
    personalBest,
    currentValue,
    totalSets,
    totalReps,
    totalVolume,
  };
};

/**
 * Get all unique exercises from workout history
 */
export const getUniqueExercises = (workoutHistory: Workout[]): string[] => {
  const exerciseSet = new Set<string>();

  workoutHistory.forEach(workout => {
    workout.exercises?.forEach(exercise => {
      exerciseSet.add(exercise.name);
    });
  });

  return Array.from(exerciseSet).sort();
};

/**
 * Get exercise frequency (number of times performed)
 */
export const getExerciseFrequency = (
  workoutHistory: Workout[],
  exerciseName: string
): number => {
  let count = 0;

  workoutHistory.forEach(workout => {
    const hasExercise = workout.exercises?.some(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    if (hasExercise) {
      count++;
    }
  });

  return count;
};

/**
 * Get the most frequently performed exercises
 */
export const getTopExercises = (
  workoutHistory: Workout[],
  limit: number = 10
): Array<{ name: string; count: number }> => {
  const exerciseMap = new Map<string, number>();

  workoutHistory.forEach(workout => {
    workout.exercises?.forEach(exercise => {
      const count = exerciseMap.get(exercise.name) || 0;
      exerciseMap.set(exercise.name, count + 1);
    });
  });

  return Array.from(exerciseMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Calculate progress percentage between first and last data point
 */
export const calculateProgress = (dataPoints: ExerciseDataPoint[]): number => {
  if (dataPoints.length < 2) return 0;

  const firstValue = dataPoints[0].value;
  const lastValue = dataPoints[dataPoints.length - 1].value;

  if (firstValue === 0) return 0;

  return ((lastValue - firstValue) / firstValue) * 100;
};

/**
 * Get recent personal records (last 30 days)
 */
export const getRecentPRs = (
  workoutHistory: Workout[],
  daysBack: number = 30
): Array<{ exerciseName: string; value: number; date: string; metric: string }> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const exerciseMap = new Map<string, { maxValue: number; date: string }>();

  // Get all exercises and their max values
  workoutHistory.forEach(workout => {
    const workoutDate = new Date(workout.date);
    if (workoutDate >= cutoffDate) {
      workout.exercises?.forEach(exercise => {
        const result = getMaxWeightForExercise(exercise, 'weight');
        const existing = exerciseMap.get(exercise.name);

        if (!existing || result.value > existing.maxValue) {
          exerciseMap.set(exercise.name, {
            maxValue: result.value,
            date: workout.date,
          });
        }
      });
    }
  });

  return Array.from(exerciseMap.entries())
    .map(([name, data]) => ({
      exerciseName: name,
      value: data.maxValue,
      date: data.date,
      metric: 'weight',
    }))
    .filter(pr => pr.value > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
