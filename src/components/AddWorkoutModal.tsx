import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { typography, spacing, radius } from '../theme';
import { colors } from '../theme/colors';
import { Button } from './Button';
import exerciseService, { ExerciseResult } from '../services/exercise';
import ExerciseDemoModal from './ExerciseDemoModal';
import CardioModal from './CardioModal';

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Set {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

interface AddWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (workoutName: string, exercises: Exercise[]) => void;
  onSaveCardio?: (cardioData: {
    activityType: string;
    emoji: string;
    distance: string;
    duration: string;
    calories: string;
    notes: string;
  }) => void;
}

const AddWorkoutModal: React.FC<AddWorkoutModalProps> = ({
  visible,
  onClose,
  onSave,
  onSaveCardio,
}) => {
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseName, setCurrentExerciseName] = useState('');
  const [customExerciseResults, setCustomExerciseResults] = useState<ExerciseResult[]>([]);
  const [databaseExerciseResults, setDatabaseExerciseResults] = useState<ExerciseResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDemoExercise, setSelectedDemoExercise] = useState<ExerciseResult | null>(null);
  const [demoVisible, setDemoVisible] = useState(false);
  const [cardioModalVisible, setCardioModalVisible] = useState(false);

  const resetForm = () => {
    setWorkoutName('');
    setExercises([]);
    setCurrentExerciseName('');
    setCustomExerciseResults([]);
    setDatabaseExerciseResults([]);
    setShowDropdown(false);
  };

  // Search exercises as user types
  useEffect(() => {
    const searchExercises = async () => {
      if (currentExerciseName.trim().length < 2) {
        setCustomExerciseResults([]);
        setDatabaseExerciseResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await exerciseService.searchExercises(currentExerciseName.trim());
        setCustomExerciseResults(results.custom);
        setDatabaseExerciseResults(results.database);
        setShowDropdown(results.custom.length > 0 || results.database.length > 0);
      } catch (error) {
        console.error('Exercise search error:', error);
        setCustomExerciseResults([]);
        setDatabaseExerciseResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchExercises, 300);
    return () => clearTimeout(debounceTimer);
  }, [currentExerciseName]);

  const handleSelectExercise = (exerciseName: string) => {
    // Capitalize each word in the exercise name
    const capitalizedName = exerciseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: capitalizedName,
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '',
          weight: '',
          completed: false,
        },
      ],
    };

    setExercises([...exercises, newExercise]);
    setCurrentExerciseName('');
    setShowDropdown(false);
  };

  const handleAddExercise = () => {
    if (!currentExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    handleSelectExercise(currentExerciseName.trim());
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(exercises.filter(ex => ex.id !== exerciseId));
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises(
      exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  id: `${exerciseId}-${exercise.sets.length + 1}`,
                  reps: '',
                  weight: '',
                  completed: false,
                },
              ],
            }
          : exercise
      )
    );
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.filter(set => set.id !== setId),
            }
          : exercise
      )
    );
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight',
    value: string
  ) => {
    setExercises(
      exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId ? { ...set, [field]: value } : set
              ),
            }
          : exercise
      )
    );
  };

  const handleSave = () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    onSave(workoutName.trim(), exercises);
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    if (workoutName || exercises.length > 0) {
      Alert.alert(
        'Discard Workout',
        'Are you sure you want to discard this workout?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Workout</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Workout Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Workout Name</Text>
            <TextInput
              style={styles.nameInput}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="e.g., Upper Body, Leg Day, Cardio"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>

          {/* Add Exercise Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add Exercises</Text>
            <View style={styles.addExerciseRow}>
              <View style={styles.exerciseInputContainer}>
                <TextInput
                  style={styles.exerciseInput}
                  value={currentExerciseName}
                  onChangeText={setCurrentExerciseName}
                  placeholder="Enter exercise name"
                  placeholderTextColor={colors.textTertiary}
                  onSubmitEditing={handleAddExercise}
                  returnKeyType="done"
                />
                {isSearching && (
                  <ActivityIndicator
                    style={styles.searchingIndicator}
                    size="small"
                    color={colors.primary}
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={handleAddExercise}>
                <Text style={styles.addExerciseButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Exercise Search Results Dropdown */}
            {showDropdown && (customExerciseResults.length > 0 || databaseExerciseResults.length > 0) && (
              <View style={styles.dropdown}>
                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled">

                  {/* Custom Exercises Section */}
                  {customExerciseResults.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>YOUR EXERCISES</Text>
                      </View>
                      {customExerciseResults.map((exercise, index) => {
                        const handleDelete = async (exerciseName: string) => {
                          Alert.alert(
                            'Delete Custom Exercise',
                            `Delete "${exerciseName}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  await exerciseService.deleteCustomExercise(exerciseName);
                                  // Refresh search results
                                  if (currentExerciseName.trim()) {
                                    const results = await exerciseService.searchExercises(currentExerciseName);
                                    setCustomExerciseResults(results.custom);
                                    setDatabaseExerciseResults(results.database);
                                  }
                                },
                              },
                            ]
                          );
                        };

                        const renderRightActions = () => (
                          <TouchableOpacity
                            style={styles.swipeDeleteAction}
                            onPress={() => handleDelete(exercise.name)}>
                            <Text style={styles.swipeDeleteText}>Delete</Text>
                          </TouchableOpacity>
                        );

                        const exerciseItem = (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleSelectExercise(exercise.name)}>
                            <View style={styles.dropdownItemRow}>
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemName}>{exercise.name}</Text>
                                <Text style={styles.dropdownItemInfo}>
                                  <Text style={styles.customBadge}>Custom Exercise</Text>
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );

                        return (
                          <Swipeable
                            key={`custom-${index}`}
                            renderRightActions={renderRightActions}
                            overshootRight={false}
                            friction={2}>
                            {exerciseItem}
                          </Swipeable>
                        );
                      })}
                    </>
                  )}

                  {/* Database Exercises Section */}
                  {databaseExerciseResults.length > 0 && (
                    <>
                      {customExerciseResults.length > 0 && (
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionHeaderText}>DATABASE EXERCISES</Text>
                        </View>
                      )}
                      {databaseExerciseResults.map((exercise, index) => (
                        <View key={`database-${index}`}>
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleSelectExercise(exercise.name)}>
                            <View style={styles.dropdownItemRow}>
                              {/* GIF Thumbnail */}
                              {exercise.gifUrl && (
                                <Image
                                  source={{ uri: exercise.gifUrl }}
                                  style={styles.gifThumbnail}
                                  resizeMode="cover"
                                />
                              )}
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemName}>{exercise.name}</Text>
                                <Text style={styles.dropdownItemInfo}>
                                  {exercise.muscle} • {exercise.equipment}
                                </Text>
                              </View>
                              {/* View Demo Button */}
                              {exercise.gifUrl && (
                                <TouchableOpacity
                                  style={styles.viewDemoButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    setSelectedDemoExercise(exercise);
                                    setDemoVisible(true);
                                  }}>
                                  <Text style={styles.viewDemoIcon}>📖</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Create Custom Exercise - Always available unless exact match exists */}
            {!isSearching && currentExerciseName.trim().length >= 2 &&
             !customExerciseResults.some(ex => ex.name.toLowerCase() === currentExerciseName.trim().toLowerCase()) ? (
              <View style={styles.noResultsContainer}>
                {customExerciseResults.length === 0 && databaseExerciseResults.length === 0 && (
                  <Text style={styles.noResultsText}>No exercises found for "{currentExerciseName.trim()}"</Text>
                )}
                <TouchableOpacity
                  style={styles.createCustomButton}
                  onPress={async () => {
                    const exerciseName = currentExerciseName.trim();
                    await exerciseService.saveCustomExercise(exerciseName);
                    handleSelectExercise(exerciseName);
                    setCurrentExerciseName('');
                    setShowDropdown(false);
                  }}>
                  <Text style={styles.createCustomButtonText}>+ Create "{currentExerciseName.trim()}"</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Exercise List */}
          {exercises.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Exercises ({exercises.length})</Text>
              {exercises.map((exercise, exerciseIndex) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  {/* Exercise Header */}
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>
                      {exerciseIndex + 1}. {exercise.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(exercise.id)}
                      style={styles.removeExerciseButton}>
                      <Text style={styles.removeExerciseText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sets Table */}
                  <View style={styles.setsHeader}>
                    <Text style={[styles.setHeaderText, styles.setColumn]}>Set</Text>
                    <Text style={[styles.setHeaderText, styles.repsColumn]}>Reps</Text>
                    <Text style={[styles.setHeaderText, styles.weightColumn]}>
                      Weight (lbs)
                    </Text>
                    <View style={styles.deleteColumn} />
                  </View>

                  {exercise.sets.map((set, setIndex) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text style={[styles.setNumber, styles.setColumn]}>
                        {setIndex + 1}
                      </Text>
                      <TextInput
                        style={[styles.setInput, styles.repsColumn]}
                        value={set.reps}
                        onChangeText={value =>
                          updateSet(exercise.id, set.id, 'reps', value)
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TextInput
                        style={[styles.setInput, styles.weightColumn]}
                        value={set.weight}
                        onChangeText={value =>
                          updateSet(exercise.id, set.id, 'weight', value)
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                      {exercise.sets.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteColumn}
                          onPress={() => handleRemoveSet(exercise.id, set.id)}>
                          <Text style={styles.deleteSetText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Add Set Button */}
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleAddSet(exercise.id)}>
                    <Text style={styles.addSetButtonText}>+ Add Set</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No exercises added yet. Start by adding your first exercise above.
              </Text>
            </View>
          )}

          {/* Quick Cardio Option */}
          <View style={styles.cardioSeparator}>
            <View style={styles.separatorLine} />
          </View>
          <TouchableOpacity
            style={styles.cardioButton}
            onPress={() => setCardioModalVisible(true)}>
            <Text style={styles.cardioIcon}>🏃</Text>
            <View style={styles.cardioTextContainer}>
              <Text style={styles.cardioTitle}>Quick Cardio</Text>
              <Text style={styles.cardioSubtitle}>Log running, cycling, or other cardio</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Button
            title="Save Workout"
            variant="primary"
            onPress={handleSave}
            fullWidth
          />
        </View>
      </View>

      {/* Exercise Demo Modal */}
      <ExerciseDemoModal
        visible={demoVisible}
        exercise={selectedDemoExercise}
        onClose={() => {
          setDemoVisible(false);
          setSelectedDemoExercise(null);
        }}
      />

      {/* Cardio Modal */}
      <CardioModal
        visible={cardioModalVisible}
        onClose={() => setCardioModalVisible(false)}
        onSave={(cardioData) => {
          if (onSaveCardio) {
            onSaveCardio(cardioData);
          }
          setCardioModalVisible(false);
          onClose();
        }}
      />
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  saveButton: {
    padding: spacing.sm,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    ...typography.h4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  addExerciseRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exerciseInputContainer: {
    flex: 1,
    position: 'relative',
  },
  exerciseInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl * 2,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  searchingIndicator: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -10,
  },
  dropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 250,
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    } as any),
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    textTransform: 'capitalize',
  },
  dropdownItemInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gifThumbnail: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: '#f0f0f0',
  },
  viewDemoButton: {
    padding: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
  },
  viewDemoIcon: {
    fontSize: 18,
  },
  addExerciseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExerciseButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseName: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  removeExerciseButton: {
    padding: spacing.xs,
  },
  removeExerciseText: {
    fontSize: 32,
    color: colors.error,
    fontWeight: '300',
  },
  setsHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  setHeaderText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceDark,
  },
  setColumn: {
    width: 40,
  },
  repsColumn: {
    width: 80,
  },
  weightColumn: {
    flex: 1,
  },
  deleteColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  setInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteSetText: {
    fontSize: 24,
    color: colors.error,
    fontWeight: '300',
  },
  addSetButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addSetButtonText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noResultsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  createCustomButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  createCustomButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
  swipeDeleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  swipeDeleteText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  customBadge: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  // Cardio option styles
  cardioSeparator: {
    marginVertical: spacing.xl,
    alignItems: 'center',
  },
  separatorLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
  },
  cardioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardioIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  cardioTextContainer: {
    flex: 1,
  },
  cardioTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  cardioSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textTertiary,
  },
});

export default AddWorkoutModal;
