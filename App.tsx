/**
 * MuscleUp - React Native Fitness App
 * Phase 2: Workout templates, categories, and improved UI
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
  Modal,
  FlatList,
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
  surfaceLight: '#3A3A3C',
  textPrimary: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  border: '#38383A',
  error: '#FF453A',
  success: '#30D158',
};

// Storage keys
const TEMPLATES_KEY = '@muscleup/workout_templates';
const HISTORY_KEY = '@muscleup/workout_history';
const CATEGORIES_KEY = '@muscleup/categories';

// Types
interface Set {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface WorkoutTemplate {
  id: string;
  name: string;
  emoji: string;
  category?: string;
  exercises: Exercise[];
}

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string;
  duration: number;
  exercises: Exercise[];
}

// Default templates
const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: '1',
    name: 'Push',
    emoji: '🔥',
    category: 'Push Pull Legs',
    exercises: [
      { id: '1-1', name: 'Bench Press', sets: [{ id: '1-1-1', reps: '', weight: '', completed: false }, { id: '1-1-2', reps: '', weight: '', completed: false }, { id: '1-1-3', reps: '', weight: '', completed: false }] },
      { id: '1-2', name: 'Overhead Press', sets: [{ id: '1-2-1', reps: '', weight: '', completed: false }, { id: '1-2-2', reps: '', weight: '', completed: false }, { id: '1-2-3', reps: '', weight: '', completed: false }] },
      { id: '1-3', name: 'Incline Dumbbell Press', sets: [{ id: '1-3-1', reps: '', weight: '', completed: false }, { id: '1-3-2', reps: '', weight: '', completed: false }, { id: '1-3-3', reps: '', weight: '', completed: false }] },
      { id: '1-4', name: 'Tricep Extensions', sets: [{ id: '1-4-1', reps: '', weight: '', completed: false }, { id: '1-4-2', reps: '', weight: '', completed: false }, { id: '1-4-3', reps: '', weight: '', completed: false }] },
      { id: '1-5', name: 'Lateral Raises', sets: [{ id: '1-5-1', reps: '', weight: '', completed: false }, { id: '1-5-2', reps: '', weight: '', completed: false }, { id: '1-5-3', reps: '', weight: '', completed: false }] },
    ],
  },
  {
    id: '2',
    name: 'Pull',
    emoji: '💪',
    category: 'Push Pull Legs',
    exercises: [
      { id: '2-1', name: 'Pull-ups', sets: [{ id: '2-1-1', reps: '', weight: '', completed: false }, { id: '2-1-2', reps: '', weight: '', completed: false }, { id: '2-1-3', reps: '', weight: '', completed: false }] },
      { id: '2-2', name: 'Barbell Rows', sets: [{ id: '2-2-1', reps: '', weight: '', completed: false }, { id: '2-2-2', reps: '', weight: '', completed: false }, { id: '2-2-3', reps: '', weight: '', completed: false }] },
      { id: '2-3', name: 'Face Pulls', sets: [{ id: '2-3-1', reps: '', weight: '', completed: false }, { id: '2-3-2', reps: '', weight: '', completed: false }, { id: '2-3-3', reps: '', weight: '', completed: false }] },
      { id: '2-4', name: 'Hammer Curls', sets: [{ id: '2-4-1', reps: '', weight: '', completed: false }, { id: '2-4-2', reps: '', weight: '', completed: false }, { id: '2-4-3', reps: '', weight: '', completed: false }] },
      { id: '2-5', name: 'Preacher Curls', sets: [{ id: '2-5-1', reps: '', weight: '', completed: false }, { id: '2-5-2', reps: '', weight: '', completed: false }, { id: '2-5-3', reps: '', weight: '', completed: false }] },
    ],
  },
  {
    id: '3',
    name: 'Legs',
    emoji: '🦵',
    category: 'Push Pull Legs',
    exercises: [
      { id: '3-1', name: 'Squats', sets: [{ id: '3-1-1', reps: '', weight: '', completed: false }, { id: '3-1-2', reps: '', weight: '', completed: false }, { id: '3-1-3', reps: '', weight: '', completed: false }] },
      { id: '3-2', name: 'Romanian Deadlift', sets: [{ id: '3-2-1', reps: '', weight: '', completed: false }, { id: '3-2-2', reps: '', weight: '', completed: false }, { id: '3-2-3', reps: '', weight: '', completed: false }] },
      { id: '3-3', name: 'Leg Press', sets: [{ id: '3-3-1', reps: '', weight: '', completed: false }, { id: '3-3-2', reps: '', weight: '', completed: false }, { id: '3-3-3', reps: '', weight: '', completed: false }] },
      { id: '3-4', name: 'Leg Curls', sets: [{ id: '3-4-1', reps: '', weight: '', completed: false }, { id: '3-4-2', reps: '', weight: '', completed: false }, { id: '3-4-3', reps: '', weight: '', completed: false }] },
      { id: '3-5', name: 'Calf Raises', sets: [{ id: '3-5-1', reps: '', weight: '', completed: false }, { id: '3-5-2', reps: '', weight: '', completed: false }, { id: '3-5-3', reps: '', weight: '', completed: false }] },
    ],
  },
];

// Emoji options for workouts
const EMOJI_OPTIONS = ['🔥', '💪', '🦵', '🏋️', '⚡', '🎯', '💥', '🚀', '⭐', '🏆', '❤️', '🌟'];

// ==================== HOME SCREEN ====================
function HomeScreen() {
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutHistory[]>([]);

  useEffect(() => {
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyJson) {
        const history: WorkoutHistory[] = JSON.parse(historyJson);
        setTotalWorkouts(history.length);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeek = history.filter((w) => new Date(w.date) >= weekAgo);
        setThisWeekWorkouts(thisWeek.length);
        setRecentWorkouts(history.slice(-5).reverse());
      }
    } catch (error) {
      console.error('Failed to load workout stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {recentWorkouts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No workouts yet. Start your first workout!</Text>
            </View>
          ) : (
            recentWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutHistoryCard}>
                <View style={styles.workoutHistoryInfo}>
                  <Text style={styles.workoutHistoryEmoji}>{workout.emoji}</Text>
                  <View>
                    <Text style={styles.workoutHistoryName}>{workout.templateName}</Text>
                    <Text style={styles.workoutHistoryDate}>{formatDate(workout.date)}</Text>
                  </View>
                </View>
                <Text style={styles.workoutHistoryDuration}>{formatDuration(workout.duration)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== WORKOUT SCREEN ====================
function WorkoutScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>(['Push Pull Legs']);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Add workout modal state
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutEmoji, setNewWorkoutEmoji] = useState('🔥');
  const [newWorkoutCategory, setNewWorkoutCategory] = useState('');
  const [newExercises, setNewExercises] = useState<Exercise[]>([]);
  const [currentExerciseName, setCurrentExerciseName] = useState('');

  // Category modal state
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      const stored = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        setTemplates(DEFAULT_TEMPLATES);
        await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(DEFAULT_TEMPLATES);
    }
  };

  const loadCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem(CATEGORIES_KEY);
      if (stored) {
        setCategories(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const saveTemplates = async (newTemplates: WorkoutTemplate[]) => {
    setTemplates(newTemplates);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(newTemplates));
  };

  const saveCategories = async (newCategories: string[]) => {
    setCategories(newCategories);
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
  };

  const startWorkout = (template: WorkoutTemplate) => {
    // Deep clone the template with fresh set IDs
    const workoutCopy: WorkoutTemplate = {
      ...template,
      exercises: template.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((set) => ({ ...set, completed: false })),
      })),
    };
    setActiveWorkout(workoutCopy);
    setStartTime(new Date());
  };

  const updateSet = (exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((set, idx) => (idx === setIndex ? { ...set, [field]: value } : set)) }
          : ex
      ),
    });
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((set, idx) => (idx === setIndex ? { ...set, completed: !set.completed } : set)) }
          : ex
      ),
    });
  };

  const addSetToExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { id: `${exerciseId}-${ex.sets.length + 1}`, reps: '', weight: '', completed: false }] }
          : ex
      ),
    });
  };

  const finishWorkout = async () => {
    if (!activeWorkout || !startTime) return;

    // Check for incomplete sets
    const hasData = activeWorkout.exercises.some((ex) =>
      ex.sets.some((set) => set.reps || set.weight)
    );

    if (!hasData) {
      Alert.alert('Empty Workout', 'Please log at least one set before finishing.');
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const workoutRecord: WorkoutHistory = {
        id: Date.now().toString(),
        templateId: activeWorkout.id,
        templateName: activeWorkout.name,
        emoji: activeWorkout.emoji,
        date: new Date().toISOString(),
        duration,
        exercises: activeWorkout.exercises,
      };

      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.push(workoutRecord);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

      Alert.alert('Workout Complete! 🎉', `Duration: ${duration} minutes`, [
        { text: 'OK', onPress: () => { setActiveWorkout(null); setStartTime(null); } },
      ]);
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const cancelWorkout = () => {
    Alert.alert('Cancel Workout', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => { setActiveWorkout(null); setStartTime(null); } },
    ]);
  };

  // Add workout modal functions
  const resetAddModal = () => {
    setNewWorkoutName('');
    setNewWorkoutEmoji('🔥');
    setNewWorkoutCategory('');
    setNewExercises([]);
    setCurrentExerciseName('');
  };

  const addExerciseToNew = () => {
    if (!currentExerciseName.trim()) return;
    const newEx: Exercise = {
      id: Date.now().toString(),
      name: currentExerciseName.trim(),
      sets: [
        { id: `${Date.now()}-1`, reps: '', weight: '', completed: false },
        { id: `${Date.now()}-2`, reps: '', weight: '', completed: false },
        { id: `${Date.now()}-3`, reps: '', weight: '', completed: false },
      ],
    };
    setNewExercises([...newExercises, newEx]);
    setCurrentExerciseName('');
  };

  const removeExerciseFromNew = (id: string) => {
    setNewExercises(newExercises.filter((ex) => ex.id !== id));
  };

  const saveNewWorkout = async () => {
    if (!newWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    if (newExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name: newWorkoutName.trim(),
      emoji: newWorkoutEmoji,
      category: newWorkoutCategory || undefined,
      exercises: newExercises,
    };

    await saveTemplates([...templates, newTemplate]);
    resetAddModal();
    setShowAddModal(false);
  };

  const deleteTemplate = (templateId: string) => {
    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saveTemplates(templates.filter((t) => t.id !== templateId));
        },
      },
    ]);
  };

  // Category modal functions
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }
    await saveCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName('');
  };

  const deleteCategory = async (category: string) => {
    Alert.alert('Delete Category', `Delete "${category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saveCategories(categories.filter((c) => c !== category));
          if (selectedCategory === category) setSelectedCategory(null);
        },
      },
    ]);
  };

  // Get filtered templates
  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  // Active workout view
  if (activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.activeWorkoutHeader}>
            <View>
              <Text style={styles.activeWorkoutEmoji}>{activeWorkout.emoji}</Text>
              <Text style={styles.activeWorkoutName}>{activeWorkout.name}</Text>
            </View>
          </View>

          {activeWorkout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseCardName}>{exercise.name}</Text>

              <View style={styles.setsHeader}>
                <Text style={styles.setLabel}>Set</Text>
                <Text style={styles.setLabel}>Reps</Text>
                <Text style={styles.setLabel}>Weight</Text>
                <Text style={styles.setLabel}>✓</Text>
              </View>

              {exercise.sets.map((set, setIndex) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{setIndex + 1}</Text>
                  <TextInput
                    style={[styles.setInput, set.completed && styles.setInputCompleted]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(text) => updateSet(exercise.id, setIndex, 'reps', text)}
                  />
                  <TextInput
                    style={[styles.setInput, set.completed && styles.setInputCompleted]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    value={set.weight}
                    onChangeText={(text) => updateSet(exercise.id, setIndex, 'weight', text)}
                  />
                  <TouchableOpacity
                    style={[styles.checkButton, set.completed && styles.checkButtonCompleted]}
                    onPress={() => toggleSetComplete(exercise.id, setIndex)}
                  >
                    <Text style={styles.checkButtonText}>{set.completed ? '✓' : ''}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addSetButton} onPress={() => addSetToExercise(exercise.id)}>
                <Text style={{ color: colors.primary }}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

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

  // Template selection view
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Workouts</Text>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.categoryChipManage} onPress={() => setShowCategoryModal(true)}>
            <Text style={styles.categoryChipText}>⚙️</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Workout Templates */}
        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No workouts found. Create your first workout!</Text>
          </View>
        ) : (
          filteredTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => startWorkout(template)}
              onLongPress={() => deleteTemplate(template.id)}
            >
              <View style={styles.templateInfo}>
                <Text style={styles.templateEmoji}>{template.emoji}</Text>
                <View>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateExercises}>{template.exercises.length} exercises</Text>
                </View>
              </View>
              <Text style={styles.templateArrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Add Workout Button */}
        <TouchableOpacity style={styles.addWorkoutButton} onPress={() => setShowAddModal(true)}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>+ Create New Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Workout Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { resetAddModal(); setShowAddModal(false); }}>
              <Text style={{ color: colors.error }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Workout</Text>
            <TouchableOpacity onPress={saveNewWorkout}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Workout Name */}
            <Text style={styles.inputLabel}>Workout Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Upper Body, Leg Day"
              placeholderTextColor={colors.textTertiary}
              value={newWorkoutName}
              onChangeText={setNewWorkoutName}
            />

            {/* Emoji Selection */}
            <Text style={styles.inputLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiOption, newWorkoutEmoji === emoji && styles.emojiOptionSelected]}
                  onPress={() => setNewWorkoutEmoji(emoji)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category */}
            <Text style={styles.inputLabel}>Category (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Push Pull Legs"
              placeholderTextColor={colors.textTertiary}
              value={newWorkoutCategory}
              onChangeText={setNewWorkoutCategory}
            />

            {/* Add Exercise */}
            <Text style={styles.inputLabel}>Exercises</Text>
            <View style={styles.addExerciseRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Exercise name"
                placeholderTextColor={colors.textTertiary}
                value={currentExerciseName}
                onChangeText={setCurrentExerciseName}
                onSubmitEditing={addExerciseToNew}
              />
              <TouchableOpacity style={styles.addExerciseBtn} onPress={addExerciseToNew}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Exercise List */}
            {newExercises.map((ex, idx) => (
              <View key={ex.id} style={styles.newExerciseItem}>
                <Text style={styles.newExerciseText}>{idx + 1}. {ex.name}</Text>
                <TouchableOpacity onPress={() => removeExerciseFromNew(ex.id)}>
                  <Text style={{ color: colors.error, fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={{ color: colors.primary }}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Categories</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Add Category */}
            <View style={styles.addExerciseRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="New category name"
                placeholderTextColor={colors.textTertiary}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={addCategory}
              />
              <TouchableOpacity style={styles.addExerciseBtn} onPress={addCategory}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Category List */}
            {categories.map((cat) => (
              <View key={cat} style={styles.newExerciseItem}>
                <Text style={styles.newExerciseText}>{cat}</Text>
                <TouchableOpacity onPress={() => deleteCategory(cat)}>
                  <Text style={{ color: colors.error, fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
          await AsyncStorage.removeItem(HISTORY_KEY);
          Alert.alert('Success', 'Workout history cleared');
        },
      },
    ]);
  };

  const resetTemplates = () => {
    Alert.alert('Reset Templates', 'Reset all workout templates to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
          Alert.alert('Success', 'Templates reset to defaults');
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

        <TouchableOpacity style={styles.dangerButton} onPress={resetTemplates}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Reset Workout Templates</Text>
        </TouchableOpacity>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.aboutText}>MuscleUp v1.0.0</Text>
          <Text style={styles.aboutText}>Build 6</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
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
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  workoutHistoryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutHistoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutHistoryEmoji: {
    fontSize: 24,
  },
  workoutHistoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  workoutHistoryDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  workoutHistoryDuration: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipManage: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  templateCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateEmoji: {
    fontSize: 28,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  templateExercises: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  templateArrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  addWorkoutButton: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  activeWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  activeWorkoutEmoji: {
    fontSize: 32,
  },
  activeWorkoutName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  exerciseCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
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
  setInputCompleted: {
    backgroundColor: colors.success + '30',
  },
  checkButton: {
    flex: 1,
    height: 32,
    backgroundColor: colors.surfaceDark,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  checkButtonCompleted: {
    backgroundColor: colors.success,
  },
  checkButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  addSetButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    marginTop: 8,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiScroll: {
    marginBottom: 8,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emojiOptionSelected: {
    backgroundColor: colors.primary,
  },
  emojiOptionText: {
    fontSize: 20,
  },
  addExerciseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addExerciseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  newExerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  newExerciseText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});

export default App;
