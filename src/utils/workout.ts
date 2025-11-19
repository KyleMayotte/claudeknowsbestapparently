// Workout utility functions

import { WorkoutSession, Exercise } from '../services/workouts';

/**
 * Calculate weekly workout count
 */
export const calculateWeeklyWorkoutCount = (
  sessions: WorkoutSession[],
  startDate: Date
): number => {
  const weekAgo = new Date(startDate);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return sessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= weekAgo && sessionDate <= startDate;
  }).length;
};

/**
 * Calculate workout progress percentage
 */
export const calculateWorkoutProgress = (
  completedWorkouts: number,
  goalWorkouts: number
): number => {
  if (goalWorkouts === 0) return 0;
  return Math.round((completedWorkouts / goalWorkouts) * 100);
};

/**
 * Format exercise for display
 */
export const formatExercise = (exercise: Exercise): string => {
  if (exercise.sets && exercise.reps) {
    return `${exercise.name} - ${exercise.sets}x${exercise.reps}`;
  }
  return exercise.name;
};

/**
 * Validate exercise data
 */
export const validateExercise = (exercise: Exercise): boolean => {
  return exercise.name.trim().length > 0;
};

/**
 * Calculate total sets in workout
 */
export const calculateTotalSets = (exercises: Exercise[]): number => {
  return exercises.reduce((total, exercise) => {
    return total + (exercise.sets || 0);
  }, 0);
};

/**
 * Compare exercises between sessions
 */
export const compareExercises = (
  current: Exercise,
  previous: Exercise | undefined
): {
  isImproved: boolean;
  difference?: number;
} => {
  if (!previous || !current.weight || !previous.weight) {
    return { isImproved: false };
  }

  const difference = current.weight - previous.weight;
  return {
    isImproved: difference > 0,
    difference,
  };
};
