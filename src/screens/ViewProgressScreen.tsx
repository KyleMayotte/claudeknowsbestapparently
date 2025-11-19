import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../hooks/useProgress';
import { usePreferences } from '../hooks/usePreferences';
import {
  Button,
  Card,
  Input,
  WeeklyStatsGrid,
  LifetimeStats,
  ExerciseSelector,
  ExerciseProgressGraph,
  WeightProgressCard,
} from '../components';
import { typography, spacing, radius } from '../theme';
import { aggregateExerciseData } from '../utils/exerciseProgress';

interface ViewProgressScreenProps {
  onBack?: () => void;
  onNavigateToChat?: () => void;
  onNavigateToWorkout?: () => void;
}

const ViewProgressScreen: React.FC<ViewProgressScreenProps> = ({
  onBack,
}) => {
  const { theme, colors } = useTheme();
  const { user, token } = useAuthContext();
  const userEmail = user?.email || '';
  const { preferences } = usePreferences();

  const {
    weightEntries,
    loading: progressLoading,
    fetchWeightEntries,
    addWeightEntry,
    deleteWeightEntry,
  } = useProgress(userEmail, token || '');

  const [localWorkoutHistory, setLocalWorkoutHistory] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'volume' | 'reps' | 'estimated1rm'>('estimated1rm');
  const [isExerciseSelectorExpanded, setIsExerciseSelectorExpanded] = useState(false);
  const [exerciseSelectorKey, setExerciseSelectorKey] = useState(0);

  const loadWorkoutHistory = useCallback(async () => {
    try {
      const storageKey = `@muscleup/workout_history_${userEmail}`;
      const storedHistory = await AsyncStorage.getItem(storageKey);
      if (storedHistory) {
        const history = JSON.parse(storedHistory);
        console.log('📊 Loaded workout history:', history.length, 'workouts');
        setLocalWorkoutHistory(history);
      } else {
        console.log('📊 No workout history found');
        setLocalWorkoutHistory([]);
      }
    } catch (error) {
      console.error('Failed to load workout history:', error);
    }
  }, [userEmail]);

  // Load data on mount
  useEffect(() => {
    if (userEmail && token) {
      fetchWeightEntries();
    }
  }, [userEmail, token]);

  // Reload workout history every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory();
    }, [loadWorkoutHistory])
  );

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await addWeightEntry({
        userEmail,
        weight,
        date: today,
      });
      setNewWeight('');
      await fetchWeightEntries();
    } catch (error) {
      console.error('Failed to add weight:', error);
    }
  };

  // Get exercise data for selected exercise
  const exerciseData = selectedExercise
    ? aggregateExerciseData(localWorkoutHistory, selectedExercise, selectedMetric)
    : null;

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    header: {
      ...styles.header,
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...styles.headerTitle,
      color: colors.textPrimary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: colors.textPrimary,
    },
    metricSelector: {
      ...styles.metricSelector,
      backgroundColor: colors.surface,
    },
    metricButtonActive: {
      ...styles.metricButtonActive,
      backgroundColor: colors.primary,
    },
    metricButtonText: {
      ...styles.metricButtonText,
      color: colors.textSecondary,
    },
    metricButtonTextActive: {
      ...styles.metricButtonTextActive,
      color: colors.surface,
    },
    emptyExerciseState: {
      ...styles.emptyExerciseState,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    emptyExerciseText: {
      ...styles.emptyExerciseText,
      color: colors.textSecondary,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={dynamicStyles.header}>
        {onBack ? (
          <Button
            title="← Back"
            variant="ghost"
            onPress={onBack}
          />
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={dynamicStyles.headerTitle}>Progress</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          if (isExerciseSelectorExpanded) {
            setIsExerciseSelectorExpanded(false);
            setExerciseSelectorKey(prev => prev + 1);
          }
        }}>

          {/* Lifetime Stats */}
          <View
            onStartShouldSetResponder={() => isExerciseSelectorExpanded}
            onResponderRelease={() => {
              if (isExerciseSelectorExpanded) {
                setIsExerciseSelectorExpanded(false);
                setExerciseSelectorKey(prev => prev + 1);
              }
            }}
          >
            <LifetimeStats
              workoutHistory={localWorkoutHistory}
              unitSystem={preferences.unitSystem}
            />
          </View>

          {/* Exercise Progress Section */}
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Exercise Progress</Text>
          </View>

          {/* Exercise Selector */}
          <ExerciseSelector
            key={exerciseSelectorKey}
            workoutHistory={localWorkoutHistory}
            selectedExercise={selectedExercise}
            onSelectExercise={setSelectedExercise}
            onExpandedChange={setIsExerciseSelectorExpanded}
          />

          {/* Metric Selector */}
          {selectedExercise && (
            <View
              style={dynamicStyles.metricSelector}
              onStartShouldSetResponder={() => {
                if (isExerciseSelectorExpanded) {
                  setIsExerciseSelectorExpanded(false);
                  setExerciseSelectorKey(prev => prev + 1);
                  return true;
                }
                return false;
              }}
            >
              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'estimated1rm' && dynamicStyles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('estimated1rm')}
              >
                <Text
                  style={[
                    dynamicStyles.metricButtonText,
                    selectedMetric === 'estimated1rm' && dynamicStyles.metricButtonTextActive,
                  ]}
                >
                  1RM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'weight' && dynamicStyles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('weight')}
              >
                <Text
                  style={[
                    dynamicStyles.metricButtonText,
                    selectedMetric === 'weight' && dynamicStyles.metricButtonTextActive,
                  ]}
                >
                  Weight
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'volume' && dynamicStyles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('volume')}
              >
                <Text
                  style={[
                    dynamicStyles.metricButtonText,
                    selectedMetric === 'volume' && dynamicStyles.metricButtonTextActive,
                  ]}
                >
                  Volume
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Exercise Graph */}
          {selectedExercise && exerciseData && (
            <ExerciseProgressGraph
              exerciseName={selectedExercise}
              data={exerciseData.dataPoints}
              metric={selectedMetric}
              unit={
                selectedMetric === 'reps' ? 'reps' :
                selectedMetric === 'volume' ? preferences.unitSystem :
                preferences.unitSystem
              }
            />
          )}

          {/* Empty state when no exercise selected */}
          {!selectedExercise && localWorkoutHistory.length > 0 && (
            <View style={dynamicStyles.emptyExerciseState}>
              <Text style={dynamicStyles.emptyExerciseText}>Select an exercise to view progress</Text>
            </View>
          )}
          </View>

          {/* Weight Progress Card - At Bottom */}
          <WeightProgressCard
            weightHistory={preferences.weightHistory}
            currentWeight={preferences.currentWeight}
            goalWeight={preferences.goalWeight}
            unitSystem={preferences.unitSystem}
          />
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
    zIndex: 1,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
  },
  metricSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.xs / 2,
    borderRadius: radius.md,
  },
  metricButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  metricButtonActive: {
  },
  metricButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  metricButtonTextActive: {
    fontWeight: '700',
  },
  emptyExerciseState: {
    borderRadius: radius.lg,
    padding: spacing.xl * 2,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyExerciseText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ViewProgressScreen;
