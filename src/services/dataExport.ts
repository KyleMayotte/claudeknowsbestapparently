import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string;
  duration: number;
  exercises: {
    id: string;
    name: string;
    sets: {
      id: string;
      reps: string;
      weight: string;
      completed: boolean;
      notes?: string;
    }[];
  }[];
}

/**
 * Format workout history as CSV
 * Columns: Date, Workout, Exercise, Set, Reps, Weight, Volume, Notes
 */
export const exportToCSV = (workoutHistory: WorkoutHistory[], unitSystem: 'lbs' | 'kg' = 'lbs'): string => {
  const header = `Date,Time,Workout,Exercise,Set,Reps,Weight(${unitSystem}),Volume(${unitSystem}),Duration(min),Notes\n`;

  const rows = workoutHistory.flatMap(workout => {
    const workoutDate = new Date(workout.date);
    const dateStr = workoutDate.toLocaleDateString('en-US');
    const timeStr = workoutDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return workout.exercises.flatMap(exercise =>
      exercise.sets
        .filter(set => set.completed) // Only export completed sets
        .map((set, index) => {
          const reps = parseInt(set.reps) || 0;
          const weight = parseFloat(set.weight) || 0;
          const volume = reps * weight;
          const notes = set.notes ? `"${set.notes.replace(/"/g, '""')}"` : ''; // Escape quotes

          return `${dateStr},${timeStr},"${workout.templateName}","${exercise.name}",${index + 1},${reps},${weight},${volume},${workout.duration},${notes}`;
        })
    );
  });

  return header + rows.join('\n');
};

/**
 * Format workout history as JSON
 * Returns full workout data structure
 */
export const exportToJSON = (workoutHistory: WorkoutHistory[]): string => {
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalWorkouts: workoutHistory.length,
    workouts: workoutHistory.map(workout => ({
      id: workout.id,
      name: workout.templateName,
      emoji: workout.emoji,
      date: workout.date,
      duration: workout.duration,
      exercises: workout.exercises.map(exercise => ({
        name: exercise.name,
        sets: exercise.sets
          .filter(set => set.completed)
          .map(set => ({
            reps: set.reps,
            weight: set.weight,
            notes: set.notes,
          })),
      })),
    })),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Load workout history from AsyncStorage
 */
export const loadWorkoutHistory = async (userEmail: string): Promise<WorkoutHistory[]> => {
  try {
    const HISTORY_STORAGE_KEY = `@muscleup/workout_history_${userEmail}`;
    const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

    if (storedHistory) {
      return JSON.parse(storedHistory);
    }

    return [];
  } catch (error) {
    console.error('Failed to load workout history:', error);
    throw new Error('Could not load workout data');
  }
};

/**
 * Export workout history as CSV and share
 */
export const exportAndShareCSV = async (userEmail: string, unitSystem: 'lbs' | 'kg' = 'lbs'): Promise<void> => {
  try {
    // Load workout history
    const workoutHistory = await loadWorkoutHistory(userEmail);

    if (workoutHistory.length === 0) {
      throw new Error('No workout data to export');
    }

    // Generate CSV content
    const csvContent = exportToCSV(workoutHistory, unitSystem);

    // Create filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MuscleUp_Workouts_${dateStr}.csv`;
    const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

    // Write file to cache directory
    await RNFS.writeFile(filePath, csvContent, 'utf8');

    // Share file
    await Share.open({
      title: 'Export Workout Data',
      message: `MuscleUp workout history (${workoutHistory.length} workouts)`,
      url: `file://${filePath}`,
      type: 'text/csv',
      subject: 'MuscleUp Workout Export',
    });

    // Clean up file after sharing
    setTimeout(async () => {
      try {
        await RNFS.unlink(filePath);
      } catch (err) {
        console.log('Could not delete temp file:', err);
      }
    }, 5000);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw error;
  }
};

/**
 * Export workout history as JSON and share
 */
export const exportAndShareJSON = async (userEmail: string): Promise<void> => {
  try {
    // Load workout history
    const workoutHistory = await loadWorkoutHistory(userEmail);

    if (workoutHistory.length === 0) {
      throw new Error('No workout data to export');
    }

    // Generate JSON content
    const jsonContent = exportToJSON(workoutHistory);

    // Create filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MuscleUp_Backup_${dateStr}.json`;
    const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

    // Write file to cache directory
    await RNFS.writeFile(filePath, jsonContent, 'utf8');

    // Share file
    await Share.open({
      title: 'Export Workout Data',
      message: `MuscleUp full backup (${workoutHistory.length} workouts)`,
      url: `file://${filePath}`,
      type: 'application/json',
      subject: 'MuscleUp Data Backup',
    });

    // Clean up file after sharing
    setTimeout(async () => {
      try {
        await RNFS.unlink(filePath);
      } catch (err) {
        console.log('Could not delete temp file:', err);
      }
    }, 5000);
  } catch (error) {
    console.error('Failed to export JSON:', error);
    throw error;
  }
};

/**
 * Get export statistics
 */
export const getExportStats = async (userEmail: string): Promise<{
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  dateRange: { earliest: string; latest: string } | null;
}> => {
  try {
    const workoutHistory = await loadWorkoutHistory(userEmail);

    if (workoutHistory.length === 0) {
      return {
        totalWorkouts: 0,
        totalExercises: 0,
        totalSets: 0,
        dateRange: null,
      };
    }

    const totalExercises = workoutHistory.reduce(
      (sum, workout) => sum + workout.exercises.length,
      0
    );

    const totalSets = workoutHistory.reduce(
      (sum, workout) =>
        sum +
        workout.exercises.reduce(
          (exSum, exercise) =>
            exSum + exercise.sets.filter(set => set.completed).length,
          0
        ),
      0
    );

    const dates = workoutHistory.map(w => new Date(w.date).getTime()).sort();
    const earliest = new Date(dates[0]).toLocaleDateString();
    const latest = new Date(dates[dates.length - 1]).toLocaleDateString();

    return {
      totalWorkouts: workoutHistory.length,
      totalExercises,
      totalSets,
      dateRange: { earliest, latest },
    };
  } catch (error) {
    console.error('Failed to get export stats:', error);
    return {
      totalWorkouts: 0,
      totalExercises: 0,
      totalSets: 0,
      dateRange: null,
    };
  }
};
