import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';

type TimePeriod = 'all' | 'month' | 'week' | 'session';

interface DataPoint {
  date: string;
  value: number;
  reps?: number;
}

interface ExerciseProgressGraphProps {
  exerciseName: string;
  data: DataPoint[];
  metric: 'weight' | 'volume' | 'reps' | 'estimated1rm';
  unit?: string;
}

const ExerciseProgressGraph: React.FC<ExerciseProgressGraphProps> = ({
  exerciseName,
  data,
  metric,
  unit = 'lbs',
}) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  const screenWidth = Dimensions.get('window').width;
  const graphWidth = screenWidth - spacing.lg * 4;
  const graphHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  // Filter data based on selected time period
  const filteredData = useMemo(() => {
    if (timePeriod === 'all') return data;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timePeriod) {
      case 'month':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'session':
        // Show last 2 sessions only
        return data.slice(-2);
      default:
        return data;
    }

    return data.filter(point => new Date(point.date) >= cutoffDate);
  }, [data, timePeriod]);

  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    const sortedData = [...filteredData].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const values = sortedData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const points = sortedData.map((point, index) => {
      const x = padding.left + (index / (sortedData.length - 1 || 1)) * (graphWidth - padding.left - padding.right);
      const y = padding.top + ((maxValue - point.value) / valueRange) * (graphHeight - padding.top - padding.bottom);
      return { x, y, ...point };
    });

    // Create path string for the line
    const pathString = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    // Create area path (filled under the line)
    const areaPath = `${pathString} L ${points[points.length - 1].x} ${graphHeight - padding.bottom} L ${points[0].x} ${graphHeight - padding.bottom} Z`;

    return {
      points,
      pathString,
      areaPath,
      minValue,
      maxValue,
      sortedData,
    };
  }, [filteredData, graphWidth, graphHeight]);

  if (!chartData || chartData.points.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{exerciseName}</Text>
          <View style={styles.metricBadge}>
            <Text style={styles.metricText}>{metric === 'estimated1rm' ? '1RM' : metric.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available yet</Text>
          <Text style={styles.emptySubtext}>Complete workouts to see your progress!</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return Math.round(value).toString();
  };

  const { points, pathString, areaPath, minValue, maxValue, sortedData } = chartData;

  // Calculate stats based on filtered time period
  const startValue = sortedData[0]?.value || 0; // First session in selected time period
  const currentValue = sortedData[sortedData.length - 1].value; // Most recent session in filtered period
  const lastSessionValue = sortedData[sortedData.length - 1].value; // Most recent workout (same as current)
  const personalBest = Math.max(...data.map(d => d.value)); // All-time PR (always from all data)

  // Progress: Start to Current for the selected time period
  const progressValue = currentValue - startValue;
  const progressPercent = startValue > 0 ? ((progressValue / startValue) * 100) : 0;

  // Y-axis labels
  const yAxisLabels = [
    { value: maxValue, y: padding.top },
    { value: (maxValue + minValue) / 2, y: (graphHeight - padding.bottom + padding.top) / 2 },
    { value: minValue, y: graphHeight - padding.bottom },
  ];

  const getTimePeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'all': return 'All Time';
      case 'month': return '30 Days';
      case 'week': return '7 Days';
      case 'session': return 'Last 2';
      default: return 'All Time';
    }
  };

  const getProgressLabel = (): string => {
    switch (timePeriod) {
      case 'all': return 'Total Gain';
      case 'month': return '30-Day Gain';
      case 'week': return '7-Day Gain';
      case 'session': return 'Recent Gain';
      default: return 'Progress';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with title and metric badge */}
      <View style={styles.header}>
        <Text style={styles.title}>{exerciseName}</Text>
        <View style={styles.metricBadge}>
          <Text style={styles.metricText}>{metric === 'estimated1rm' ? '1RM' : metric.toUpperCase()}</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatLabel}>Current Best</Text>
          <Text style={styles.primaryStatValue}>
            {formatValue(personalBest)} <Text style={styles.primaryStatUnit}>{unit}</Text>
          </Text>
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryStatValue}>{sortedData.length}</Text>
            <Text style={styles.secondaryStatLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.secondaryStat}>
            <Text style={[
              styles.secondaryStatValue,
              { color: progressValue >= 0 ? colors.success : colors.error }
            ]}>
              {progressValue >= 0 ? '+' : ''}{progressPercent.toFixed(0)}%
            </Text>
            <Text style={styles.secondaryStatLabel}>Progress</Text>
          </View>
        </View>
      </View>

      {/* Time Period Selector */}
      <View style={styles.timePeriodSelector}>
        {(['all', 'month', 'week', 'session'] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timePeriodButton,
              timePeriod === period && styles.timePeriodButtonActive,
            ]}
            onPress={() => setTimePeriod(period)}
          >
            <Text
              style={[
                styles.timePeriodText,
                timePeriod === period && styles.timePeriodTextActive,
              ]}
            >
              {getTimePeriodLabel(period)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Graph */}
      <View style={styles.graphContainer}>
        <Svg width={graphWidth} height={graphHeight}>
          {/* Grid lines */}
          {yAxisLabels.map((label, i) => (
            <Line
              key={`grid-${i}`}
              x1={padding.left}
              y1={label.y}
              x2={graphWidth - padding.right}
              y2={label.y}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          {/* Area under the line */}
          <Path
            d={areaPath}
            fill={colors.primary + '15'}
          />

          {/* Line path */}
          <Path
            d={pathString}
            stroke={colors.primary}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill={colors.primary}
              stroke={colors.background}
              strokeWidth="2"
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <SvgText
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={label.y + 4}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="end"
            >
              {formatValue(label.value)}
            </SvgText>
          ))}

          {/* X-axis labels (show first, middle, last) */}
          {points.length > 0 && (
            <>
              <SvgText
                x={points[0].x}
                y={graphHeight - padding.bottom + 20}
                fontSize="10"
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {formatDate(points[0].date)}
              </SvgText>
              {points.length > 2 && (
                <SvgText
                  x={points[Math.floor(points.length / 2)].x}
                  y={graphHeight - padding.bottom + 20}
                  fontSize="10"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatDate(points[Math.floor(points.length / 2)].date)}
                </SvgText>
              )}
              {points.length > 1 && (
                <SvgText
                  x={points[points.length - 1].x}
                  y={graphHeight - padding.bottom + 20}
                  fontSize="10"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatDate(points[points.length - 1].date)}
                </SvgText>
              )}
            </>
          )}
        </Svg>
      </View>

      {/* PR Badge - Only show if most recent is a PR */}
      {currentValue === personalBest && sortedData.length > 1 && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>New Personal Record!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  metricText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  primaryStat: {
    marginBottom: spacing.md,
  },
  primaryStatLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryStatValue: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryStatUnit: {
    ...typography.h4,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  secondaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  secondaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryStatValue: {
    ...typography.h3,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  secondaryStatLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  timePeriodSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  timePeriodButtonActive: {
    backgroundColor: colors.primary,
  },
  timePeriodText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timePeriodTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  graphContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
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
  },
  prBadge: {
    backgroundColor: colors.success + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  prText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
});

export default ExerciseProgressGraph;
