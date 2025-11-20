import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';

interface WorkoutHistory {
  id: string;
  name: string;
  date: string;
  duration: number;
  exerciseCount: number;
}

const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutHistory[]>([]);

  useEffect(() => {
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('@muscleup/workout_history');
      if (historyJson) {
        const history: WorkoutHistory[] = JSON.parse(historyJson);
        setTotalWorkouts(history.length);

        // Count this week's workouts
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeek = history.filter(w => new Date(w.date) >= weekAgo);
        setThisWeekWorkouts(thisWeek.length);

        // Get recent workouts (last 5)
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>MuscleUp</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your Fitness Journey
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {totalWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Workouts
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>
              {thisWeekWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              This Week
            </Text>
          </View>
        </View>

        {/* Recent Workouts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Workouts
          </Text>

          {recentWorkouts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No workouts yet. Start your first workout!
              </Text>
            </View>
          ) : (
            recentWorkouts.map((workout) => (
              <View
                key={workout.id}
                style={[styles.workoutCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, { color: colors.textPrimary }]}>
                    {workout.name}
                  </Text>
                  <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
                    {formatDate(workout.date)}
                  </Text>
                </View>
                <View style={styles.workoutStats}>
                  <Text style={[styles.workoutDuration, { color: colors.primary }]}>
                    {formatDuration(workout.duration)}
                  </Text>
                  <Text style={[styles.workoutExercises, { color: colors.textSecondary }]}>
                    {workout.exerciseCount} exercises
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.displayMedium,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  workoutCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  workoutDate: {
    ...typography.caption,
  },
  workoutStats: {
    alignItems: 'flex-end',
  },
  workoutDuration: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  workoutExercises: {
    ...typography.caption,
  },
});

export default HomeScreen;
