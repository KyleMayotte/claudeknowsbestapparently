import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../theme';
import { Card } from '../components';
import {
  generateWorkoutProgram,
  convertProgramToTemplates,
  type ProgramGeneratorInput,
  type GeneratedProgram,
  type UserContext,
} from '../services/programGenerator';
import { saveWorkoutTemplate } from '../services/exercise';
import { useAuthContext } from '../context/AuthContext';
import { usePreferences } from '../hooks/usePreferences';

interface Props {
  navigation: any;
}

const ProgramGeneratorScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthContext();
  const { preferences } = usePreferences();
  const [goal, setGoal] = useState<ProgramGeneratorInput['goal']>('build_muscle');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [trainingLocation, setTrainingLocation] = useState<ProgramGeneratorInput['trainingLocation']>('full_gym');
  const [timePerSession, setTimePerSession] = useState<ProgramGeneratorInput['timePerSession']>('45-60');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refinementRequest, setRefinementRequest] = useState('');

  const goals: Array<{ value: ProgramGeneratorInput['goal']; label: string; emoji: string }> = [
    { value: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
    { value: 'get_stronger', label: 'Get Stronger', emoji: '🏋️' },
    { value: 'lose_fat', label: 'Lose Fat', emoji: '🔥' },
    { value: 'general_fitness', label: 'General Fitness', emoji: '🏃' },
    { value: 'athletic_performance', label: 'Athletic Performance', emoji: '⚡' },
  ];

  const trainingLocations: Array<{ value: ProgramGeneratorInput['trainingLocation']; label: string; description: string; emoji: string }> = [
    { value: 'full_gym', label: 'Full Gym', description: 'Barbells, machines, cables, racks', emoji: '🏋️' },
    { value: 'home_gym', label: 'Home Gym', description: 'Barbell, rack, bench, dumbbells', emoji: '🏠' },
    { value: 'limited_gym', label: 'Limited Equipment', description: 'Dumbbells, minimal machines', emoji: '🔧' },
    { value: 'bodyweight_only', label: 'Bodyweight Only', description: 'No equipment needed', emoji: '💪' },
  ];

  const timeOptions: Array<{ value: ProgramGeneratorInput['timePerSession']; label: string }> = [
    { value: '30-45', label: '30-45 min' },
    { value: '45-60', label: '45-60 min' },
    { value: '60-90', label: '60-90 min' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Load workout history
      const storageKey = `@muscleup/workout_history_${user?.email}`;
      const historyJson = await AsyncStorage.getItem(storageKey);
      const workoutHistory = historyJson ? JSON.parse(historyJson) : [];

      // Build user context
      const userContext: UserContext = {
        age: preferences.age,
        currentWeight: preferences.currentWeight,
        workoutHistory: workoutHistory,
      };

      const input: ProgramGeneratorInput = {
        goal,
        daysPerWeek,
        trainingLocation,
        timePerSession,
        notes: notes.trim() || undefined,
      };

      const program = await generateWorkoutProgram(input, userContext);
      setGeneratedProgram(program);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error generating program:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate program. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefineProgram = async () => {
    if (!refinementRequest.trim()) {
      Alert.alert('No Changes Requested', 'Please describe what you want to change.');
      return;
    }

    setShowRefineModal(false);
    setLoading(true);

    try {
      // Load workout history for context
      const storageKey = `@muscleup/workout_history_${user?.email}`;
      const historyJson = await AsyncStorage.getItem(storageKey);
      const workoutHistory = historyJson ? JSON.parse(historyJson) : [];

      const userContext: UserContext = {
        age: preferences.age,
        currentWeight: preferences.currentWeight,
        workoutHistory: workoutHistory,
      };

      const input: ProgramGeneratorInput = {
        goal,
        daysPerWeek,
        trainingLocation,
        timePerSession,
        notes: notes.trim() || undefined,
      };

      // Generate refined program with user feedback
      const refinedProgram = await generateWorkoutProgram(
        input,
        userContext,
        generatedProgram, // Pass existing program
        refinementRequest  // Pass refinement request
      );

      setGeneratedProgram(refinedProgram);
      setRefinementRequest('');

      Alert.alert(
        'Program Refined! ✨',
        'Your changes have been applied. Review the updated program.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error refining program:', error);
      Alert.alert(
        'Refinement Failed',
        error.message || 'Failed to refine program. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!generatedProgram) return;

    if (!user?.email) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const templates = convertProgramToTemplates(generatedProgram);

      // Save all templates
      for (const template of templates) {
        await saveWorkoutTemplate(template, user.email);
      }

      Alert.alert(
        'Program Saved! 🎉',
        `${templates.length} workouts added to your tracker. Go to Workouts to start training!`,
        [
          {
            text: 'View Workouts',
            onPress: () => {
              navigation.navigate('Tabs', { screen: 'Workout' });
            },
          },
          {
            text: 'OK',
          },
        ]
      );

      // Reset form
      setGeneratedProgram(null);
      setShowPreview(false);
    } catch (error) {
      console.error('Error saving templates:', error);
      Alert.alert('Save Failed', 'Failed to save program. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {showPreview && generatedProgram ? (
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Card style={styles.card}>
              <Text style={styles.title}>{generatedProgram.programName}</Text>
              <Text style={styles.description}>{generatedProgram.description}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Weekly Schedule</Text>
                {generatedProgram.weeklySchedule.map((day, index) => (
                  <View key={index} style={styles.dayCard}>
                    <Text style={styles.dayTitle}>{day.workoutName}</Text>
                    <Text style={styles.dayFocus}>{day.focus}</Text>

                    {day.exercises.map((ex, exIndex) => (
                      <View key={exIndex} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseDetails}>
                          {ex.sets} × {ex.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Progression</Text>
                <Text style={styles.notes}>{generatedProgram.progressionNotes}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💤 Deload Schedule</Text>
                <Text style={styles.notes}>{generatedProgram.deloadSchedule}</Text>
              </View>
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowPreview(false)}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.refineButton}
                onPress={() => setShowRefineModal(true)}>
                <Text style={styles.refineButtonText}>Refine</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSaveProgram}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save to Tracker</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.title}>AI Program Generator</Text>
          <Text style={styles.subtitle}>
            Let Atlas design a complete program tailored to your goals
          </Text>

          {/* Goal Selection - Compact Horizontal Scroll */}
          <View style={styles.sectionCompact}>
            <Text style={styles.label}>Primary Goal</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalScrollContainer}>
              {goals.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.goalChip,
                    goal === g.value && styles.goalChipSelected,
                  ]}
                  onPress={() => setGoal(g.value)}
                  activeOpacity={0.7}>
                  <Text style={styles.goalEmoji}>{g.emoji}</Text>
                  <Text
                    style={[
                      styles.goalChipText,
                      goal === g.value && styles.goalChipTextSelected,
                    ]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Days Per Week - Compact 1-7 Buttons */}
          <View style={styles.sectionCompact}>
            <Text style={styles.label}>Training Days Per Week</Text>
            <View style={styles.daysCompactSelector}>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.dayButtonCompact,
                    daysPerWeek === days && styles.dayButtonCompactActive,
                  ]}
                  onPress={() => setDaysPerWeek(days)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.dayButtonCompactText,
                      daysPerWeek === days && styles.dayButtonCompactTextActive,
                    ]}>
                    {days}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Training Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Training Location</Text>
            {trainingLocations.map((location) => (
              <TouchableOpacity
                key={location.value}
                style={[
                  styles.locationOption,
                  trainingLocation === location.value && styles.locationOptionSelected,
                ]}
                onPress={() => setTrainingLocation(location.value)}>
                <View style={styles.locationLeft}>
                  <Text style={styles.locationEmoji}>{location.emoji}</Text>
                  <View style={styles.locationText}>
                    <Text style={[styles.locationLabel, trainingLocation === location.value && styles.locationLabelSelected]}>
                      {location.label}
                    </Text>
                    <Text style={styles.locationDescription}>{location.description}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radio,
                    trainingLocation === location.value && styles.radioSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Per Session */}
          <View style={styles.sectionCompact}>
            <Text style={styles.label}>Time Per Session</Text>
            <View style={styles.timeSelector}>
              {timeOptions.map((time) => (
                <TouchableOpacity
                  key={time.value}
                  style={[
                    styles.timeButton,
                    timePerSession === time.value && styles.timeButtonActive,
                  ]}
                  onPress={() => setTimePerSession(time.value)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.timeButtonText,
                      timePerSession === time.value && styles.timeButtonTextActive,
                    ]}>
                    {time.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes (combined injuries + preferences) */}
          <View style={styles.section}>
            <Text style={styles.label}>Additional Notes (optional)</Text>
            <Text style={styles.helperText}>
              Specify injuries, equipment details, or exercise preferences
            </Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Examples:&#10;• 'Shoulder pain, avoid overhead press'&#10;• 'No squat rack, dumbbells only up to 50lbs'&#10;• 'Only have 15 minutes per workout'&#10;• 'Prefer compound movements, hate cardio'"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>🤖 Generate Program</Text>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
        </SafeAreaView>
      )}

      {/* Refinement Modal - Available for both preview and form views */}
      <Modal
        visible={showRefineModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRefineModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowRefineModal(false)}
              style={styles.modalCancelButton}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Refine Program</Text>
            <TouchableOpacity
              onPress={handleRefineProgram}
              style={styles.modalSaveButton}
              disabled={loading}>
              <Text style={styles.modalSaveText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalDescription}>
              Describe what you want to change. Atlas will update your program while keeping what's working.
            </Text>

            <Text style={styles.modalExamplesTitle}>Examples:</Text>
            <Text style={styles.modalExample}>
              • "I don't have a barbell, use dumbbells instead"
            </Text>
            <Text style={styles.modalExample}>
              • "Replace bench press with incline press"
            </Text>
            <Text style={styles.modalExample}>
              • "Add more shoulder work to Day 1"
            </Text>
            <Text style={styles.modalExample}>
              • "Remove deadlifts, my back hurts"
            </Text>

            <TextInput
              style={styles.modalInput}
              value={refinementRequest}
              onChangeText={setRefinementRequest}
              placeholder="What would you like to change?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  card: {
    padding: spacing.md,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionCompact: {
    marginBottom: spacing.sm + 4,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.h4,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
  },
  // Compact Goal Selection (Horizontal Scroll)
  goalScrollContainer: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  goalChipSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  goalEmoji: {
    fontSize: 18,
  },
  goalChipText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Compact Days Selector (1-7 Number Buttons)
  daysCompactSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  dayButtonCompact: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonCompactActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonCompactText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  dayButtonCompactTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.xs + 2,
  },
  radioOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioText: {
    ...typography.body,
    fontSize: 14,
  },
  // Training Location Styles
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  locationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  locationDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Time Per Session Styles
  timeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeButtonTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    padding: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 14,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.surface,
    padding: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  generateButtonText: {
    ...typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dayCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  dayFocus: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  exerciseName: {
    ...typography.body,
    flex: 1,
  },
  exerciseDetails: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  notes: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  refineButton: {
    flex: 0.7,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  refineButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1.3,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalCancelButton: {
    padding: spacing.sm,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  modalSaveButton: {
    padding: spacing.sm,
  },
  modalSaveText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalExamplesTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  modalExample: {
    ...typography.body,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  modalInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    minHeight: 150,
  },
});

export default ProgramGeneratorScreen;
