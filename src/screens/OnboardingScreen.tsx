import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components';
import { typography, spacing, radius } from '../theme';
import { PrimaryGoal, UnitSystem } from '../types/preferences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@muscleup/onboarding_completed';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const GOAL_OPTIONS: { value: PrimaryGoal; label: string; emoji: string; description: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle', emoji: '💪', description: 'Hypertrophy training' },
  { value: 'strength', label: 'Get Stronger', emoji: '🏋️', description: 'Powerlifting focus' },
  { value: 'weight_loss', label: 'Lose Weight', emoji: '🔥', description: 'Fat loss + muscle' },
  { value: 'athletic_performance', label: 'Athletic Performance', emoji: '⚡', description: 'Sport conditioning' },
  { value: 'general_fitness', label: 'Stay Fit', emoji: '🎯', description: 'General wellness' },
];

const WEEKLY_GOAL_OPTIONS = [
  { value: 1, label: '1x/week', description: 'Getting started' },
  { value: 2, label: '2x/week', description: 'Light training' },
  { value: 3, label: '3x/week', description: 'Consistent' },
  { value: 4, label: '4x/week', description: 'Most popular' },
  { value: 5, label: '5x/week', description: 'Dedicated' },
  { value: 6, label: '6x/week', description: 'Advanced' },
  { value: 7, label: '7x/week', description: 'Elite athlete' },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme, colors } = useTheme();
  const [step, setStep] = useState(1);

  // User selections
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(4);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('lbs');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [age, setAge] = useState('');

  // Get goal-specific defaults
  const getGoalDefaults = (goal: PrimaryGoal) => {
    switch (goal) {
      case 'strength':
        return {
          weightIncrement: 10,
          targetRepRange: { min: 3, max: 6 },
          increaseAtReps: 6,
        };
      case 'muscle_gain':
        return {
          weightIncrement: 5,
          targetRepRange: { min: 8, max: 12 },
          increaseAtReps: 12,
        };
      case 'weight_loss':
        return {
          weightIncrement: 2.5,
          targetRepRange: { min: 10, max: 15 },
          increaseAtReps: 15,
        };
      case 'athletic_performance':
        return {
          weightIncrement: 5,
          targetRepRange: { min: 6, max: 10 },
          increaseAtReps: 10,
        };
      case 'general_fitness':
      default:
        return {
          weightIncrement: 5,
          targetRepRange: { min: 8, max: 12 },
          increaseAtReps: 12,
        };
    }
  };

  const handleGoalSelect = (goal: PrimaryGoal) => {
    setSelectedGoal(goal);
    // Auto-advance to next step after brief delay for visual feedback
    setTimeout(() => {
      setStep(2);
    }, 300);
  };

  const handleWeeklyGoalSelect = (value: number) => {
    setWeeklyGoal(value);
    setTimeout(() => {
      setStep(3);
    }, 300);
  };

  const handleSkipDetails = async () => {
    await savePreferences();
  };

  const handleCompleteDetails = async () => {
    await savePreferences();
  };

  const savePreferences = async () => {
    try {
      const goal = selectedGoal || 'general_fitness';
      const goalDefaults = getGoalDefaults(goal);

      const preferences = {
        primaryGoal: goal,
        weeklyWorkoutGoal: weeklyGoal,
        unitSystem: unitSystem,
        age: age ? parseInt(age) : undefined,
        currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
        goalWeight: goalWeight ? parseFloat(goalWeight) : undefined,
        weightHistory: currentWeight ? [{ date: new Date().toISOString().split('T')[0], weight: parseFloat(currentWeight) }] : [],
        weightIncrement: goalDefaults.weightIncrement,
        progressiveOverloadConfig: {
          weightIncrement: goalDefaults.weightIncrement,
          targetRepRange: goalDefaults.targetRepRange,
          increaseAtReps: goalDefaults.increaseAtReps,
        },
        enableWorkoutReminders: false,
        reminderMessage: "Time to grind! 💪 Let's get that workout in!",
        reminderDays: [1, 2, 3, 4, 5],
        enableRestTimerSound: true,
        enableWeeklyCheckin: false,
        weeklyCheckinDay: 0,
        weeklyCheckinTime: '20:00',
        weeklyStreakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastStreakWeek: undefined,
        },
        streakFreezeData: {
          freezesAvailable: 1,
          lastResetMonth: new Date().toISOString().slice(0, 7),
          frozenWeeks: [],
          pendingFreezeWeek: undefined,
        },
      };

      await AsyncStorage.setItem('@muscleup/preferences', JSON.stringify(preferences));
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    stepTitle: {
      ...styles.stepTitle,
      color: colors.textPrimary,
    },
    stepSubtitle: {
      ...styles.stepSubtitle,
      color: colors.textSecondary,
    },
    goalCard: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    goalCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    goalLabel: {
      color: colors.textPrimary,
    },
    goalDescription: {
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    skipText: {
      color: colors.textSecondary,
    },
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>What brings you here?</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        Choose your primary goal so we can personalize your experience
      </Text>

      <View style={styles.goalsGrid}>
        {GOAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.goalCard,
              dynamicStyles.goalCard,
              selectedGoal === option.value && dynamicStyles.goalCardSelected,
            ]}
            onPress={() => handleGoalSelect(option.value)}
            activeOpacity={0.7}>
            <Text style={styles.goalEmoji}>{option.emoji}</Text>
            <Text style={[styles.goalLabel, dynamicStyles.goalLabel]}>{option.label}</Text>
            <Text style={[styles.goalDescription, dynamicStyles.goalDescription]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.progressDots}>
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[
              styles.dot,
              { backgroundColor: dot === 1 ? colors.primary : colors.border },
              dot === 1 && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>How often do you train?</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        We'll use this to track your weekly streak
      </Text>

      <View style={styles.weeklyGoalsContainer}>
        {WEEKLY_GOAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.weeklyGoalCard,
              dynamicStyles.goalCard,
              weeklyGoal === option.value && dynamicStyles.goalCardSelected,
            ]}
            onPress={() => handleWeeklyGoalSelect(option.value)}
            activeOpacity={0.7}>
            <Text style={styles.weeklyGoalValue}>{option.label}</Text>
            <Text style={[styles.weeklyGoalDescription, dynamicStyles.goalDescription]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Unit System Toggle */}
      <View style={styles.unitSystemContainer}>
        <Text style={[styles.unitSystemLabel, dynamicStyles.stepSubtitle]}>Unit System:</Text>
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[
              styles.unitButton,
              unitSystem === 'lbs' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setUnitSystem('lbs')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.unitButtonText,
                { color: unitSystem === 'lbs' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              lbs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitButton,
              unitSystem === 'kg' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setUnitSystem('kg')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.unitButtonText,
                { color: unitSystem === 'kg' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              kg
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressDots}>
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[
              styles.dot,
              { backgroundColor: dot === 2 ? colors.primary : colors.border },
              dot === 2 && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => {
    const showGoalWeight = selectedGoal === 'weight_loss' || selectedGoal === 'muscle_gain';

    return (
      <View style={styles.stepContainer}>
        <Text style={dynamicStyles.stepTitle}>Almost there!</Text>
        <Text style={dynamicStyles.stepSubtitle}>
          Optional: Add details for better personalization
        </Text>

        <ScrollView style={styles.detailsForm} showsVerticalScrollIndicator={false}>
          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.goalLabel]}>Age (Optional)</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="e.g., 25"
              placeholderTextColor={colors.textTertiary}
              maxLength={2}
            />
            <Text style={[styles.inputHint, dynamicStyles.goalDescription]}>
              Helps personalize recovery and progression advice
            </Text>
          </View>

          {/* Current Weight */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.goalLabel]}>
              Current Weight (Optional)
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, dynamicStyles.input, { flex: 1 }]}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="decimal-pad"
                placeholder="e.g., 180"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.inputUnit, dynamicStyles.goalLabel]}>{unitSystem}</Text>
            </View>
          </View>

          {/* Goal Weight (conditional) */}
          {showGoalWeight && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.goalLabel]}>
                Goal Weight (Optional)
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, dynamicStyles.input, { flex: 1 }]}
                  value={goalWeight}
                  onChangeText={setGoalWeight}
                  keyboardType="decimal-pad"
                  placeholder={selectedGoal === 'weight_loss' ? 'e.g., 160' : 'e.g., 200'}
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputUnit, dynamicStyles.goalLabel]}>{unitSystem}</Text>
              </View>
              <Text style={[styles.inputHint, dynamicStyles.goalDescription]}>
                {selectedGoal === 'weight_loss'
                  ? 'Track your fat loss progress'
                  : 'Track your muscle gain progress'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.detailsButtons}>
          <TouchableOpacity onPress={handleSkipDetails} style={styles.skipButton}>
            <Text style={[styles.skipButtonText, dynamicStyles.skipText]}>Skip</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Button
              title="Complete Setup"
              onPress={handleCompleteDetails}
              fullWidth
              size="large"
            />
          </View>
        </View>

        <View style={styles.progressDots}>
          {[1, 2, 3].map((dot) => (
            <View
              key={dot}
              style={[
                styles.dot,
                { backgroundColor: dot === 3 ? colors.primary : colors.border },
                dot === 3 && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    ...typography.displayLarge,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  stepSubtitle: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 24,
  },
  goalsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  goalCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
    aspectRatio: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  goalLabel: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
    fontSize: 14,
  },
  goalDescription: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
  },
  weeklyGoalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  weeklyGoalCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: '30%',
    minWidth: 90,
  },
  weeklyGoalValue: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
    fontSize: 18,
  },
  weeklyGoalDescription: {
    ...typography.caption,
    fontSize: 10,
  },
  unitSystemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  unitSystemLabel: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    padding: 2,
    gap: spacing.xs,
  },
  unitButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  unitButtonText: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 14,
  },
  detailsForm: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  input: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputUnit: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 16,
  },
  inputHint: {
    ...typography.caption,
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  detailsButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  skipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skipButtonText: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 16,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
});

export default OnboardingScreen;
