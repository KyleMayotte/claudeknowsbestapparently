// Personal Record (PR) Types

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // ISO date string
  workoutId: string;
  // One Rep Max estimate (using Epley formula: weight × (1 + reps/30))
  estimatedOneRepMax: number;
}

export interface PRComparison {
  exerciseName: string;
  yourBest: PersonalRecord | null;
  friendBest?: PersonalRecord | null;
  youAhead: boolean;
  difference: number; // Weight difference
}

export interface PRCelebration {
  exerciseName: string;
  newWeight: number;
  newReps: number;
  oldWeight?: number;
  oldReps?: number;
  improvement: string; // e.g., "+10 lbs" or "First PR!"
}
