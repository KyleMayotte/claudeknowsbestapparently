import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';

interface Exercise {
  name: string;
  sets: any[];
}

interface Workout {
  date: string;
  exercises: Exercise[];
}

interface ExerciseSelectorProps {
  workoutHistory: Workout[];
  selectedExercise: string | null;
  onSelectExercise: (exerciseName: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  workoutHistory,
  selectedExercise,
  onSelectExercise,
  onExpandedChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandedChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    if (!expanded) {
      setSearchQuery('');
    }
    onExpandedChange?.(expanded);
  };

  // Get all unique exercises from workout history with their workout count and last performed date
  const exerciseList = useMemo(() => {
    const exerciseMap = new Map<string, { count: number; lastDate: string }>();

    workoutHistory.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const existing = exerciseMap.get(exercise.name);
        const currentDate = workout.date;

        if (existing) {
          exerciseMap.set(exercise.name, {
            count: existing.count + 1,
            lastDate: currentDate > existing.lastDate ? currentDate : existing.lastDate,
          });
        } else {
          exerciseMap.set(exercise.name, {
            count: 1,
            lastDate: currentDate,
          });
        }
      });
    });

    return Array.from(exerciseMap.entries())
      .map(([name, data]) => ({ name, count: data.count, lastDate: data.lastDate }))
      .sort((a, b) => {
        // Sort by frequency first, then by recency if tied
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.lastDate.localeCompare(a.lastDate);
      });
  }, [workoutHistory]);

  // Get top 3 most frequent exercises
  const topExercises = useMemo(() => {
    return exerciseList.slice(0, 3);
  }, [exerciseList]);

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return exerciseList;
    }
    const query = searchQuery.toLowerCase();
    return exerciseList.filter(exercise =>
      exercise.name.toLowerCase().includes(query)
    );
  }, [exerciseList, searchQuery]);

  // Group exercises by muscle group (basic categorization)
  const categorizeExercise = (name: string): string => {
    const lowerName = name.toLowerCase();

    // Chest
    if (lowerName.includes('bench') || lowerName.includes('chest') ||
        lowerName.includes('press') && (lowerName.includes('dumbbell') || lowerName.includes('barbell'))) {
      return 'Chest';
    }
    // Back
    if (lowerName.includes('pull') || lowerName.includes('row') ||
        lowerName.includes('lat') || lowerName.includes('deadlift')) {
      return 'Back';
    }
    // Shoulders
    if (lowerName.includes('shoulder') || lowerName.includes('lateral') ||
        lowerName.includes('overhead') || lowerName.includes('military')) {
      return 'Shoulders';
    }
    // Legs
    if (lowerName.includes('squat') || lowerName.includes('leg') ||
        lowerName.includes('lunge') || lowerName.includes('calf')) {
      return 'Legs';
    }
    // Arms
    if (lowerName.includes('curl') || lowerName.includes('tricep') ||
        lowerName.includes('bicep') || lowerName.includes('arm')) {
      return 'Arms';
    }
    // Core
    if (lowerName.includes('crunch') || lowerName.includes('plank') ||
        lowerName.includes('ab') || lowerName.includes('core')) {
      return 'Core';
    }

    return 'Other';
  };

  const groupedExercises = useMemo(() => {
    const groups = new Map<string, typeof exerciseList>();

    filteredExercises.forEach(exercise => {
      const category = categorizeExercise(exercise.name);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(exercise);
    });

    // Sort groups by priority
    const priorityOrder = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other'];
    return Array.from(groups.entries()).sort((a, b) => {
      const indexA = priorityOrder.indexOf(a[0]);
      const indexB = priorityOrder.indexOf(b[0]);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }, [filteredExercises]);

  // Handle exercise selection
  const handleSelectExercise = (exerciseName: string) => {
    // Add to recent searches if it wasn't a top exercise
    const topExerciseNames = topExercises.map(ex => ex.name);
    if (!topExerciseNames.includes(exerciseName) && !recentSearches.includes(exerciseName)) {
      setRecentSearches(prev => [exerciseName, ...prev.slice(0, 4)]); // Keep last 5
    }
    setSearchQuery('');
    handleExpandedChange(false);
    onSelectExercise(exerciseName);
  };

  // Clear recent searches
  const handleClearRecentSearches = () => {
    setRecentSearches([]);
  };

  // Get recent search exercises
  const recentExercises = useMemo(() => {
    return recentSearches
      .map(name => exerciseList.find(ex => ex.name === name))
      .filter((ex): ex is { name: string; count: number } => ex !== undefined);
  }, [recentSearches, exerciseList]);

  // Get all other exercises (excluding top 3 and recents)
  const allOtherExercises = useMemo(() => {
    const excludeNames = new Set([...topExercises.map(ex => ex.name), ...recentSearches]);
    return exerciseList.filter(ex => !excludeNames.has(ex.name));
  }, [exerciseList, recentSearches, topExercises]);

  if (exerciseList.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No exercises found</Text>
        <Text style={styles.emptySubtext}>
          Complete workouts to track your progress
        </Text>
      </View>
    );
  }

  // Render exercise item
  const renderExerciseItem = (exercise: { name: string; count: number }) => (
    <TouchableOpacity
      key={exercise.name}
      style={[
        styles.exerciseItem,
        selectedExercise === exercise.name && styles.exerciseItemSelected,
      ]}
      onPress={() => handleSelectExercise(exercise.name)}
    >
      <View style={styles.exerciseItemContent}>
        <Text style={[
          styles.exerciseName,
          selectedExercise === exercise.name && styles.exerciseNameSelected,
        ]}>
          {exercise.name}
        </Text>
        <Text style={styles.exerciseCount}>
          {exercise.count > 0 ? `${exercise.count} sessions` : 'No sessions yet'}
        </Text>
      </View>
      {selectedExercise === exercise.name && (
        <View style={styles.selectedIndicator} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={() => handleExpandedChange(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (!isExpanded) handleExpandedChange(true);
          }}
          onFocus={() => handleExpandedChange(true)}
          editable={isExpanded}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Expanded view */}
      {isExpanded && (
        <View pointerEvents="box-none">
          {/* Active search filtering */}
          {searchQuery.trim() ? (
            <>
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeaderText}>Search Results</Text>
              </View>
              <View style={styles.exerciseList}>
                {filteredExercises.map(renderExerciseItem)}
              </View>
              {filteredExercises.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No exercises match "{searchQuery}"</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Recent searches section */}
              {recentExercises.length > 0 && (
                <>
                  <View style={[styles.sectionHeaderContainer, styles.sectionHeaderWithAction]}>
                    <Text style={styles.sectionHeaderText}>Recently Searched</Text>
                    <TouchableOpacity onPress={handleClearRecentSearches} style={styles.clearRecentButton}>
                      <Text style={styles.clearRecentText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.exerciseList}>
                    {recentExercises.map(renderExerciseItem)}
                  </View>
                </>
              )}

              {/* All other exercises section */}
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeaderText}>All Exercises</Text>
              </View>
              <View style={styles.exerciseList}>
                {allOtherExercises.map(renderExerciseItem)}
              </View>
            </>
          )}
        </View>
      )}

      {/* Top 3 exercises - show at bottom when not searching */}
      {!searchQuery.trim() && topExercises.length > 0 && (
        <View style={styles.exerciseList}>
          {topExercises.map(renderExerciseItem)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderContainer: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentButton: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
  },
  clearRecentText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    fontSize: 18,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  exerciseList: {
    gap: spacing.xs,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseItemSelected: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  exerciseItemContent: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  exerciseNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  exerciseCount: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectedIndicator: {
    width: 4,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginLeft: spacing.md,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  showMoreText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  noResults: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default ExerciseSelector;
