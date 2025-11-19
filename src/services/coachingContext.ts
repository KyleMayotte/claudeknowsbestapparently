// Coaching Context Service
// Provides personalized exercise history and performance data for AI coaching
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExerciseHistorySet {
  weight: string;
  reps: string;
  date: string;
}

interface ExerciseHistory {
  exerciseName: string;
  recentSets: ExerciseHistorySet[];
  averageWeight: number;
  averageReps: number;
  bestSet: { weight: string; reps: string; date: string } | null;
  performanceTrend: 'improving' | 'declining' | 'stable';
}

/**
 * Get exercise history from past workouts for personalized coaching
 */
export const getExerciseHistory = async (
  exerciseName: string,
  limit: number = 10
): Promise<ExerciseHistory> => {
  try {
    const historyStr = await AsyncStorage.getItem('@muscleup/workout_history');
    if (!historyStr) {
      return {
        exerciseName,
        recentSets: [],
        averageWeight: 0,
        averageReps: 0,
        bestSet: null,
        performanceTrend: 'stable',
      };
    }

    const workoutHistory: any[] = JSON.parse(historyStr);
    const recentSets: ExerciseHistorySet[] = [];

    // Extract all sets for this exercise from recent workouts
    for (const workout of workoutHistory.slice(0, 10)) {
      const exercise = workout.exercises?.find(
        (ex: any) => ex.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (exercise && exercise.sets) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight && set.reps) {
            recentSets.push({
              weight: set.weight,
              reps: set.reps,
              date: workout.date,
            });
          }
        }
      }
    }

    // Calculate average weight and reps
    const totalWeight = recentSets.reduce((sum, set) => sum + parseFloat(set.weight), 0);
    const totalReps = recentSets.reduce((sum, set) => sum + parseInt(set.reps), 0);
    const averageWeight = recentSets.length > 0 ? totalWeight / recentSets.length : 0;
    const averageReps = recentSets.length > 0 ? totalReps / recentSets.length : 0;

    // Find best set (highest volume = weight * reps)
    let bestSet: { weight: string; reps: string; date: string } | null = null;
    let maxVolume = 0;

    for (const set of recentSets) {
      const volume = parseFloat(set.weight) * parseInt(set.reps);
      if (volume > maxVolume) {
        maxVolume = volume;
        bestSet = set;
      }
    }

    // Analyze performance trend (compare last 3 workouts to previous 3)
    let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';

    if (recentSets.length >= 6) {
      const recentVolume = recentSets
        .slice(0, 3)
        .reduce((sum, set) => sum + parseFloat(set.weight) * parseInt(set.reps), 0);
      const previousVolume = recentSets
        .slice(3, 6)
        .reduce((sum, set) => sum + parseFloat(set.weight) * parseInt(set.reps), 0);

      if (recentVolume > previousVolume * 1.05) {
        performanceTrend = 'improving';
      } else if (recentVolume < previousVolume * 0.95) {
        performanceTrend = 'declining';
      }
    }

    return {
      exerciseName,
      recentSets: recentSets.slice(0, limit),
      averageWeight,
      averageReps,
      bestSet,
      performanceTrend,
    };
  } catch (error) {
    console.error('Error getting exercise history:', error);
    return {
      exerciseName,
      recentSets: [],
      averageWeight: 0,
      averageReps: 0,
      bestSet: null,
      performanceTrend: 'stable',
    };
  }
};

/**
 * Build coaching context for AI - combines current session + historical data + user goals
 */
export const buildCoachingContext = async (
  exerciseName: string,
  currentWeight: string,
  currentReps: string,
  sessionPerformance?: {
    sets: Array<{ weight: string; reps: string }>;
    trend: 'improving' | 'declining' | 'stable';
  }
): Promise<string> => {
  const history = await getExerciseHistory(exerciseName);

  // Get user's primary goal
  const prefsStr = await AsyncStorage.getItem('@muscleup/preferences');
  const preferences = prefsStr ? JSON.parse(prefsStr) : {};
  const primaryGoal = preferences.primaryGoal || 'general_fitness';

  // Goal-specific coaching approach
  const goalContext: Record<string, string> = {
    muscle_gain: 'Focus on hypertrophy (8-12 reps, moderate weight, controlled tempo)',
    strength: 'Focus on strength (3-6 reps, heavy weight, progressive overload)',
    weight_loss: 'Focus on fat loss + muscle retention (higher volume, shorter rest)',
    athletic_performance: 'Focus on explosive power and conditioning',
    general_fitness: 'Focus on balanced health and wellness',
  };

  let context = `Exercise: ${exerciseName}\n`;
  context += `Current set: ${currentWeight}lbs × ${currentReps} reps\n`;
  context += `Primary Goal: ${goalContext[primaryGoal]}\n\n`;

  // Historical context
  if (history.recentSets.length > 0) {
    context += `Historical Performance:\n`;
    context += `- Average: ${history.averageWeight.toFixed(1)}lbs × ${history.averageReps.toFixed(
      1
    )} reps\n`;

    if (history.bestSet) {
      context += `- Best set: ${history.bestSet.weight}lbs × ${history.bestSet.reps} reps\n`;
    }

    context += `- Overall trend: ${history.performanceTrend}\n\n`;
  }

  // Current session context
  if (sessionPerformance && sessionPerformance.sets.length > 0) {
    context += `Today's Performance:\n`;
    sessionPerformance.sets.forEach((set, index) => {
      context += `- Set ${index + 1}: ${set.weight}lbs × ${set.reps} reps\n`;
    });
    context += `- Today's trend: ${sessionPerformance.trend}\n\n`;
  }

  // Goal-specific performance analysis
  const currentVolume = parseFloat(currentWeight) * parseInt(currentReps);
  const avgVolume = history.averageWeight * history.averageReps;
  const currentRepsNum = parseInt(currentReps);

  if (history.recentSets.length > 0) {
    if (currentVolume > avgVolume * 1.1) {
      context += `💪 Current set is 10%+ above average - great progress!\n`;
    } else if (currentVolume < avgVolume * 0.9) {
      context += `⚠️ Current set is 10%+ below average - may indicate fatigue.\n`;
    }

    // Goal-specific guidance
    if (primaryGoal === 'muscle_gain' && (currentRepsNum < 8 || currentRepsNum > 12)) {
      context += `💡 For muscle gain, aim for 8-12 reps. Adjust weight accordingly.\n`;
    } else if (primaryGoal === 'strength' && currentRepsNum > 6) {
      context += `💡 For strength, focus on heavier weight with 3-6 reps.\n`;
    } else if (primaryGoal === 'weight_loss' && currentRepsNum < 10) {
      context += `💡 For fat loss, higher reps (10-15) with moderate weight burns more calories.\n`;
    }
  }

  return context;
};
