/**
 * MuscleUp - React Native Fitness App
 * Phase 1: Core workout tracking with tab navigation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

// Colors
const colors = {
  primary: '#007AFF',
  secondary: '#00C853',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceDark: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  border: '#38383A',
  error: '#FF453A',
};

// ==================== HOME SCREEN ====================
function HomeScreen() {
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);

  useEffect(() => {
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('@muscleup/workout_history');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        setTotalWorkouts(history.length);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeek = history.filter((w: any) => new Date(w.date) >= weekAgo);
        setThisWeekWorkouts(thisWeek.length);
      }
    } catch (error) {
      console.error('Failed to load workout stats:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>MuscleUp</Text>
          <Text style={styles.subtitle}>Your Fitness Journey</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>{thisWeekWorkouts}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Getting Started</Text>
          <Text style={styles.infoText}>
            Tap the Workout tab to start logging your exercises. Your progress will be saved automatically!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== WORKOUT SCREEN ====================
interface Exercise {
  id: string;
  name: string;
  sets: { reps: string; weight: string }[];
}

function WorkoutScreen() {
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setStartTime(new Date());
    setExercises([]);
    setWorkoutName('');
  };

  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      sets: [{ reps: '', weight: '' }],
    };
    setExercises([...exercises, newExercise]);
  };

  const updateExerciseName = (id: string, name: string) => {
    setExercises(exercises.map((ex) => (ex.id === id ? { ...ex, name } : ex)));
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] } : ex
      )
    );
  };

  const updateSet = (exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((set, idx) => (idx === setIndex ? { ...set, [field]: value } : set)) }
          : ex
      )
    );
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const finishWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }
    try {
      const endTime = new Date();
      const duration = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : 0;
      const workout = {
        id: Date.now().toString(),
        name: workoutName,
        date: new Date().toISOString(),
        duration,
        exerciseCount: exercises.length,
        exercises,
      };
      const historyJson = await AsyncStorage.getItem('@muscleup/workout_history');
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.push(workout);
      await AsyncStorage.setItem('@muscleup/workout_history', JSON.stringify(history));
      Alert.alert('Success', 'Workout saved!', [
        { text: 'OK', onPress: () => { setIsWorkoutActive(false); setExercises([]); setWorkoutName(''); setStartTime(null); } },
      ]);
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const cancelWorkout = () => {
    Alert.alert('Cancel Workout', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => { setIsWorkoutActive(false); setExercises([]); setWorkoutName(''); setStartTime(null); } },
    ]);
  };

  if (!isWorkoutActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Ready to Work Out?</Text>
          <Text style={styles.subtitle}>Start a new workout session</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={startWorkout}>
            <Text style={styles.primaryButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={styles.workoutNameInput}
          placeholder="Workout Name (e.g., Push Day)"
          placeholderTextColor={colors.textTertiary}
          value={workoutName}
          onChangeText={setWorkoutName}
        />

        {exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={styles.exerciseNameInput}
                placeholder="Exercise name"
                placeholderTextColor={colors.textTertiary}
                value={exercise.name}
                onChangeText={(text) => updateExerciseName(exercise.id, text)}
              />
              <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                <Text style={{ color: colors.error }}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setsHeader}>
              <Text style={styles.setLabel}>Set</Text>
              <Text style={styles.setLabel}>Reps</Text>
              <Text style={styles.setLabel}>Weight</Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={set.reps}
                  onChangeText={(text) => updateSet(exercise.id, setIndex, 'reps', text)}
                />
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={set.weight}
                  onChangeText={(text) => updateSet(exercise.id, setIndex, 'weight', text)}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(exercise.id)}>
              <Text style={{ color: colors.primary }}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseButton} onPress={addExercise}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>+ Add Exercise</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelWorkout}>
            <Text style={{ color: colors.error }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
            <Text style={styles.primaryButtonText}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== SETTINGS SCREEN ====================
function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);

  const clearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to delete all workout history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('@muscleup/workout_history');
          Alert.alert('Success', 'Workout history cleared');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>

        <TouchableOpacity style={styles.dangerButton} onPress={clearHistory}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Clear Workout History</Text>
        </TouchableOpacity>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.aboutText}>MuscleUp v1.0.0</Text>
          <Text style={styles.aboutText}>Build 5</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== MAIN APP ====================
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ color, fontSize: size }}>⌂</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Workout"
            component={WorkoutScreen}
            options={{
              tabBarLabel: 'Workout',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ color, fontSize: size }}>💪</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ color, fontSize: size }}>⚙</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutNameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNameInput: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    marginRight: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    textAlign: 'center',
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    fontSize: 14,
  },
  addSetButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    marginTop: 8,
  },
  addExerciseButton: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  finishButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});

export default App;
