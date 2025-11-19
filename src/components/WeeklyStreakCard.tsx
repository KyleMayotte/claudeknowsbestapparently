// Weekly Streak Card Component
// Reusable card for displaying weekly streak progress

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

export interface WeeklyStreakCardProps {
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  thisWeekWorkouts: number;
  weeklyGoal: number;
  freezesAvailable: number;
  compact?: boolean;  // Compact mode for Home screen
  onPressFreezeButton?: () => void;  // Only used in Profile (full mode)
}

export const WeeklyStreakCard: React.FC<WeeklyStreakCardProps> = ({
  streak,
  longestStreak,
  totalWorkouts,
  thisWeekWorkouts,
  weeklyGoal,
  freezesAvailable,
  compact = false,
  onPressFreezeButton,
}) => {
  const handleFreezeBadgePress = () => {
    if (compact && freezesAvailable > 0 && onPressFreezeButton) {
      // In compact mode, call the freeze handler directly
      onPressFreezeButton();
    }
  };

  return (
    <View style={[styles.streakCard, compact && styles.streakCardCompact]}>
      {/* Header with freeze badge */}
      <View style={styles.streakHeader}>
        <Text style={[styles.streakTitle, compact && styles.streakTitleCompact]}>
          🔥 Weekly Streak
        </Text>
        {compact && freezesAvailable > 0 && (
          <View style={styles.freezeGlowWrapper}>
            <TouchableOpacity
              style={styles.compactFreezeBadge}
              onPress={handleFreezeBadgePress}
              activeOpacity={0.7}>
              <Text style={styles.compactFreezeBadgeText}>🛡️ {freezesAvailable}/1</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={[styles.streakStats, compact && styles.streakStatsCompact]}>
        <View style={styles.streakStatItem}>
          <Text style={[styles.streakStatValue, compact && styles.streakStatValueCompact]}>
            {streak}
          </Text>
          <Text style={[styles.streakStatLabel, compact && styles.streakStatLabelCompact]}>
            Week{compact ? '' : ' Streak'}
          </Text>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakStatItem}>
          <Text style={[styles.streakStatValue, compact && styles.streakStatValueCompact]}>
            {longestStreak}
          </Text>
          <Text style={[styles.streakStatLabel, compact && styles.streakStatLabelCompact]}>
            Longest{compact ? '' : ' Streak'}
          </Text>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakStatItem}>
          <Text style={[styles.streakStatValue, compact && styles.streakStatValueCompact]}>
            {totalWorkouts}
          </Text>
          <Text style={[styles.streakStatLabel, compact && styles.streakStatLabelCompact]}>
            Total{compact ? '' : ' Workouts'}
          </Text>
        </View>
      </View>

      {/* Weekly Progress */}
      <View style={[styles.weeklyProgressSection, compact && styles.weeklyProgressSectionCompact]}>
        <View style={styles.weeklyProgressHeader}>
          <Text style={[styles.weeklyProgressText, compact && styles.weeklyProgressTextCompact]}>
            This week: {thisWeekWorkouts}/{weeklyGoal} workouts
          </Text>
        </View>

        <View style={styles.progressDots}>
          {Array.from({ length: weeklyGoal }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                compact && styles.dotCompact,
                i < thisWeekWorkouts && styles.dotFilled
              ]}
            />
          ))}
        </View>

        {thisWeekWorkouts < weeklyGoal && (
          <Text style={[styles.weeklyProgressHint, compact && styles.weeklyProgressHintCompact]}>
            {weeklyGoal - thisWeekWorkouts} more to hit your goal!
          </Text>
        )}

        {thisWeekWorkouts >= weeklyGoal && (
          <Text style={[styles.weeklyProgressSuccess, compact && styles.weeklyProgressSuccessCompact]}>
            Weekly goal complete! 🎉
          </Text>
        )}
      </View>

      {/* Freeze Section (Full mode only) */}
      {!compact && onPressFreezeButton && (
        <View style={styles.freezeSection}>
          <View style={styles.freezeHeader}>
            <Text style={styles.freezeTitle}>🛡️ Streak Freeze</Text>
            <View style={styles.freezeBadge}>
              <Text style={styles.freezeBadgeText}>
                {freezesAvailable}/1
              </Text>
            </View>
          </View>
          <Text style={styles.freezeDescription}>
            Protect your streak for one week per month
          </Text>
          <TouchableOpacity
            style={[
              styles.freezeButton,
              freezesAvailable === 0 && styles.freezeButtonDisabled
            ]}
            onPress={onPressFreezeButton}
            disabled={freezesAvailable === 0}
            activeOpacity={0.7}>
            <Text style={[
              styles.freezeButtonText,
              freezesAvailable === 0 && styles.freezeButtonTextDisabled
            ]}>
              {freezesAvailable === 0
                ? 'No Freezes Available'
                : 'Use Freeze for Next Week'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  streakCardCompact: {
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  streakHeader: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  streakTitleCompact: {
    fontSize: 14,
    marginBottom: 0,
  },
  freezeGlowWrapper: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  compactFreezeBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  compactFreezeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  streakStatsCompact: {
    marginBottom: spacing.xs,
  },
  streakStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  streakStatValueCompact: {
    fontSize: 18,
    marginBottom: 2,
  },
  streakStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  streakStatLabelCompact: {
    fontSize: 9,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  weeklyProgressSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  weeklyProgressSectionCompact: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  weeklyProgressHeader: {
    marginBottom: spacing.sm,
  },
  weeklyProgressText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  weeklyProgressTextCompact: {
    fontSize: 12,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  dotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  weeklyProgressHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  weeklyProgressHintCompact: {
    fontSize: 11,
    marginTop: 2,
  },
  weeklyProgressSuccess: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  weeklyProgressSuccessCompact: {
    fontSize: 11,
    marginTop: 2,
  },
  // Full mode freeze section
  freezeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  freezeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  freezeTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  freezeBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  freezeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  freezeDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  freezeButton: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  freezeButtonDisabled: {
    backgroundColor: colors.border + '20',
    borderColor: colors.border,
  },
  freezeButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  freezeButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
