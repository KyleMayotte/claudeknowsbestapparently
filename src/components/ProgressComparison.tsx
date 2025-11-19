import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';

interface ComparisonData {
  metric: string;
  current: number;
  previous: number;
  unit: string;
  emoji: string;
}

interface ProgressComparisonProps {
  comparisons: ComparisonData[];
  timeframe: 'week' | 'month';
}

const ProgressComparison: React.FC<ProgressComparisonProps> = ({ comparisons, timeframe }) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderComparison = (comparison: ComparisonData) => {
    const change = calculateChange(comparison.current, comparison.previous);
    const isPositive = change > 0;
    const isNeutral = change === 0;
    const diff = comparison.current - comparison.previous;

    let changeColor = colors.textSecondary;
    let backgroundColor = colors.background;
    let borderColor = colors.border;
    let trendEmoji = '➡️';

    if (!isNeutral) {
      if (isPositive) {
        changeColor = colors.success;
        backgroundColor = colors.success + '10';
        borderColor = colors.success + '40';
        trendEmoji = '📈';
      } else {
        changeColor = colors.error;
        backgroundColor = colors.error + '10';
        borderColor = colors.error + '40';
        trendEmoji = '📉';
      }
    }

    return (
      <View
        key={comparison.metric}
        style={[
          styles.comparisonCard,
          { backgroundColor, borderColor },
        ]}>
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonEmoji}>{comparison.emoji}</Text>
          <Text style={styles.comparisonMetric}>{comparison.metric}</Text>
        </View>

        <View style={styles.comparisonContent}>
          <View style={styles.values}>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Current:</Text>
              <Text style={styles.currentValue}>
                {comparison.current} {comparison.unit}
              </Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Last {timeframe}:</Text>
              <Text style={styles.previousValue}>
                {comparison.previous} {comparison.unit}
              </Text>
            </View>
          </View>

          <View style={styles.changeContainer}>
            <Text style={styles.trendEmoji}>{trendEmoji}</Text>
            <Text style={[styles.changePercent, { color: changeColor }]}>
              {isPositive && '+'}
              {change.toFixed(1)}%
            </Text>
            <Text style={[styles.changeDiff, { color: changeColor }]}>
              {isPositive && '+'}
              {diff} {comparison.unit}
            </Text>
          </View>
        </View>

        {/* Motivational message */}
        {isPositive && change >= 20 && (
          <View style={styles.motivationBanner}>
            <Text style={styles.motivationText}>
              🔥 Amazing progress! Keep it up!
            </Text>
          </View>
        )}
        {isPositive && change < 20 && change > 0 && (
          <View style={styles.motivationBanner}>
            <Text style={styles.motivationText}>
              💪 Steady improvement!
            </Text>
          </View>
        )}
        {isNeutral && (
          <View style={[styles.motivationBanner, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.motivationText, { color: colors.warning }]}>
              ⚡ Time to push harder!
            </Text>
          </View>
        )}
        {!isPositive && !isNeutral && (
          <View style={[styles.motivationBanner, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.motivationText, { color: colors.error }]}>
              💥 Let's bounce back stronger!
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          📊 Progress vs Last {timeframe === 'week' ? 'Week' : 'Month'}
        </Text>
        <Text style={styles.subtitle}>How you're improving</Text>
      </View>

      {comparisons.map(renderComparison)}

      {/* Overall summary */}
      {comparisons.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Overall Trend</Text>
          {comparisons.filter(c => calculateChange(c.current, c.previous) > 0).length >
            comparisons.length / 2 ? (
            <View style={styles.summaryGood}>
              <Text style={styles.summaryEmoji}>🎉</Text>
              <Text style={styles.summaryText}>
                You're improving in most areas! Great job!
              </Text>
            </View>
          ) : (
            <View style={styles.summaryNeutral}>
              <Text style={styles.summaryEmoji}>💪</Text>
              <Text style={styles.summaryText}>
                Keep pushing! Consistency is key!
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  comparisonCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  comparisonEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  comparisonMetric: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  comparisonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  values: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  valueLabel: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.xs,
    width: 90,
  },
  currentValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previousValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  changeContainer: {
    alignItems: 'center',
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  trendEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs / 2,
  },
  changePercent: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  changeDiff: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  motivationBanner: {
    backgroundColor: colors.success + '15',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  motivationText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  summary: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTitle: {
    ...typography.h4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryGood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.success + '40',
  },
  summaryNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.warning + '40',
  },
  summaryEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  summaryText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
});

export default ProgressComparison;
