// Central type definitions

// Re-export types from services for convenience
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../services/auth';

export type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  ExerciseSearchResult,
  AIWorkoutPlanInput,
} from '../services/workouts';

export type {
  ExerciseType,
  ExerciseDBExercise,
} from '../services/exerciseDB';

// Nutrition types removed - meal logging feature deprecated

export type {
  WeightGoalType,
  UserGoals,
  GoalRecommendation,
  GoalRecommendationInput,
} from '../services/goals';

export type {
  WeightEntry,
} from '../services/progress';

// Additional shared types
import type { WorkoutSession as WS } from '../services/workouts';

export type CardioType = 'walk' | 'run' | 'bike' | 'swim' | 'other';

export interface CardioActivity {
  id: string;
  type: CardioType;
  duration: number; // in minutes
  distance?: number; // in miles/km
  date: string;
  notes?: string;
}

export interface DailyActivity {
  date: string;
  workouts: WS[];
  cardio?: CardioActivity[];
  weight?: number;
}

export interface ProgressStats {
  currentWeight: number;
  startWeight: number;
  weightChange: number;
  goalWeight?: number;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}
