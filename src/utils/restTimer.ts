/**
 * Get default rest time in seconds based on exercise name
 * @param exerciseName - Name of the exercise
 * @param customDefault - User's custom default rest time (optional)
 */
export const getDefaultRestTime = (exerciseName: string, customDefault: number = 90): number => {
  const name = exerciseName.toLowerCase();

  // Heavy compound movements: 3 minutes
  if (
    name.includes('squat') ||
    name.includes('deadlift') ||
    name.includes('clean') ||
    name.includes('snatch')
  ) {
    return 180;
  }

  // Medium compounds: 2 minutes
  if (
    name.includes('bench') ||
    name.includes('press') && !name.includes('leg press') ||
    name.includes('row') ||
    name.includes('pull up') ||
    name.includes('chin up')
  ) {
    return 120;
  }

  // Accessories and isolation: 60 seconds
  if (
    name.includes('curl') ||
    name.includes('extension') ||
    name.includes('raise') ||
    name.includes('fly') ||
    name.includes('lateral') ||
    name.includes('tricep') ||
    name.includes('bicep') ||
    name.includes('calf') ||
    name.includes('shrug')
  ) {
    return 60;
  }

  // Use custom default or fallback to 90 seconds
  return customDefault;
};

/**
 * Format seconds into MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
