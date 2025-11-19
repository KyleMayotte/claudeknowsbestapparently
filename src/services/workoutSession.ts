// Workout Session State Management
// Tracks active workout state for Atlas AI proactive coaching
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveWorkoutSession {
  workoutId: string;
  workoutName: string;
  emoji: string;
  startTime: string; // ISO string
  currentExercise?: {
    id: string;
    name: string;
    currentSet: number;
    totalSets: number;
  };
  lastSetCompleted?: {
    exerciseName: string;
    weight: string;
    reps: string;
    timestamp: string; // ISO string
  };
  totalSetsCompleted: number;
  totalVolume: number; // weight * reps accumulated
  latestAtlasTip?: {
    message: string;
    timestamp: string; // ISO string
    tipId: string; // Unique ID to track dismissals
  };
  dismissedTips: string[]; // Array of dismissed tip IDs to avoid repetition
  exercisePerformance: {
    [exerciseName: string]: {
      sets: Array<{ weight: string; reps: string; timestamp: string }>;
      performanceTrend: 'improving' | 'declining' | 'stable';
    };
  };
}

export interface WorkoutSessionContext {
  isActive: boolean;
  session: ActiveWorkoutSession | null;
}

const SESSION_STORAGE_KEY = '@muscleup/active_workout_session';

/**
 * Save the current active workout session
 */
export const saveWorkoutSession = async (
  session: ActiveWorkoutSession
): Promise<void> => {
  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving workout session:', error);
  }
};

/**
 * Get the current active workout session
 */
export const getWorkoutSession = async (): Promise<WorkoutSessionContext> => {
  try {
    const sessionStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionStr) {
      return { isActive: false, session: null };
    }

    const session: ActiveWorkoutSession = JSON.parse(sessionStr);

    // Check if session is stale (>3 hours old)
    const startTime = new Date(session.startTime);
    const now = new Date();
    const hoursSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceStart > 3) {
      // Session expired, clear it
      await clearWorkoutSession();
      return { isActive: false, session: null };
    }

    return { isActive: true, session };
  } catch (error) {
    console.error('Error getting workout session:', error);
    return { isActive: false, session: null };
  }
};

/**
 * Clear the active workout session (when workout completes or is cancelled)
 */
export const clearWorkoutSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing workout session:', error);
  }
};

/**
 * Update current exercise in session
 */
export const updateCurrentExercise = async (
  exerciseId: string,
  exerciseName: string,
  currentSet: number,
  totalSets: number
): Promise<void> => {
  try {
    const context = await getWorkoutSession();
    if (context.isActive && context.session) {
      context.session.currentExercise = {
        id: exerciseId,
        name: exerciseName,
        currentSet,
        totalSets,
      };
      await saveWorkoutSession(context.session);
    }
  } catch (error) {
    console.error('Error updating current exercise:', error);
  }
};

/**
 * Record a completed set and track exercise performance
 */
export const recordCompletedSet = async (
  exerciseName: string,
  weight: string,
  reps: string
): Promise<void> => {
  try {
    const context = await getWorkoutSession();
    if (context.isActive && context.session) {
      const volume = parseFloat(weight) * parseFloat(reps);
      const timestamp = new Date().toISOString();

      context.session.lastSetCompleted = {
        exerciseName,
        weight,
        reps,
        timestamp,
      };
      context.session.totalSetsCompleted += 1;
      context.session.totalVolume += isNaN(volume) ? 0 : volume;

      // Track exercise-specific performance
      if (!context.session.exercisePerformance[exerciseName]) {
        context.session.exercisePerformance[exerciseName] = {
          sets: [],
          performanceTrend: 'stable',
        };
      }

      context.session.exercisePerformance[exerciseName].sets.push({
        weight,
        reps,
        timestamp,
      });

      // Analyze performance trend for this exercise
      const sets = context.session.exercisePerformance[exerciseName].sets;
      if (sets.length >= 2) {
        const lastSet = sets[sets.length - 1];
        const previousSet = sets[sets.length - 2];
        const lastReps = parseInt(lastSet.reps);
        const prevReps = parseInt(previousSet.reps);

        if (lastReps < prevReps - 1) {
          context.session.exercisePerformance[exerciseName].performanceTrend = 'declining';
        } else if (lastReps > prevReps) {
          context.session.exercisePerformance[exerciseName].performanceTrend = 'improving';
        } else {
          context.session.exercisePerformance[exerciseName].performanceTrend = 'stable';
        }
      }

      await saveWorkoutSession(context.session);
    }
  } catch (error) {
    console.error('Error recording completed set:', error);
  }
};

/**
 * Save Atlas coaching tip to session (for banner display)
 */
export const saveAtlasTip = async (message: string, tipId?: string): Promise<void> => {
  try {
    const context = await getWorkoutSession();
    if (context.isActive && context.session) {
      const generatedTipId = tipId || `tip_${Date.now()}`;

      // Don't show if this tip was already dismissed
      if (context.session.dismissedTips.includes(generatedTipId)) {
        return;
      }

      context.session.latestAtlasTip = {
        message,
        timestamp: new Date().toISOString(),
        tipId: generatedTipId,
      };
      await saveWorkoutSession(context.session);
    }
  } catch (error) {
    console.error('Error saving Atlas tip:', error);
  }
};

/**
 * Dismiss current tip and prevent it from showing again
 */
export const dismissAtlasTip = async (): Promise<void> => {
  try {
    const context = await getWorkoutSession();
    if (context.isActive && context.session && context.session.latestAtlasTip) {
      const tipId = context.session.latestAtlasTip.tipId;

      if (!context.session.dismissedTips.includes(tipId)) {
        context.session.dismissedTips.push(tipId);
      }

      context.session.latestAtlasTip = undefined;
      await saveWorkoutSession(context.session);
    }
  } catch (error) {
    console.error('Error dismissing Atlas tip:', error);
  }
};
