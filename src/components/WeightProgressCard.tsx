// Weight Progress Card
// Displays body weight trend with interactive chart

import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeightProgressCardProps {
  weightHistory?: WeightEntry[];
  currentWeight?: number;
  goalWeight?: number;
  unitSystem: 'lbs' | 'kg';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const WeightProgressCard: React.FC<WeightProgressCardProps> = ({
  weightHistory = [],
  currentWeight,
  goalWeight,
  unitSystem,
}) => {
  // Force re-render when weightHistory changes
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    setUpdateTrigger(prev => prev + 1);
  }, [weightHistory, currentWeight, goalWeight]);

  // Get last 30 days of data for chart (show all entries, not just unique dates)
  const chartData = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Sort by date, keep all entries including multiple per day
    return weightHistory
      .filter(entry => new Date(entry.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weightHistory]);

  const startingWeight = useMemo(() => {
    if (!weightHistory || weightHistory.length === 0) return null;
    const sorted = [...weightHistory].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted[0]?.weight;
  }, [weightHistory]);

  const weightChange = useMemo(() => {
    if (!startingWeight || !currentWeight) return null;
    return currentWeight - startingWeight;
  }, [startingWeight, currentWeight]);

  const progressToGoal = useMemo(() => {
    if (!startingWeight || !currentWeight || !goalWeight) return null;
    const totalToLose = startingWeight - goalWeight;
    const lostSoFar = startingWeight - currentWeight;
    if (totalToLose === 0) return null;
    return (lostSoFar / totalToLose) * 100;
  }, [startingWeight, currentWeight, goalWeight]);

  // Chart dimensions - make it bigger and more useful
  const chartWidth = SCREEN_WIDTH - spacing.md * 4; // Full width minus card padding
  const chartHeight = 180; // Taller for better visibility
  const padding = 8;
  const leftMargin = 35; // Space for Y-axis labels

  // Calculate min/max for scaling
  const { minWeight, maxWeight } = useMemo(() => {
    if (chartData.length === 0) return { minWeight: 0, maxWeight: 0 };

    const weights = chartData.map(d => d.weight);
    if (goalWeight) weights.push(goalWeight);

    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;
    const buffer = range * 0.1; // 10% buffer

    return {
      minWeight: min - buffer,
      maxWeight: max + buffer,
    };
  }, [chartData, goalWeight]);

  // Convert weight to Y coordinate
  const getY = (weight: number) => {
    if (maxWeight === minWeight) return chartHeight / 2;
    const normalized = (weight - minWeight) / (maxWeight - minWeight);
    return chartHeight - (normalized * (chartHeight - padding * 2)) - padding;
  };

  // Convert index to X coordinate
  const getX = (index: number, total: number) => {
    if (total <= 1) return leftMargin + padding; // Single point on left edge
    return leftMargin + (index / (total - 1)) * (chartWidth - leftMargin - padding * 2) + padding;
  };

  // Build SVG path for line
  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';

    const points = chartData.map((entry, i) => ({
      x: getX(i, chartData.length),
      y: getY(entry.weight),
    }));

    return points.map((p, i) =>
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ');
  }, [chartData, minWeight, maxWeight]);

  // Goal line Y position (if goal weight set)
  const goalLineY = goalWeight ? getY(goalWeight) : null;

  // No data state
  if (!currentWeight || chartData.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>⚖️ Body Weight</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No weight data yet</Text>
          <Text style={styles.emptyHint}>Log your weight in Profile to track progress</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>⚖️ Body Weight</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {startingWeight && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Starting</Text>
            <Text style={styles.statValue}>{startingWeight.toFixed(1)} {unitSystem}</Text>
          </View>
        )}

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{currentWeight.toFixed(1)} {unitSystem}</Text>
        </View>

        {weightChange !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[
              styles.statValue,
              weightChange > 0 ? styles.statPositive : styles.statNegative
            ]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {unitSystem}
            </Text>
          </View>
        )}
      </View>

      {/* Full-size Chart */}
      {chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={[styles.chartCanvas, { width: chartWidth, height: chartHeight }]}>
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = chartHeight - (ratio * chartHeight);
              const weight = minWeight + (ratio * (maxWeight - minWeight));

              return (
                <View key={`grid-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: y }}>
                  <View style={[styles.gridLine, { left: leftMargin }]} />
                  <Text style={styles.gridLabel}>{weight.toFixed(0)}</Text>
                </View>
              );
            })}

            {/* Goal line (dotted) */}
            {goalLineY !== null && (
              <View style={[styles.goalLine, { top: goalLineY, left: leftMargin }]}>
                <Text style={styles.goalLabel}>Goal: {goalWeight} {unitSystem}</Text>
              </View>
            )}

            {/* Data points */}
            {chartData.map((entry, i) => {
              const x = getX(i, chartData.length);
              const y = getY(entry.weight);

              return (
                <View
                  key={i}
                  style={[
                    styles.dataPoint,
                    {
                      left: x - 3,
                      top: y - 3,
                    },
                  ]}
                />
              );
            })}

            {/* Simple line connecting points (using positioned views) */}
            {chartData.length > 1 && chartData.map((entry, i) => {
              if (i === chartData.length - 1) return null;

              const x1 = getX(i, chartData.length);
              const y1 = getY(entry.weight);
              const x2 = getX(i + 1, chartData.length);
              const y2 = getY(chartData[i + 1].weight);

              const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

              return (
                <View
                  key={`line-${i}`}
                  style={[
                    styles.connectionLine,
                    {
                      left: x1,
                      top: y1,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
          </View>

          <Text style={styles.chartLabel}>Last 30 days</Text>

          {/* Progress to goal */}
          {goalWeight && progressToGoal !== null && (
            <Text style={styles.goalProgress}>
              {progressToGoal >= 100
                ? '🎉 Goal reached!'
                : `${Math.abs(progressToGoal).toFixed(0)}% to goal`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
    fontSize: 11,
  },
  statValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  statPositive: {
    color: colors.secondary,
  },
  statNegative: {
    color: colors.primary,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  chartCanvas: {
    position: 'relative',
    backgroundColor: colors.background + '80',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridLine: {
    position: 'absolute',
    right: 0,
    height: 1,
    backgroundColor: colors.border + '40',
    zIndex: 0,
  },
  gridLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    position: 'absolute',
    left: 2,
    top: -8,
    width: 30,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 3,
  },
  connectionLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: colors.primary,
    transformOrigin: 'left center',
    zIndex: 2,
  },
  goalLine: {
    position: 'absolute',
    right: 0,
    height: 2,
    backgroundColor: colors.secondary + '60',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.secondary,
    zIndex: 1,
  },
  goalLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
    position: 'absolute',
    right: 8,
    top: -16,
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  chartLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  goalProgress: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs / 2,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
  },
});
