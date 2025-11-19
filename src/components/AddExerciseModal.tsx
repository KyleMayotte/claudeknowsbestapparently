import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { typography, spacing, radius } from '../theme';
import { colors } from '../theme/colors';
import { Button } from './Button';
import exerciseService, { ExerciseResult } from '../services/exercise';
import ExerciseDemoModal from './ExerciseDemoModal';
import { ExerciseType } from '../types';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exerciseName: string) => void;
}

/**
 * Get badge color and label for exercise type
 */
const getExerciseTypeBadge = (exerciseType?: ExerciseType) => {
  switch (exerciseType) {
    case 'compound':
      return { label: 'Compound', color: '#3B82F6' }; // Blue
    case 'isolation':
      return { label: 'Isolation', color: '#F97316' }; // Orange
    case 'cardio':
      return { label: 'Cardio', color: '#10B981' }; // Green
    case 'custom':
      return { label: 'Custom', color: colors.primary }; // Primary color
    default:
      return null;
  }
};

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
}) => {
  const [currentExerciseName, setCurrentExerciseName] = useState('');
  const [customExerciseResults, setCustomExerciseResults] = useState<ExerciseResult[]>([]);
  const [databaseExerciseResults, setDatabaseExerciseResults] = useState<ExerciseResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDemoExercise, setSelectedDemoExercise] = useState<ExerciseResult | null>(null);
  const [demoVisible, setDemoVisible] = useState(false);

  const resetForm = () => {
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

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const handleSelectExercise = (exerciseName: string) => {
    onSelectExercise(exerciseName);
    setCurrentExerciseName('');
    setShowDropdown(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Exercise</Text>
          <View style={styles.cancelButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Add Exercise Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Search for Exercise</Text>
            <View style={styles.addExerciseRow}>
              <View style={styles.exerciseInputContainer}>
                <TextInput
                  style={styles.exerciseInput}
                  value={currentExerciseName}
                  onChangeText={setCurrentExerciseName}
                  placeholder="Enter exercise name"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
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

                        const badge = getExerciseTypeBadge(exercise.exerciseType);

                        const exerciseItem = (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => handleSelectExercise(exercise.name)}>
                            <View style={styles.dropdownItemRow}>
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemName}>{exercise.name}</Text>
                                {badge && (
                                  <View style={styles.badgeContainer}>
                                    <View style={[styles.exerciseBadge, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                                      <Text style={[styles.exerciseBadgeText, { color: badge.color }]}>
                                        {badge.label}
                                      </Text>
                                    </View>
                                  </View>
                                )}
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
                      {databaseExerciseResults.map((exercise, index) => {
                        const badge = getExerciseTypeBadge(exercise.exerciseType);

                        return (
                          <View key={`database-${index}`}>
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => handleSelectExercise(exercise.name)}>
                              <View style={styles.dropdownItemRow}>
                                {exercise.gifUrl && (
                                  <Image
                                    source={{ uri: exercise.gifUrl }}
                                    style={styles.gifThumbnail}
                                    resizeMode="cover"
                                  />
                                )}
                                <View style={styles.dropdownItemContent}>
                                  <Text style={styles.dropdownItemName}>{exercise.name}</Text>
                                  <View style={styles.exerciseMetaRow}>
                                    <Text style={styles.dropdownItemInfo}>
                                      {exercise.muscle} • {exercise.equipment}
                                    </Text>
                                    {badge && (
                                      <View style={[styles.exerciseBadge, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                                        <Text style={[styles.exerciseBadgeText, { color: badge.color }]}>
                                          {badge.label}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
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
                        );
                      })}
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
                  }}>
                  <Text style={styles.createCustomButtonText}>+ Create "{currentExerciseName.trim()}"</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Empty State */}
          {!isSearching && currentExerciseName.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Start typing to search for exercises to add to your workout.
              </Text>
            </View>
          )}
        </ScrollView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  badgeContainer: {
    marginTop: spacing.xs / 2,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs / 2,
  },
  exerciseBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  exerciseBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default AddExerciseModal;
