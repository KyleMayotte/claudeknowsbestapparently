import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

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
      id?: string;
      reps: string;
      weight: string;
      completed: boolean;
    }[];
  }[];
}

interface SimpleWorkoutDetailModalProps {
  visible: boolean;
  workout: WorkoutHistory | null;
  unitSystem: 'lbs' | 'kg';
  allWorkouts: WorkoutHistory[];
  onClose: () => void;
}

const SimpleWorkoutDetailModal: React.FC<SimpleWorkoutDetailModalProps> = ({
  visible,
  workout,
  unitSystem,
  allWorkouts,
  onClose,
}) => {
  if (!workout) return null;

  // Check if a set is a PR (highest weight for that exercise across all workouts)
  const isPR = (exerciseName: string, weight: string): boolean => {
    const currentWeight = parseFloat(weight);
    if (isNaN(currentWeight)) return false;

    // Check all previous workouts for this exercise
    for (const w of allWorkouts) {
      // Skip the current workout
      if (w.id === workout.id) continue;

      for (const ex of w.exercises) {
        if (ex.name === exerciseName) {
          for (const set of ex.sets) {
            if (set.completed) {
              const prevWeight = parseFloat(set.weight);
              if (!isNaN(prevWeight) && prevWeight >= currentWeight) {
                return false; // Found a heavier or equal weight in history
              }
            }
          }
        }
      }
    }

    return true; // No heavier weight found = PR!
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{workout.emoji}</Text>
            <View style={styles.headerText}>
              <Text style={styles.workoutName}>{workout.templateName}</Text>
              <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.duration}</Text>
              <Text style={styles.statLabel}>minutes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.exercises.length}</Text>
              <Text style={styles.statLabel}>exercises</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workout.exercises.reduce((total, ex) =>
                  total + ex.sets.filter(s => s.completed).length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>sets</Text>
            </View>
          </View>

          {/* Exercises */}
          <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
            {workout.exercises.map((exercise, exIndex) => {
              const completedSets = exercise.sets.filter(s => s.completed);
              if (completedSets.length === 0) return null;

              return (
                <View key={exercise.id || exIndex} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.setsContainer}>
                    {completedSets.map((set, setIndex) => {
                      const isSetPR = isPR(exercise.name, set.weight);
                      return (
                        <View key={set.id || setIndex} style={styles.setRow}>
                          <Text style={styles.setLabel}>Set {setIndex + 1}</Text>
                          <View style={styles.setDetailsContainer}>
                            <Text style={styles.setDetails}>
                              {set.weight} {unitSystem} × {set.reps} reps
                            </Text>
                            {isSetPR && <Text style={styles.prBadge}>🏆</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    width: '100%',
    maxHeight: '80%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  workoutName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  workoutDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  exerciseList: {
    marginBottom: spacing.md,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseName: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  setsContainer: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  setLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  setDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setDetails: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  prBadge: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

export default SimpleWorkoutDetailModal;
