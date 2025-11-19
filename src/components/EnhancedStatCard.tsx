import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Sparkline from './Sparkline';
import { spacing, radius, typography } from '../theme';
import { colors } from '../theme/colors';

export type TrendDirection = 'up' | 'down' | 'neutral';
export type StatStatus = 'good' | 'warning' | 'danger' | 'neutral';

interface EnhancedStatCardProps {
  label: string;
  value: string | number;
  trendData?: number[];
  trendDirection?: TrendDirection;
  percentageChange?: number;
  status?: StatStatus;
  icon?: string;
  subtitle?: string;
  showSparkline?: boolean;
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  label,
  value,
  trendData = [],
  trendDirection = 'neutral',
  percentageChange,
  status = 'neutral',
  icon,
  subtitle,
  showSparkline = true,
}) => {
  // Get status color
  const getStatusColor = (): string => {
    switch (status) {
      case 'good':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'danger':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  // Get trend arrow
  const getTrendArrow = (): string => {
    switch (trendDirection) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  // Get trend color
  const getTrendColor = (): string => {
    switch (trendDirection) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const statusColor = getStatusColor();
  const trendArrow = getTrendArrow();
  const trendColor = getTrendColor();

  return (
    <View style={[styles.container, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>

        {percentageChange !== undefined && (
          <View style={[styles.percentageBadge, { backgroundColor: trendColor + '20' }]}>
            <Text style={[styles.percentageText, { color: trendColor }]}>
              {trendArrow} {Math.abs(percentageChange).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: statusColor }]}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {showSparkline && trendData.length > 0 && (
          <View style={styles.sparklineContainer}>
            <Sparkline
              data={trendData}
              width={80}
              height={40}
              lineColor={statusColor}
              fillColor={statusColor}
              showFill={true}
              strokeWidth={2}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueContainer: {
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sparklineContainer: {
    marginLeft: spacing.md,
  },
});

export default EnhancedStatCard;
