// Progressive Overload Utility - Calculates weight progression between workouts
import { WorkoutPreferences, PrimaryGoal } from '../types/preferences';

interface SetData {
  reps: string;
  weight: string;
}

interface ProgressiveOverloadSuggestion {
  shouldProgress: boolean;
  suggestedWeight: number;
  reason: string;
}

/**
 * Get goal-specific weight increment multiplier
 */
const getGoalMultiplier = (goal: PrimaryGoal, currentReps: number, increaseAtReps: number): number => {
  switch (goal) {
    case 'strength':
      // Aggressive progression for strength (heavier weights, lower reps)
      return currentReps >= increaseAtReps + 2 ? 1.5 : 1.2; // Faster if crushing it
    case 'muscle_gain':
      // Standard progression for hypertrophy
      return 1.0;
    case 'weight_loss':
      // Conservative progression (focus on volume, not weight)
      return 0.75;
    case 'athletic_performance':
      // Moderate progression
      return 0.9;
    case 'general_fitness':
    default:
      // Standard progression
      return 1.0;
  }
};

/**
 * Determines if weight should be increased and suggests new weight
 * based on progressive overload preferences and primary goal.
 *
 * Uses "Best Set Rule": Looks at your best performing set to determine progression.
 * This accounts for natural fatigue in later sets while rewarding peak performance.
 *
 * @param previousSets - Array of sets from the previous workout for this exercise
 * @param preferences - User's workout preferences (threshold, increment, target rep range)
 * @returns Suggestion object with progression decision and reasoning
 */
export const calculateProgressiveOverload = (
  previousSets: SetData[],
  preferences: WorkoutPreferences
): ProgressiveOverloadSuggestion => {
  // Safety check: no previous data means no progression
  if (!previousSets || previousSets.length === 0) {
    return {
      shouldProgress: false,
      suggestedWeight: 0,
      reason: 'No previous workout data',
    };
  }

  const { progressiveOverloadConfig, unitSystem, primaryGoal = 'general_fitness' } = preferences;
  const { weightIncrement, increaseAtReps } = progressiveOverloadConfig;

  // Find the best performing set from previous workout
  // Prioritize: highest weight first, then highest reps
  const bestSet = previousSets.reduce((best, set) => {
    const reps = parseInt(set.reps) || 0;
    const weight = parseFloat(set.weight) || 0;
    const bestReps = parseInt(best.reps) || 0;
    const bestWeight = parseFloat(best.weight) || 0;

    // Higher weight wins, or if same weight, higher reps wins
    if (weight > bestWeight || (weight === bestWeight && reps > bestReps)) {
      return set;
    }
    return best;
  }, previousSets[0]);

  const currentReps = parseInt(bestSet.reps) || 0;
  const currentWeight = parseFloat(bestSet.weight) || 0;

  // Safety check: invalid data
  if (currentReps === 0 || currentWeight === 0) {
    return {
      shouldProgress: false,
      suggestedWeight: currentWeight,
      reason: 'Invalid previous workout data',
    };
  }

  // Check if we hit the threshold
  if (currentReps >= increaseAtReps) {
    // Apply goal-specific multiplier
    const multiplier = getGoalMultiplier(primaryGoal, currentReps, increaseAtReps);
    const adjustedIncrement = Math.round(weightIncrement * multiplier);
    const newWeight = currentWeight + adjustedIncrement;

    const goalNote = multiplier !== 1.0 ? ` (${primaryGoal} focus: ${adjustedIncrement > weightIncrement ? 'aggressive' : 'conservative'})` : '';

    return {
      shouldProgress: true,
      suggestedWeight: newWeight,
      reason: `Hit ${currentReps} reps at ${currentWeight} ${unitSystem} (threshold: ${increaseAtReps})${goalNote}`,
    };
  }

  // No progression yet - keep working at current weight
  return {
    shouldProgress: false,
    suggestedWeight: currentWeight,
    reason: `Keep working at ${currentWeight} ${unitSystem} (${currentReps}/${increaseAtReps} reps)`,
  };
};
