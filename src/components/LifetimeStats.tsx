import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';
import type { UnitSystem } from '../types/preferences';

type TimeRange = 'week' | 'month' | 'all';

interface LifetimeStatsProps {
  workoutHistory: any[];
  unitSystem?: UnitSystem;
}

const LifetimeStats: React.FC<LifetimeStatsProps> = ({
  workoutHistory,
  unitSystem = 'lbs',
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('week');

  // Calculate all stats from workoutHistory based on time range
  const calculateStats = () => {
    const workouts = workoutHistory || [];

    // Filter workouts based on selected time range
    const now = new Date();
    const cutoffDate = new Date(now);

    if (selectedTimeRange === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (selectedTimeRange === 'month') {
      cutoffDate.setDate(now.getDate() - 30);
    }
    // 'all' means no filtering

    const filteredWorkouts = selectedTimeRange === 'all'
      ? workouts
      : workouts.filter(w => new Date(w.date) >= cutoffDate);

    // Calculate comparison period for trends
    const comparisonCutoff = new Date(cutoffDate);
    if (selectedTimeRange === 'week') {
      comparisonCutoff.setDate(cutoffDate.getDate() - 7); // Previous week
    } else if (selectedTimeRange === 'month') {
      comparisonCutoff.setDate(cutoffDate.getDate() - 30); // Previous month
    }

    const comparisonWorkouts = selectedTimeRange === 'all'
      ? []
      : workouts.filter(w => new Date(w.date) >= comparisonCutoff && new Date(w.date) < cutoffDate);

    // Total workouts in current period
    const totalWorkouts = filteredWorkouts.length;
    const previousWorkouts = comparisonWorkouts.length;

    // Total sets, reps, and volume for current period
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;

    // Stats for comparison period
    let previousSets = 0;
    let previousVolume = 0;

    // Calculate current period stats
    filteredWorkouts.forEach(workout => {
      if (workout.exercises) {
        workout.exercises.forEach((exercise: any) => {
          if (exercise.sets) {
            exercise.sets.forEach((set: any) => {
              if (set.completed) {
                const volume = (set.weight || 0) * (set.reps || 0);
                totalSets++;
                totalReps += set.reps || 0;
                totalVolume += volume;
              }
            });
          }
        });
      }
    });

    // Calculate comparison period stats
    comparisonWorkouts.forEach(workout => {
      if (workout.exercises) {
        workout.exercises.forEach((exercise: any) => {
          if (exercise.sets) {
            exercise.sets.forEach((set: any) => {
              if (set.completed) {
                const volume = (set.weight || 0) * (set.reps || 0);
                previousSets++;
                previousVolume += volume;
              }
            });
          }
        });
      }
    });

    // Calculate trend percentages
    const workoutsTrend = previousWorkouts > 0
      ? Math.round(((totalWorkouts - previousWorkouts) / previousWorkouts) * 100)
      : 0;
    const setsTrend = previousSets > 0
      ? Math.round(((totalSets - previousSets) / previousSets) * 100)
      : 0;
    const volumeTrendPercent = previousVolume > 0
      ? Math.round(((totalVolume - previousVolume) / previousVolume) * 100)
      : 0;

    // Get workout dates for heatmap (last 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toDateString();
    });

    const workoutDateSet = new Set(
      filteredWorkouts.map(w => new Date(w.date).toDateString())
    );

    const heatmapData = last7Days.map(dateStr => ({
      date: dateStr,
      hasWorkout: workoutDateSet.has(dateStr),
    }));

    // Find best lift (highest estimated 1RM) in selected time range
    let bestLift = { exercise: '', weight: 0, reps: 0, estimated1RM: 0 };

    filteredWorkouts.forEach(workout => {
      workout.exercises?.forEach((exercise: any) => {
        if (exercise.sets) {
          exercise.sets.forEach((set: any) => {
            if (set.completed && set.weight && set.reps) {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              const estimated1RM = weight * (1 + reps / 30);

              if (estimated1RM > bestLift.estimated1RM) {
                bestLift = {
                  exercise: exercise.name,
                  weight,
                  reps,
                  estimated1RM,
                };
              }
            }
          });
        }
      });
    });

    // Calculate streaks
    const workoutDates = workouts
      .map(w => w.date)
      .sort()
      .filter((date, index, self) => self.indexOf(date) === index); // unique dates

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    if (workoutDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if there's a workout today or yesterday
      const lastWorkoutDate = new Date(workoutDates[workoutDates.length - 1]);
      lastWorkoutDate.setHours(0, 0, 0, 0);
      const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate streaks
      for (let i = 0; i < workoutDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(workoutDates[i - 1]);
          const currDate = new Date(workoutDates[i]);
          const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
          } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);

      // Current streak is only valid if last workout was today or yesterday
      if (daysSinceLastWorkout <= 1) {
        currentStreak = tempStreak;
      }
    }

    // Calendar grid activity timeline (last 30 days)
    const generateActivityTimeline = () => {
      const timeline: { date: string; hasWorkout: boolean; month: string }[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get workout dates as a Set for fast lookup
      const workoutDateStrings = new Set(workouts.map(w => new Date(w.date).toDateString()));

      // Generate last 30 days (5 rows × 6 columns)
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const month = date.toLocaleDateString('en-US', { month: 'short' });

        timeline.push({
          date: date.toDateString(),
          hasWorkout: workoutDateStrings.has(date.toDateString()),
          month,
        });
      }

      return timeline;
    };

    const activityTimeline = generateActivityTimeline();

    // PRs - count PRs achieved in selected time range
    let prsInPeriod = 0;

    // Group exercises by name and track their max values
    const exerciseMaxByDate: { [exerciseName: string]: { date: string; value: number }[] } = {};

    workouts.forEach(workout => {
      workout.exercises?.forEach((exercise: any) => {
        if (exercise.sets && exercise.sets.length > 0) {
          // Calculate best set for this workout (by estimated 1RM)
          let bestValue = 0;
          exercise.sets.forEach((set: any) => {
            if (set.completed && set.weight && set.reps) {
              // Epley formula for estimated 1RM
              const estimated1RM = set.weight * (1 + set.reps / 30);
              bestValue = Math.max(bestValue, estimated1RM);
            }
          });

          if (bestValue > 0) {
            if (!exerciseMaxByDate[exercise.name]) {
              exerciseMaxByDate[exercise.name] = [];
            }
            exerciseMaxByDate[exercise.name].push({
              date: workout.date,
              value: bestValue,
            });
          }
        }
      });
    });

    // For "All Time": Count total exercises (each exercise = 1 PR at some point)
    if (selectedTimeRange === 'all') {
      prsInPeriod = Object.keys(exerciseMaxByDate).length;
    } else {
      // For Week/Month: Check if selected period had a PR compared to before
      Object.keys(exerciseMaxByDate).forEach(exerciseName => {
        const records = exerciseMaxByDate[exerciseName].sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let maxValueBeforePeriod = 0;
        let hasPRInPeriod = false;

        records.forEach(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);

          if (recordDate >= cutoffDate) {
            // This is a workout from the selected period
            if (record.value > maxValueBeforePeriod) {
              hasPRInPeriod = true;
            }
          } else {
            // Track max from before this period
            maxValueBeforePeriod = Math.max(maxValueBeforePeriod, record.value);
          }
        });

        if (hasPRInPeriod) {
          prsInPeriod++;
        }
      });
    }

    return {
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
      volumeTrendPercent,
      workoutsTrend,
      setsTrend,
      bestLift,
      maxStreak,
      currentStreak,
      prsInPeriod,
      heatmapData,
      activityTimeline,
    };
  };

  const stats = calculateStats();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatVolume = (lbs: number): string => {
    const tons = lbs / 2000;
    if (tons >= 1) return `${tons.toFixed(1)}T`;
    return `${formatNumber(lbs)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Overview</Text>
        <Text style={styles.subtitle}>
          {stats.totalWorkouts === 0
            ? "Start your fitness journey today!"
            : "Your training summary"}
        </Text>
      </View>

      {/* Time Range Selector */}
      {stats.totalWorkouts > 0 && (
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity
            style={[styles.timeRangeButton, selectedTimeRange === 'week' && styles.timeRangeButtonActive]}
            onPress={() => setSelectedTimeRange('week')}
          >
            <Text style={[styles.timeRangeText, selectedTimeRange === 'week' && styles.timeRangeTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, selectedTimeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setSelectedTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, selectedTimeRange === 'month' && styles.timeRangeTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, selectedTimeRange === 'all' && styles.timeRangeButtonActive]}
            onPress={() => setSelectedTimeRange('all')}
          >
            <Text style={[styles.timeRangeText, selectedTimeRange === 'all' && styles.timeRangeTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State Message */}
      {stats.totalWorkouts === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>💪 Complete your first workout to see your progress!</Text>
        </View>
      )}

      {/* Compact Grid Layout - 2 rows of 3 */}
      <View style={styles.statsGrid}>
        <View style={styles.gridRow}>
          <LinearGradient
            colors={colors.gradientPrimary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={styles.compactStatValue}>{formatNumber(stats.totalWorkouts)}</Text>
            <Text style={styles.compactStatLabel}>Workouts</Text>
            {selectedTimeRange !== 'all' && stats.workoutsTrend !== 0 && (
              <Text style={[
                styles.volumeTrend,
                stats.workoutsTrend > 0 && { color: colors.success },
                stats.workoutsTrend < 0 && { color: colors.error },
              ]}>
                {stats.workoutsTrend > 0 ? '↑' : '↓'} {Math.abs(stats.workoutsTrend)}%
              </Text>
            )}
          </LinearGradient>

          <LinearGradient
            colors={colors.gradientPrimary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={styles.compactStatValue}>{formatNumber(stats.totalSets)}</Text>
            <Text style={styles.compactStatLabel}>Sets</Text>
            {selectedTimeRange !== 'all' && stats.setsTrend !== 0 && (
              <Text style={[
                styles.volumeTrend,
                stats.setsTrend > 0 && { color: colors.success },
                stats.setsTrend < 0 && { color: colors.error },
              ]}>
                {stats.setsTrend > 0 ? '↑' : '↓'} {Math.abs(stats.setsTrend)}%
              </Text>
            )}
          </LinearGradient>

          <LinearGradient
            colors={colors.gradientPrimary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={styles.compactStatValue}>{formatVolume(stats.totalVolume)}</Text>
            <Text style={styles.compactStatLabel}>Volume</Text>
            {selectedTimeRange !== 'all' && stats.volumeTrendPercent !== 0 && (
              <Text style={[
                styles.volumeTrend,
                stats.volumeTrendPercent > 0 && { color: colors.success },
                stats.volumeTrendPercent < 0 && { color: colors.error },
              ]}>
                {stats.volumeTrendPercent > 0 ? '↑' : '↓'} {Math.abs(stats.volumeTrendPercent)}%
              </Text>
            )}
          </LinearGradient>
        </View>

        <View style={styles.gridRow}>
          {/* Streak Card with Heatmap */}
          <LinearGradient
            colors={colors.gradientSecondary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={[styles.compactStatValue, stats.currentStreak > 0 && { color: colors.success }]}>
              {stats.currentStreak}
            </Text>
            <Text style={styles.compactStatLabel}>Streak</Text>
            {stats.maxStreak > 0 && (
              <Text style={styles.streakBest}>Best: {stats.maxStreak}</Text>
            )}
            {/* Heatmap */}
            <View style={styles.heatmapContainer}>
              {stats.heatmapData.map((day, index) => (
                <View
                  key={index}
                  style={[
                    styles.heatmapDay,
                    day.hasWorkout && styles.heatmapDayActive,
                  ]}
                />
              ))}
            </View>
          </LinearGradient>

          <LinearGradient
            colors={colors.gradientSecondary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={styles.compactStatLabel}>Last 30 Days</Text>
            <View style={styles.calendarGrid}>
              {stats.activityTimeline.map((day, index) => (
                <View
                  key={index}
                  style={[
                    styles.calendarDot,
                    day.hasWorkout && styles.calendarDotActive,
                  ]}
                />
              ))}
            </View>
          </LinearGradient>

          <LinearGradient
            colors={colors.gradientSecondary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactStatCard}
          >
            <Text style={styles.compactStatValue}>{stats.prsInPeriod}</Text>
            <Text style={styles.compactStatLabel}>
              PRs {selectedTimeRange === 'week' ? 'this week' : selectedTimeRange === 'month' ? 'this month' : 'all time'}
            </Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsGrid: {
    gap: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactStatCard: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 70,
    justifyContent: 'center',
  },
  compactStatValue: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  compactStatLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  streakBest: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
  },
  bestLiftExercise: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '500',
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  volumeTrend: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  heatmapContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    justifyContent: 'center',
  },
  heatmapDay: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  heatmapDayActive: {
    backgroundColor: colors.success,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xs / 2,
    marginBottom: spacing.md,
    gap: spacing.xs / 2,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  calendarDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  calendarDotActive: {
    backgroundColor: '#00C853',
  },
});

export default LifetimeStats;