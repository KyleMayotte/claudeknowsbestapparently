import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonalRecord, PRCelebration } from '../types/pr';

const PR_STORAGE_KEY = '@muscleup/personal_records';

/**
 * Calculate estimated one-rep max using Epley formula
 * Formula: weight × (1 + reps/30)
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Compare two PRs to determine which is better
 * Returns true if pr1 is better than pr2
 */
export function isBetterPR(pr1: PersonalRecord, pr2: PersonalRecord): boolean {
  return pr1.estimatedOneRepMax > pr2.estimatedOneRepMax;
}

/**
 * Check if a set is a new PR for the given exercise
 */
export async function checkForNewPR(
  exerciseName: string,
  weight: number,
  reps: number,
  workoutId: string,
  date: string
): Promise<{ isNewPR: boolean; celebration?: PRCelebration; newPR?: PersonalRecord }> {
  try {
    const prs = await loadPRs();
    const existingPR = prs.find(pr => pr.exerciseName.toLowerCase() === exerciseName.toLowerCase());

    const newOneRepMax = calculateOneRepMax(weight, reps);

    // If no existing PR, this is automatically a new PR
    if (!existingPR) {
      const newPR: PersonalRecord = {
        exerciseName,
        weight,
        reps,
        date,
        workoutId,
        estimatedOneRepMax: newOneRepMax,
      };

      const celebration: PRCelebration = {
        exerciseName,
        newWeight: weight,
        newReps: reps,
        improvement: 'First PR! 🎉',
      };

      return { isNewPR: true, celebration, newPR };
    }

    // Check if new PR is better than existing
    if (newOneRepMax > existingPR.estimatedOneRepMax) {
      const newPR: PersonalRecord = {
        exerciseName,
        weight,
        reps,
        date,
        workoutId,
        estimatedOneRepMax: newOneRepMax,
      };

      const weightDiff = weight - existingPR.weight;
      const improvement = weightDiff > 0
        ? `+${weightDiff} lbs`
        : `${reps - existingPR.reps} more reps`;

      const celebration: PRCelebration = {
        exerciseName,
        newWeight: weight,
        newReps: reps,
        oldWeight: existingPR.weight,
        oldReps: existingPR.reps,
        improvement,
      };

      return { isNewPR: true, celebration, newPR };
    }

    return { isNewPR: false };
  } catch (error) {
    console.error('Error checking for PR:', error);
    return { isNewPR: false };
  }
}

/**
 * Save a new PR
 */
export async function savePR(pr: PersonalRecord): Promise<void> {
  try {
    const prs = await loadPRs();

    // Remove old PR for this exercise if it exists
    const filteredPRs = prs.filter(
      p => p.exerciseName.toLowerCase() !== pr.exerciseName.toLowerCase()
    );

    // Add new PR
    const updatedPRs = [...filteredPRs, pr];

    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(updatedPRs));
  } catch (error) {
    console.error('Error saving PR:', error);
    throw error;
  }
}

/**
 * Load all PRs
 */
export async function loadPRs(): Promise<PersonalRecord[]> {
  try {
    const data = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading PRs:', error);
    return [];
  }
}

/**
 * Get PR for a specific exercise
 */
export async function getPRForExercise(exerciseName: string): Promise<PersonalRecord | null> {
  try {
    const prs = await loadPRs();
    return prs.find(pr => pr.exerciseName.toLowerCase() === exerciseName.toLowerCase()) || null;
  } catch (error) {
    console.error('Error getting PR for exercise:', error);
    return null;
  }
}

/**
 * Get all PRs sorted by estimated 1RM (strongest first)
 */
export async function getTopPRs(limit: number = 10): Promise<PersonalRecord[]> {
  try {
    const prs = await loadPRs();
    return prs
      .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top PRs:', error);
    return [];
  }
}

/**
 * Delete all PRs (for testing/reset)
 */
export async function clearAllPRs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PR_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing PRs:', error);
    throw error;
  }
}
