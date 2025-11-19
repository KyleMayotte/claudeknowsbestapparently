// Fitness-related constants

export const FITNESS_GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Gain Strength',
  'Improve Endurance',
  'General Fitness',
  'Athletic Performance',
] as const;

export const EXPERIENCE_LEVELS = [
  { label: 'Beginner (0-1 years)', value: 'Beginner' },
  { label: 'Intermediate (1-3 years)', value: 'Intermediate' },
  { label: 'Advanced (3+ years)', value: 'Advanced' },
] as const;

export const EQUIPMENT_OPTIONS = [
  'Full Gym',
  'Home Gym',
  'Dumbbells Only',
  'Bodyweight Only',
] as const;

export const DAYS_PER_WEEK = [3, 4, 5, 6] as const;

export const WEIGHT_GOAL_TYPES = {
  LOSE: 'lose' as const,
  GAIN: 'gain' as const,
  MAINTAIN: 'maintain' as const,
};

export const WORKOUT_NAME_SUGGESTIONS = [
  'Push Day',
  'Pull Day',
  'Leg Day',
  'Upper Body',
  'Lower Body',
  'Full Body',
  'Chest & Triceps',
  'Back & Biceps',
  'Shoulders & Arms',
  'Core & Cardio',
  'HIIT Circuit',
  'Powerlifting Day',
  'Olympic Lifting',
  'CrossFit WOD',
  'Bodybuilding Pump',
  'Athletic Performance',
  'Functional Fitness',
] as const;

// Progress calculation
export const PROGRESS_THRESHOLDS = {
  LOW: 33,
  MEDIUM: 66,
  HIGH: 100,
};
