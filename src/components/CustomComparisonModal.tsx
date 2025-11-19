/**
 * Custom Comparison Modal
 * Allows users to select custom date ranges for workout comparison
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

interface CustomComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateComparison: (
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ) => void;
}

type SelectionMode = 'current' | 'previous';

// Simple date helpers
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CustomComparisonModal({
  visible,
  onClose,
  onGenerateComparison,
}: CustomComparisonModalProps) {
  const { colors } = useTheme();

  // Debug logging
  console.log('CustomComparisonModal render - visible:', visible);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Selection mode
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('current');

  // Current period dates
  const [currentStart, setCurrentStart] = useState<string | null>(null);
  const [currentEnd, setCurrentEnd] = useState<string | null>(null);

  // Previous period dates
  const [previousStart, setPreviousStart] = useState<string | null>(null);
  const [previousEnd, setPreviousEnd] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Reset all selections
  const handleReset = () => {
    setCurrentStart(null);
    setCurrentEnd(null);
    setPreviousStart(null);
    setPreviousEnd(null);
    setSelectionMode('current');
  };

  // Handle date selection
  const handleDayPress = (dateStr: string) => {
    if (selectionMode === 'current') {
      if (!currentStart || (currentStart && currentEnd)) {
        setCurrentStart(dateStr);
        setCurrentEnd(null);
      } else {
        if (dateStr < currentStart) {
          setCurrentEnd(currentStart);
          setCurrentStart(dateStr);
        } else {
          setCurrentEnd(dateStr);
        }
        setSelectionMode('previous');
      }
    } else {
      if (!previousStart || (previousStart && previousEnd)) {
        setPreviousStart(dateStr);
        setPreviousEnd(null);
      } else {
        if (dateStr < previousStart) {
          setPreviousEnd(previousStart);
          setPreviousStart(dateStr);
        } else {
          setPreviousEnd(dateStr);
        }
      }
    }
  };

  // Check if date is in range
  const isDateInRange = (dateStr: string, start: string | null, end: string | null): boolean => {
    if (!start) return false;
    if (!end) return dateStr === start;
    return dateStr >= start && dateStr <= end;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const days: Array<{ date: string | null; day: number }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, day: 0 });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: formatDateString(currentYear, currentMonth, day),
        day,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const canGenerate = currentStart && currentEnd && previousStart && previousEnd;

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerateComparison(currentStart, currentEnd, previousStart, previousEnd);
      handleReset();
      onClose();
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Custom Comparison
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                Select date ranges to compare your workouts:
              </Text>
            </View>

            {/* Period Selection Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectionMode === 'current' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectionMode('current')}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectionMode === 'current'
                          ? '#FFFFFF'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Current Period
                </Text>
                {currentStart && currentEnd && (
                  <Text
                    style={[
                      styles.tabSubtext,
                      {
                        color:
                          selectionMode === 'current'
                            ? '#FFFFFF'
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {currentStart} to {currentEnd}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  selectionMode === 'previous' && {
                    backgroundColor: '#6B7280',
                  },
                ]}
                onPress={() => setSelectionMode('previous')}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectionMode === 'previous'
                          ? '#FFFFFF'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Previous Period
                </Text>
                {previousStart && previousEnd && (
                  <Text
                    style={[
                      styles.tabSubtext,
                      {
                        color:
                          selectionMode === 'previous'
                            ? '#FFFFFF'
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {previousStart} to {previousEnd}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: colors.primary }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Text style={[styles.navButtonText, { color: colors.primary }]}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={[styles.dayHeaderText, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, index) => {
                if (!item.date) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isInCurrentRange = isDateInRange(item.date, currentStart, currentEnd);
                const isInPreviousRange = isDateInRange(item.date, previousStart, previousEnd);
                const isToday = item.date === formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <TouchableOpacity
                    key={item.date}
                    style={[
                      styles.dayCell,
                      isInCurrentRange && { backgroundColor: colors.primary },
                      isInPreviousRange && { backgroundColor: '#6B7280' },
                      isToday && !isInCurrentRange && !isInPreviousRange && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleDayPress(item.date!)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: colors.textPrimary },
                        (isInCurrentRange || isInPreviousRange) && { color: '#FFFFFF' },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                Reset Selection
              </Text>
            </TouchableOpacity>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                {
                  backgroundColor: canGenerate ? colors.primary : colors.border,
                },
              ]}
              onPress={handleGenerate}
              disabled={!canGenerate}
            >
              <Text
                style={[
                  styles.generateButtonText,
                  {
                    color: canGenerate ? '#FFFFFF' : colors.textTertiary,
                  },
                ]}
              >
                Generate Comparison
              </Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
          </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  instructions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabSubtext: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  generateButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spacer: {
    height: spacing.xl,
  },
});
