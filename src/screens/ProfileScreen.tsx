import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { usePreferences } from '../hooks/usePreferences';
import { colors, typography, spacing, radius } from '../theme';
import { PrimaryGoal } from '../types/preferences';
import { useAuthContext } from '../context/AuthContext';

const GOAL_OPTIONS: { value: PrimaryGoal; label: string; emoji: string; description: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle', emoji: '💪', description: 'Hypertrophy training' },
  { value: 'strength', label: 'Get Stronger', emoji: '🏋️', description: 'Powerlifting focus' },
  { value: 'weight_loss', label: 'Lose Weight', emoji: '🔥', description: 'Fat loss + muscle' },
  { value: 'athletic_performance', label: 'Athletic Performance', emoji: '⚡', description: 'Sport conditioning' },
  { value: 'general_fitness', label: 'General Fitness', emoji: '🎯', description: 'Health & wellness' },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { preferences, updatePreference, loading } = usePreferences();
  const { user, signOut } = useAuthContext();

  // Weight tracking modal state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [goalWeightInput, setGoalWeightInput] = useState('');

  // Inline editing state
  const [editingCurrent, setEditingCurrent] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [currentWeightInput, setCurrentWeightInput] = useState('');
  const [goalWeightEditInput, setGoalWeightEditInput] = useState('');

  const handleGoalSelect = async (goal: PrimaryGoal) => {
    await updatePreference('primaryGoal', goal);
  };

  const handleOpenWeightModal = () => {
    setWeightInput(preferences.currentWeight?.toString() || '');
    setGoalWeightInput(preferences.goalWeight?.toString() || '');
    setShowWeightModal(true);
  };

  const handleStartEditingCurrent = () => {
    setCurrentWeightInput(preferences.currentWeight?.toString() || '');
    setEditingCurrent(true);
  };

  const handleStartEditingGoal = () => {
    setGoalWeightEditInput(preferences.goalWeight?.toString() || '');
    setEditingGoal(true);
  };

  const handleSaveCurrentWeight = async () => {
    const weight = parseFloat(currentWeightInput);

    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newHistory = [
      ...(preferences.weightHistory || []),
      { date: today, weight }
    ];

    await updatePreference('currentWeight', weight);
    await updatePreference('weightHistory', newHistory);
    setEditingCurrent(false);
  };

  const handleSaveGoalWeight = async () => {
    const weight = parseFloat(goalWeightEditInput);

    if (goalWeightEditInput === '') {
      // Allow clearing goal weight
      await updatePreference('goalWeight', undefined);
      setEditingGoal(false);
      return;
    }

    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    await updatePreference('goalWeight', weight);
    setEditingGoal(false);
  };

  const handleLogWeight = async () => {
    const weight = parseFloat(weightInput);
    const goalWeight = parseFloat(goalWeightInput);

    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid current weight');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const weightHistory = preferences.weightHistory || [];

    // Check if already logged today
    const existingIndex = weightHistory.findIndex(entry => entry.date === today);

    let updatedHistory;
    if (existingIndex >= 0) {
      // Update today's weight
      updatedHistory = [...weightHistory];
      updatedHistory[existingIndex] = { date: today, weight };
    } else {
      // Add new entry
      updatedHistory = [...weightHistory, { date: today, weight }];
    }

    // Keep only last 90 days
    updatedHistory = updatedHistory.slice(-90);

    await updatePreference('currentWeight', weight);
    await updatePreference('weightHistory', updatedHistory);

    if (!isNaN(goalWeight) && goalWeight > 0) {
      await updatePreference('goalWeight', goalWeight);
    }

    setShowWeightModal(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getWeightProgress = () => {
    if (!preferences.currentWeight || !preferences.goalWeight) return null;

    const current = preferences.currentWeight;
    const goal = preferences.goalWeight;
    const diff = current - goal;

    return {
      diff: Math.abs(diff),
      direction: diff > 0 ? 'lose' : 'gain',
      percentage: Math.min(100, Math.abs((diff / current) * 100)),
    };
  };

  const getTodayWeightLogged = () => {
    const today = new Date().toISOString().split('T')[0];
    return preferences.weightHistory?.some(entry => entry.date === today);
  };

  const getRecentWeightHistory = () => {
    if (!preferences.weightHistory || preferences.weightHistory.length === 0) return [];

    // Sort by date descending and take last 5 entries
    return [...preferences.weightHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const formatHistoryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 7) return `${daysDiff} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /**
   * Calculate weekly weight trend
   * Returns change amount, direction, and whether it's "good" based on user's goal
   */
  const getWeeklyWeightTrend = () => {
    if (!preferences.weightHistory || preferences.weightHistory.length < 2) return null;
    if (!preferences.currentWeight) return null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Sort weight history by date (oldest first)
    const sortedHistory = [...preferences.weightHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find weight from 7 days ago (or closest available)
    const weekAgoEntries = sortedHistory.filter(
      entry => new Date(entry.date) <= sevenDaysAgo
    );

    if (weekAgoEntries.length === 0) {
      // Not enough history (less than a week of data)
      // Compare to first entry instead
      const firstWeight = sortedHistory[0].weight;
      const change = preferences.currentWeight - firstWeight;

      if (Math.abs(change) < 0.1) return null; // No meaningful change

      return {
        change,
        isGoodProgress: isWeightChangeGood(change),
        timeframe: 'overall',
      };
    }

    const weekAgoWeight = weekAgoEntries[weekAgoEntries.length - 1].weight;
    const change = preferences.currentWeight - weekAgoWeight;

    if (Math.abs(change) < 0.1) return null; // No meaningful change

    return {
      change,
      isGoodProgress: isWeightChangeGood(change),
      timeframe: 'week',
    };
  };

  /**
   * Determine if weight change is "good" based on user's primary goal
   * - Weight loss goal: losing weight is good (negative change)
   * - Muscle gain goal: gaining weight is good (positive change)
   * - Other goals: neutral
   */
  const isWeightChangeGood = (change: number): boolean | null => {
    const goal = preferences.primaryGoal;

    if (goal === 'weight_loss') {
      return change < 0; // Losing weight is good
    } else if (goal === 'muscle_gain') {
      return change > 0; // Gaining weight is good
    }

    // For strength, athletic performance, general fitness - neutral
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <Text style={styles.headerEmail}>{user?.email}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Weight Tracking Card */}
        <View style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <Text style={styles.weightTitle}>⚖️ Body Weight</Text>
            {getTodayWeightLogged() && (
              <View style={styles.loggedBadge}>
                <Text style={styles.loggedBadgeText}>✓ Logged Today</Text>
              </View>
            )}
          </View>

          <View style={styles.weightStats}>
            {/* Current Weight - Tappable */}
            <TouchableOpacity
              style={styles.weightStatItem}
              onPress={handleStartEditingCurrent}
              activeOpacity={0.7}>
              <Text style={styles.weightStatLabel}>Current</Text>
              {editingCurrent ? (
                <View style={styles.inlineEditContainer}>
                  <TextInput
                    style={styles.inlineEditInput}
                    value={currentWeightInput}
                    onChangeText={setCurrentWeightInput}
                    onSubmitEditing={handleSaveCurrentWeight}
                    onBlur={handleSaveCurrentWeight}
                    keyboardType="decimal-pad"
                    autoFocus
                    returnKeyType="done"
                  />
                  <Text style={styles.inlineEditUnit}>{preferences.unitSystem}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.weightStatValue}>
                    {preferences.currentWeight || '---'} {preferences.unitSystem}
                  </Text>

                  {/* Weekly Trend Indicator */}
                  {(() => {
                    const trend = getWeeklyWeightTrend();
                    if (!trend) return null;

                    const { change, isGoodProgress, timeframe } = trend;
                    const isPositive = change > 0;
                    const arrow = isPositive ? '↗' : '↘';
                    const sign = isPositive ? '+' : '';

                    // Color logic: green for good progress, red for bad progress, blue for neutral
                    let trendColor = colors.textSecondary; // neutral
                    if (isGoodProgress === true) {
                      trendColor = colors.secondary; // green for good
                    } else if (isGoodProgress === false) {
                      trendColor = colors.error; // red for bad
                    }

                    return (
                      <View style={styles.trendIndicator}>
                        <Text style={[styles.trendText, { color: trendColor }]}>
                          {arrow} {sign}{Math.abs(change).toFixed(1)} {preferences.unitSystem} {timeframe === 'week' ? 'this week' : 'total'}
                        </Text>
                      </View>
                    );
                  })()}
                </>
              )}
            </TouchableOpacity>

            <View style={styles.weightArrow}>
              <Text style={styles.weightArrowText}>→</Text>
            </View>

            {/* Goal Weight - Tappable */}
            <TouchableOpacity
              style={styles.weightStatItem}
              onPress={handleStartEditingGoal}
              activeOpacity={0.7}>
              <Text style={styles.weightStatLabel}>Goal</Text>
              {editingGoal ? (
                <View style={styles.inlineEditContainer}>
                  <TextInput
                    style={styles.inlineEditInput}
                    value={goalWeightEditInput}
                    onChangeText={setGoalWeightEditInput}
                    onSubmitEditing={handleSaveGoalWeight}
                    onBlur={handleSaveGoalWeight}
                    keyboardType="decimal-pad"
                    autoFocus
                    returnKeyType="done"
                    placeholder="Set"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={styles.inlineEditUnit}>{preferences.unitSystem}</Text>
                </View>
              ) : (
                <Text style={[styles.weightStatValue, !preferences.goalWeight && styles.weightStatValueEmpty]}>
                  {preferences.goalWeight || 'Set'} {preferences.goalWeight ? preferences.unitSystem : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {getWeightProgress() && (
            <View style={styles.weightProgress}>
              <Text style={styles.weightProgressText}>
                {getWeightProgress()!.diff.toFixed(1)} {preferences.unitSystem} to {getWeightProgress()!.direction}
              </Text>
            </View>
          )}

          {/* Tap hint */}
          <Text style={styles.tapHint}>Tap to edit</Text>

          {/* View History Link */}
          {preferences.weightHistory && preferences.weightHistory.length > 0 && (
            <TouchableOpacity
              style={styles.advancedLink}
              onPress={() => navigation.navigate('Tabs' as never, { screen: 'Progress' } as never)}
              activeOpacity={0.7}>
              <Text style={styles.advancedLinkText}>View progress graph ({preferences.weightHistory.length} entries) →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Goal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalsScrollContainer}>
            {GOAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.goalCard,
                  preferences.primaryGoal === option.value && styles.goalCardSelected,
                ]}
                onPress={() => handleGoalSelect(option.value)}
                activeOpacity={0.7}>
                <Text style={styles.goalEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.goalLabel,
                  preferences.primaryGoal === option.value && styles.goalLabelSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Workout Preferences Navigation */}
        <TouchableOpacity
          style={styles.preferencesCard}
          onPress={() => {
            // Navigate back to tabs, then to Preferences tab
            navigation.navigate('Tabs' as never, { screen: 'Preferences' } as never);
          }}
          activeOpacity={0.7}>
          <View style={styles.preferencesContent}>
            <View style={styles.preferencesIconContainer}>
              <Text style={styles.preferencesEmoji}>⚙️</Text>
            </View>
            <View style={styles.preferencesTextContainer}>
              <Text style={styles.preferencesTitle}>Workout Preferences</Text>
              <Text style={styles.preferencesDescription}>
                Weekly goals, progressive overload, units & reminders
              </Text>
            </View>
            <Text style={styles.preferencesChevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weight Logging Modal */}
      <Modal
        visible={showWeightModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWeightModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚖️ Log Your Weight</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Weight</Text>
              <View style={styles.inputWithButtons}>
                <TouchableOpacity
                  style={styles.incrementButton}
                  onPress={() => {
                    const current = parseFloat(weightInput) || 0;
                    setWeightInput((current - 0.5).toFixed(1));
                  }}>
                  <Text style={styles.incrementButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.weightInput}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={styles.inputUnit}>{preferences.unitSystem}</Text>
                </View>
                <TouchableOpacity
                  style={styles.incrementButton}
                  onPress={() => {
                    const current = parseFloat(weightInput) || 0;
                    setWeightInput((current + 0.5).toFixed(1));
                  }}>
                  <Text style={styles.incrementButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal Weight (Optional)</Text>
              <View style={styles.inputWithButtons}>
                <TouchableOpacity
                  style={styles.incrementButton}
                  onPress={() => {
                    const current = parseFloat(goalWeightInput) || 0;
                    setGoalWeightInput((current - 0.5).toFixed(1));
                  }}>
                  <Text style={styles.incrementButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.weightInput}
                    value={goalWeightInput}
                    onChangeText={setGoalWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Text style={styles.inputUnit}>{preferences.unitSystem}</Text>
                </View>
                <TouchableOpacity
                  style={styles.incrementButton}
                  onPress={() => {
                    const current = parseFloat(goalWeightInput) || 0;
                    setGoalWeightInput((current + 0.5).toFixed(1));
                  }}>
                  <Text style={styles.incrementButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent History */}
            {getRecentWeightHistory().length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Recent Entries</Text>
                {getRecentWeightHistory().map((entry, index) => (
                  <View key={`${entry.date}-${index}`} style={styles.historyItem}>
                    <Text style={styles.historyDate}>
                      {formatHistoryDate(entry.date)}
                    </Text>
                    <Text style={styles.historyWeight}>
                      {entry.weight} {preferences.unitSystem}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowWeightModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleLogWeight}>
                <Text style={styles.modalButtonTextPrimary}>Log Weight</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  goalsScrollContainer: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 100,
  },
  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  goalEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  goalLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: colors.primary,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactSettingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 2,
  },
  unitButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
  },
  unitButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  unitButtonTextActive: {
    color: '#FFFFFF',
  },
  signOutButton: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '700',
  },
  // Weight Tracking Styles
  weightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weightTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  loggedBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  loggedBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  weightStatItem: {
    alignItems: 'center',
  },
  weightStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  weightStatValue: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  weightArrow: {
    marginHorizontal: spacing.lg,
  },
  weightArrowText: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  weightProgress: {
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weightProgressText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  weightStatValueEmpty: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  inlineEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineEditInput: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    minWidth: 80,
    textAlign: 'center',
  },
  inlineEditUnit: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tapHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 11,
    fontStyle: 'italic',
  },
  advancedLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  advancedLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  // Weight Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incrementButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementButtonText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  weightInput: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: spacing.md,
    fontWeight: '700',
  },
  inputUnit: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    ...typography.button,
    color: colors.textSecondary,
  },
  modalButtonTextPrimary: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Weight History Styles
  historySection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  historyDate: {
    ...typography.body,
    color: colors.textSecondary,
  },
  historyWeight: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Preferences Navigation Card
  preferencesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preferencesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  preferencesIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  preferencesEmoji: {
    fontSize: 24,
  },
  preferencesTextContainer: {
    flex: 1,
  },
  preferencesTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  preferencesDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  preferencesChevron: {
    fontSize: 28,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  // Weight Trend Indicator
  trendIndicator: {
    marginTop: spacing.xs / 2,
  },
  trendText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ProfileScreen;
