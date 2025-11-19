import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import EnhancedStatCard from './EnhancedStatCard';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';
import { getTodayDate } from '../utils/date';

interface WeeklyStatsGridProps {
  workoutHistory: any[];
}

const WeeklyStatsGrid: React.FC<WeeklyStatsGridProps> = ({
  workoutHistory,
}) => {
  // Use workoutHistory as workouts
  const workouts = workoutHistory;
  // Get last 7 days of data
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Calculate daily workout counts
  const dailyWorkoutCounts = last7Days.map(date => {
    return workouts.filter(w => w.date === date).length;
  });

  // Calculate daily exercise counts
  const dailyExercises = last7Days.map(date => {
    const dayWorkouts = workouts.filter(w => w.date === date);
    return dayWorkouts.reduce((total, workout) => {
      return total + (workout.exercises?.length || 0);
    }, 0);
  });

  // Calculate daily volume (total weight lifted)
  const dailyVolume = last7Days.map(date => {
    const dayWorkouts = workouts.filter(w => w.date === date);
    return dayWorkouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal: number, exercise: any) => {
        return exTotal + exercise.sets.reduce((setTotal: number, set: any) => {
          return setTotal + (set.weight * set.reps);
        }, 0);
      }, 0);
    }, 0);
  });

  // Calculate daily sets
  const dailySets = last7Days.map(date => {
    const dayWorkouts = workouts.filter(w => w.date === date);
    return dayWorkouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal: number, exercise: any) => {
        return exTotal + exercise.sets.length;
      }, 0);
    }, 0);
  });

  // Calculate trends and percentages
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return { direction: 'neutral' as const, percentage: 0 };
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    if (previous === 0) return { direction: 'neutral' as const, percentage: 0 };
    const change = ((recent - previous) / previous) * 100;
    return {
      direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'neutral' as const,
      percentage: change,
    };
  };

  const calculateStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return 'good';
    if (percentage >= 70) return 'warning';
    return 'danger';
  };

  const workoutTrend = calculateTrend(dailyWorkoutCounts);
  const exerciseTrend = calculateTrend(dailyExercises);
  const volumeTrend = calculateTrend(dailyVolume);
  const setsTrend = calculateTrend(dailySets);

  const todayWorkouts = dailyWorkoutCounts[dailyWorkoutCounts.length - 1];
  const todayExercises = dailyExercises[dailyExercises.length - 1];
  const todayVolume = dailyVolume[dailyVolume.length - 1];
  const todaySets = dailySets[dailySets.length - 1];

  const weeklyWorkouts = dailyWorkoutCounts.reduce((a, b) => a + b, 0);
  const weeklyExercisesAvg = dailyExercises.reduce((a, b) => a + b, 0) / 7;
  const weeklyVolume = dailyVolume.reduce((a, b) => a + b, 0);
  const weeklySets = dailySets.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📊 Weekly Performance</Text>

      {/* Today's Stats - Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}>
        <EnhancedStatCard
          label="Today's Workouts"
          value={todayWorkouts}
          icon="💪"
          trendData={dailyWorkoutCounts}
          trendDirection={workoutTrend.direction}
          percentageChange={workoutTrend.percentage}
          status={todayWorkouts > 0 ? 'good' : 'warning'}
          showSparkline={true}
        />

        <EnhancedStatCard
          label="Today's Exercises"
          value={todayExercises}
          icon="💪"
          subtitle="exercises completed"
          trendData={dailyExercises}
          trendDirection={exerciseTrend.direction}
          percentageChange={exerciseTrend.percentage}
          status={todayExercises > 0 ? 'good' : 'neutral'}
          showSparkline={true}
        />

        <EnhancedStatCard
          label="Today's Volume"
          value={todayVolume >= 1000 ? `${(todayVolume / 1000).toFixed(1)}k` : todayVolume}
          icon="🏋️"
          subtitle="lbs lifted"
          trendData={dailyVolume}
          trendDirection={volumeTrend.direction}
          percentageChange={volumeTrend.percentage}
          status={todayVolume > 0 ? 'good' : 'neutral'}
          showSparkline={true}
        />

        <EnhancedStatCard
          label="Today's Sets"
          value={todaySets}
          icon="📈"
          trendData={dailySets}
          trendDirection={setsTrend.direction}
          percentageChange={setsTrend.percentage}
          status={todaySets > 0 ? 'good' : 'neutral'}
          showSparkline={true}
        />
      </ScrollView>

      {/* Weekly Summary - Horizontal Scroll */}
      <Text style={styles.subsectionTitle}>7-Day Summary</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{weeklyWorkouts}</Text>
          <Text style={styles.summaryLabel}>Total Workouts</Text>
          <Text style={[
            styles.summaryStatus,
            { color: weeklyWorkouts >= 3 ? '#4CAF50' : '#FF9800' }
          ]}>
            {weeklyWorkouts >= 3 ? '✓ On track' : '⚠ Need more'}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{weeklyExercisesAvg.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Avg Exercises/Day</Text>
          <Text style={[
            styles.summaryStatus,
            { color: weeklyExercisesAvg >= 3 ? '#4CAF50' : '#FF9800' }
          ]}>
            {weeklyExercisesAvg >= 3 ? '✓ Great!' : '⚠ Low'}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {weeklyVolume >= 1000 ? `${(weeklyVolume / 1000).toFixed(1)}k` : weeklyVolume}
          </Text>
          <Text style={styles.summaryLabel}>Total Volume</Text>
          <Text style={[styles.summaryStatus, { color: '#4CAF50' }]}>
            {volumeTrend.direction === 'up' ? '↑ Growing' : volumeTrend.direction === 'down' ? '↓ Down' : '→ Stable'}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{weeklySets}</Text>
          <Text style={styles.summaryLabel}>Total Sets</Text>
          <Text style={[styles.summaryStatus, { color: '#4CAF50' }]}>
            {setsTrend.direction === 'up' ? '↑ Growing' : setsTrend.direction === 'down' ? '↓ Down' : '→ Stable'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  scrollView: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WeeklyStatsGrid;
