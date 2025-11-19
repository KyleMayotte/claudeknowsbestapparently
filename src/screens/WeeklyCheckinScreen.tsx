import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, CustomComparisonModal } from '../components';
import { typography, spacing } from '../theme';
import { analyzeLastWeek, formatVolume, formatDuration, WeeklyAnalysisResult, compareCustomPeriods, CustomPeriodComparison } from '../services/weeklyAnalysis';
import { generateWeeklyAdaptations, AdaptationResult, applyAdaptations } from '../services/weeklyAdaptation';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { preferencesService } from '../services/preferences';

type ScreenState = 'summary' | 'questions' | 'generating' | 'results';

interface UserResponses {
  weekRating: number; // 1-5 (combined recovery + stress score)
  notes: string; // Optional context for AI
}

interface WeeklyCheckinScreenProps {
  onBack?: () => void;
}

const WeeklyCheckinScreen: React.FC<WeeklyCheckinScreenProps> = ({ onBack }) => {
  const { user } = useAuthContext();
  const { theme, colors } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<WeeklyAnalysisResult | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('summary');
  const [responses, setResponses] = useState<UserResponses>({
    weekRating: 3, // Default to middle (neutral)
    notes: '',
  });
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [adaptations, setAdaptations] = useState<AdaptationResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinDay, setCheckinDay] = useState<number>(0); // 0 = Sunday
  const [showCustomComparisonModal, setShowCustomComparisonModal] = useState(false);

  // Reset modal state on mount to prevent stuck state
  useEffect(() => {
    setShowCustomComparisonModal(false);
  }, []);
  const [customComparison, setCustomComparison] = useState<CustomPeriodComparison | null>(null);
  const [showingCustomResults, setShowingCustomResults] = useState(false);

  // Load analysis on mount
  useEffect(() => {
    loadAnalysis();
  }, []);

  // Set up navigation options based on screen state
  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: screenState === 'summary',
      headerLeft: screenState !== 'summary' ? () => (
        <TouchableOpacity
          onPress={() => {
            if (screenState === 'questions') {
              setScreenState('summary');
            } else if (screenState === 'generating') {
              // Don't allow back during generation
            } else if (screenState === 'results') {
              setScreenState('questions');
            }
          }}
          style={{ paddingLeft: 8 }}
          disabled={screenState === 'generating'}>
          <Text style={{ fontSize: 28, color: screenState === 'generating' ? colors.textTertiary : colors.primary }}>
            ←
          </Text>
        </TouchableOpacity>
      ) : undefined,
    });
  }, [screenState, navigation, colors]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const userEmail = user?.email || 'guest';

      // Load check-in day preference (used for week anchoring)
      const preferences = await preferencesService.loadPreferences();
      const userCheckinDay = preferences.weeklyCheckinDay ?? 0; // Default to Sunday
      setCheckinDay(userCheckinDay);

      console.log('🔄 Loading weekly analysis for:', userEmail);
      console.log('📅 Check-in day anchor:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][userCheckinDay]);

      const result = await analyzeLastWeek(userEmail, userCheckinDay);
      console.log('📊 Analysis result:', {
        workoutsCompleted: result.workoutsCompleted,
        totalExercises: result.exercises.length,
        exerciseNames: result.exercises.map(e => e.name),
        dateRange: result.dateRange,
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Error loading weekly analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const userEmail = user?.email || 'guest';

      // Reload check-in day preference (used for week anchoring)
      const preferences = await preferencesService.loadPreferences();
      const userCheckinDay = preferences.weeklyCheckinDay ?? 0;
      setCheckinDay(userCheckinDay);

      console.log('🔄 Refreshing weekly analysis...');
      const result = await analyzeLastWeek(userEmail, userCheckinDay);
      console.log('📊 Refreshed analysis:', {
        workoutsCompleted: result.workoutsCompleted,
        totalExercises: result.exercises.length,
        exerciseNames: result.exercises.map(e => e.name),
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Error refreshing analysis:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!analysis) return;

    try {
      setScreenState('generating');
      console.log('🤖 Generating adaptations with responses:', responses);

      const result = await generateWeeklyAdaptations(analysis, responses);
      setAdaptations(result);
      setScreenState('results');
    } catch (error) {
      console.error('Error generating adaptations:', error);
      setScreenState('questions');
      Toast.show({
        type: 'error',
        text1: 'Generation Failed',
        text2: 'Unable to generate plan. Please try again.',
      });
    }
  };

  const handleLockInPlan = async () => {
    if (!adaptations || !user?.email) return;

    try {
      setApplying(true);
      console.log('🔒 Locking in plan...');

      const updatedCount = await applyAdaptations(adaptations.recommendations, user.email);

      Toast.show({
        type: 'success',
        text1: 'Plan Updated!',
        text2: `${updatedCount} exercises updated in your templates 💪`,
      });

      // Navigate back to home after 1 second
      setTimeout(() => {
        navigation.navigate('Tabs', { screen: 'Home' });
      }, 1000);
    } catch (error) {
      console.error('Error applying adaptations:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Unable to update templates. Please try again.',
      });
    } finally {
      setApplying(false);
    }
  };

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    summaryTitle: {
      ...styles.summaryTitle,
      color: colors.textPrimary,
    },
    statValue: {
      ...styles.statValue,
      color: colors.primary,
    },
    statLabel: {
      ...styles.statLabel,
      color: colors.textSecondary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: colors.textPrimary,
    },
    exerciseName: {
      ...styles.exerciseName,
      color: colors.textPrimary,
    },
    exerciseDetails: {
      ...styles.exerciseDetails,
      color: colors.textSecondary,
    },
    emptyText: {
      ...styles.emptyText,
      color: colors.textSecondary,
    },
    divider: {
      ...styles.divider,
      backgroundColor: colors.border,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing your week...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Failed to load analysis
          </Text>
          <Button title="Try Again" onPress={loadAnalysis} />
        </View>
      </SafeAreaView>
    );
  }

  const hasWorkouts = analysis.workoutsCompleted > 0;
  const isFirstWeek = analysis.previousWeek.workoutsCompleted === 0;

  // Emoji and label mapping for 1-5 scale
  const ratingOptions = [
    { value: 1, emoji: '😫', label: 'Exhausted' },
    { value: 2, emoji: '😐', label: 'Tired' },
    { value: 3, emoji: '🤖', label: 'You decide' },
    { value: 4, emoji: '💪', label: 'Strong' },
    { value: 5, emoji: '🔥', label: 'Crushing it' },
  ];

  // Calculate instant preview based on current rating
  // This mirrors the AI logic but runs client-side for instant feedback
  const getInstantPreview = () => {
    if (!analysis || analysis.exercises.length === 0) return [];

    const rating = responses.weekRating;

    // Show top 4 exercises
    return analysis.exercises.slice(0, 4).map(ex => {
      const hasGoodVolume = ex.thisWeek.totalSets >= 3;
      const hasInjury = responses.notes.toLowerCase().includes(ex.name.toLowerCase());
      const currentWeight = Math.round(ex.thisWeek.maxWeight);

      // Mirror AI decision rules (1-5 scale)
      if (rating === 1) {
        // Exhausted - deload everything
        return {
          name: ex.name,
          currentWeight,
          change: '-10%',
          icon: '↓',
          color: 'error' as const,
        };
      } else if (rating === 2 || hasInjury) {
        // Tired or injury - decrease
        return {
          name: ex.name,
          currentWeight,
          change: '-5 lbs',
          icon: '↓',
          color: 'warning' as const,
        };
      } else if (rating === 3) {
        // "You decide" - Atlas makes the call based on data (mystery/TBD)
        return {
          name: ex.name,
          currentWeight,
          change: 'TBD',
          icon: '🤖',
          color: 'primary' as const,
        };
      } else if (rating === 4 && hasGoodVolume) {
        // Strong - standard progression
        return {
          name: ex.name,
          currentWeight,
          change: '+5 lbs',
          icon: '↑',
          color: 'success' as const,
        };
      } else if (rating === 5 && hasGoodVolume) {
        // Crushing it - aggressive progression
        return {
          name: ex.name,
          currentWeight,
          change: '+10 lbs',
          icon: '↑',
          color: 'success' as const,
        };
      } else if (!hasGoodVolume && rating >= 4) {
        // Low volume but feeling strong - maintain
        return {
          name: ex.name,
          currentWeight,
          change: 'Maintain',
          icon: '→',
          color: 'textSecondary' as const,
        };
      } else {
        // Default - maintain
        return {
          name: ex.name,
          currentWeight,
          change: 'Maintain',
          icon: '→',
          color: 'textSecondary' as const,
        };
      }
    });
  };

  const preview = getInstantPreview();

  // Render Questions State
  const renderQuestionsState = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Single Question: How was your week? */}
        <Card style={styles.mainQuestionCard} shadow="medium">
          <Text style={[styles.mainQuestionTitle, { color: colors.textPrimary }]}>
            How was this week's training?
          </Text>

          {/* Emoji Scale - 5 options in a single row */}
          <View style={styles.emojiScaleContainer}>
            {ratingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor: responses.weekRating === option.value ? colors.primary : colors.surface,
                    borderColor: responses.weekRating === option.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setResponses({ ...responses, weekRating: option.value })}>
                <Text style={styles.emojiText}>{option.emoji}</Text>
                <Text style={[
                  styles.emojiValue,
                  {
                    color: responses.weekRating === option.value ? colors.textInverse : colors.textSecondary,
                    fontWeight: responses.weekRating === option.value ? '700' : '400',
                  },
                ]}>
                  {option.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Labels below */}
          <View style={styles.emojiLabels}>
            <Text style={[styles.emojiLabelText, { color: colors.textTertiary }]}>
              Exhausted
            </Text>
            <Text style={[styles.emojiLabelText, { color: colors.textTertiary }]}>
              Crushing it
            </Text>
          </View>

          {/* Instant Preview - Shows predicted changes */}
          {preview.length > 0 && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  📊 Preview
                </Text>
                <Text style={[styles.previewSubtitle, { color: colors.textTertiary }]}>
                  Based on {ratingOptions.find(r => r.value === responses.weekRating)?.emoji} rating
                </Text>
              </View>

              {preview.map((item, index) => (
                <View key={item.name} style={styles.previewItem}>
                  <Text style={[styles.previewExerciseName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.previewChangeContainer}>
                    <Text style={[styles.previewIcon, { color: colors[item.color] }]}>
                      {item.icon}
                    </Text>
                    <Text style={[styles.previewChange, { color: colors[item.color] }]}>
                      {item.change}
                    </Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.previewDisclaimer, { color: colors.textTertiary }]}>
                Atlas will fine-tune these based on your notes
              </Text>
            </View>
          )}

          {/* Collapsed/Expandable Notes Section */}
          {!showNotesInput ? (
            <TouchableOpacity
              style={styles.addNotesButton}
              onPress={() => setShowNotesInput(true)}>
              <Text style={[styles.addNotesText, { color: colors.primary }]}>
                + Anything Atlas should know?
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.notesContainer}>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="e.g., Right shoulder felt tight on overhead press"
                placeholderTextColor={colors.textTertiary}
                value={responses.notes}
                onChangeText={(text) => setResponses({ ...responses, notes: text })}
                multiline
                numberOfLines={3}
                maxLength={300}
                autoFocus
              />
            </View>
          )}
        </Card>

        {/* Value Proposition */}
        <View style={styles.valueProposition}>
          <Text style={[styles.valuePropText, { color: colors.textSecondary }]}>
            💡 Atlas uses this to adjust your weights and prevent injuries
          </Text>
        </View>

        {/* Generate Plan Button */}
        <Button
          title="Generate This Week's Plan"
          onPress={handleGeneratePlan}
          style={styles.generateButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Render Generating State
  const renderGeneratingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        🤖 Atlas is analyzing your week...
      </Text>
      <Text style={[styles.loadingSubtext, { color: colors.textTertiary }]}>
        This takes about 5 seconds
      </Text>
    </View>
  );

  // Render Results State
  const renderResultsState = () => {
    if (!adaptations) return null;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Overall Message */}
        <Card style={styles.messageCard} shadow="medium">
          <Text style={[styles.messageTitle, { color: colors.textPrimary }]}>
            📋 This Week's Plan
          </Text>
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>
            {adaptations.overallMessage}
          </Text>
          {adaptations.shouldDeload && (
            <View style={[styles.deloadBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.deloadText, { color: colors.warning }]}>
                ⚠️ Deload Week Recommended
              </Text>
            </View>
          )}
        </Card>

        {/* Recommendations List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Weight Adjustments
          </Text>
          {adaptations.recommendations.map((rec, index) => (
            <Card key={index} style={styles.recommendationCard} shadow="small">
              <View style={styles.recHeader}>
                <Text style={[styles.recExerciseName, { color: colors.textPrimary }]}>
                  {rec.exerciseName}
                </Text>
                <View style={[
                  styles.changeBadge,
                  {
                    backgroundColor:
                      rec.change === 'increase' ? colors.success + '20' :
                      rec.change === 'decrease' ? colors.error + '20' :
                      colors.textSecondary + '20'
                  }
                ]}>
                  <Text style={[
                    styles.changeBadgeText,
                    {
                      color:
                        rec.change === 'increase' ? colors.success :
                        rec.change === 'decrease' ? colors.error :
                        colors.textSecondary
                    }
                  ]}>
                    {rec.change === 'increase' ? '↑' : rec.change === 'decrease' ? '↓' : '→'}
                    {rec.change === 'increase' ? ' Increase' : rec.change === 'decrease' ? ' Decrease' : ' Maintain'}
                  </Text>
                </View>
              </View>

              <View style={styles.recWeightRow}>
                <Text style={[styles.recWeight, { color: colors.textSecondary }]}>
                  {rec.currentWeight} lbs
                </Text>
                <Text style={[styles.recArrow, { color: colors.textTertiary }]}>
                  →
                </Text>
                <Text style={[styles.recWeight, { color: colors.primary, fontWeight: '700' }]}>
                  {rec.recommendedWeight} lbs
                </Text>
                {rec.changeAmount !== 0 && (
                  <Text style={[styles.recChange, { color: colors.textTertiary }]}>
                    ({rec.changeAmount > 0 ? '+' : ''}{rec.changeAmount} lbs)
                  </Text>
                )}
              </View>

              <Text style={[styles.recReason, { color: colors.textSecondary }]}>
                {rec.reason}
              </Text>
            </Card>
          ))}
        </View>

        {/* Lock in Plan Button */}
        <Button
          title={applying ? "Updating Templates..." : "Lock in This Week's Plan"}
          onPress={handleLockInPlan}
          disabled={applying}
          style={styles.lockInButton}
        />
      </ScrollView>
    );
  };

  // Handle custom comparison generation
  const handleGenerateCustomComparison = async (
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ) => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const comparison = await compareCustomPeriods(
        user.email,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      );
      setCustomComparison(comparison);
      setShowingCustomResults(true);
    } catch (error) {
      console.error('Custom comparison error:', error);
      Toast.show({
        type: 'error',
        text1: 'Comparison Failed',
        text2: 'Unable to generate custom comparison',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle back from custom results
  const handleBackFromCustomResults = () => {
    setShowingCustomResults(false);
    setCustomComparison(null);
  };

  // Debug logging for rendering
  console.log('WeeklyCheckinScreen render:', {
    screenState,
    showingCustomResults,
    showCustomComparisonModal,
    hasCustomComparison: !!customComparison
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['bottom']}>
      {/* Render based on state */}
      {showingCustomResults && customComparison ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <TouchableOpacity onPress={handleBackFromCustomResults} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back to Weekly View</Text>
          </TouchableOpacity>

          {/* Custom Comparison Header */}
          <Card style={styles.summaryCard}>
            <Text style={[styles.customComparisonTitle, { color: colors.textPrimary }]}>
              Custom Comparison
            </Text>
            <View style={styles.periodRow}>
              <View style={styles.periodBox}>
                <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Current Period</Text>
                <Text style={[styles.periodDate, { color: colors.textPrimary }]}>
                  {customComparison.currentPeriod.startDate} to {customComparison.currentPeriod.endDate}
                </Text>
                <Text style={[styles.periodStat, { color: colors.textSecondary }]}>
                  {customComparison.currentPeriod.workoutsCompleted} workouts • {formatVolume(customComparison.currentPeriod.totalVolume)}
                </Text>
              </View>
              <Text style={styles.vsText}>vs</Text>
              <View style={styles.periodBox}>
                <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Previous Period</Text>
                <Text style={[styles.periodDate, { color: colors.textPrimary }]}>
                  {customComparison.previousPeriod.startDate} to {customComparison.previousPeriod.endDate}
                </Text>
                <Text style={[styles.periodStat, { color: colors.textSecondary }]}>
                  {customComparison.previousPeriod.workoutsCompleted} workouts • {formatVolume(customComparison.previousPeriod.totalVolume)}
                </Text>
              </View>
            </View>

            {/* Trend */}
            <View style={[styles.trendBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.trendEmoji}>{customComparison.trend.emoji}</Text>
              <View style={styles.trendTextContainer}>
                <Text style={[styles.trendTitle, { color: colors.textPrimary }]}>
                  {customComparison.trend.title}
                </Text>
                <Text style={[styles.trendSubtitle, { color: colors.textSecondary }]}>
                  {customComparison.trend.subtitle}
                </Text>
              </View>
            </View>
          </Card>

          {/* Exercise Breakdown */}
          <View style={styles.exercisesList}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              Exercise-by-Exercise Breakdown
            </Text>
            {customComparison.exercises.map((exercise, index) => (
              <Card key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.customExerciseName, { color: colors.textPrimary }]}>
                    {exercise.name}
                    {exercise.change.isNew && (
                      <Text style={[styles.newBadge, { color: colors.primary }]}> NEW</Text>
                    )}
                  </Text>
                </View>

                {/* Weight Comparison */}
                <View style={styles.comparisonRow}>
                  <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                    Top Weight:
                  </Text>
                  <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
                    {Math.round(exercise.current.maxWeight)} lbs
                    {exercise.previous.maxWeight > 0 && (
                      <Text style={[
                        styles.comparisonDelta,
                        { color: exercise.change.weightDelta >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {' '}({exercise.change.weightDelta > 0 ? '+' : ''}{Math.round(exercise.change.weightDelta)} lbs)
                      </Text>
                    )}
                  </Text>
                </View>

                {/* Volume Comparison */}
                <View style={styles.comparisonRow}>
                  <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                    Total Volume:
                  </Text>
                  <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
                    {formatVolume(exercise.current.totalVolume)}
                    {exercise.previous.totalVolume > 0 && !isNaN(exercise.change.volumePercent) && (
                      <Text style={[
                        styles.comparisonDelta,
                        { color: exercise.change.volumePercent >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {' '}({exercise.change.volumePercent > 0 ? '+' : ''}{Math.round(exercise.change.volumePercent)}%)
                      </Text>
                    )}
                  </Text>
                </View>

                {/* Sets */}
                <View style={styles.comparisonRow}>
                  <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                    Sets:
                  </Text>
                  <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
                    {exercise.current.totalSets} sets
                    {exercise.previous.totalSets > 0 && ` (was ${exercise.previous.totalSets})`}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : screenState === 'questions' ? renderQuestionsState()
      : screenState === 'generating' ? renderGeneratingState()
      : screenState === 'results' ? renderResultsState()
      : screenState === 'summary' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }>

        {/* Trend Hero Section */}
        <Card style={styles.summaryCard} shadow="medium">
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                {analysis.trend.emoji} {analysis.trend.title}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {analysis.trend.subtitle}
              </Text>
            </View>
          </View>

          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

          {analysis.previousWeek.workoutsCompleted > 0 ? (
            <>
              <Text style={[styles.statsHeader, { color: colors.textSecondary }]}>
                Last 7 days ({analysis.dateRange.start} to {analysis.dateRange.end})
              </Text>
              <Text style={[styles.statsSubheader, { color: colors.textTertiary }]}>
                vs. previous 7 days
              </Text>
            </>
          ) : (
            <Text style={[styles.statsHeader, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Last 7 days ({analysis.dateRange.start} to {analysis.dateRange.end})
            </Text>
          )}

          {hasWorkouts ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[
                    dynamicStyles.statValue,
                    {
                      color: analysis.trend.workoutsChange > 0 ? colors.success :
                             analysis.trend.workoutsChange < 0 ? colors.error :
                             colors.primary
                    }
                  ]}>
                    {analysis.workoutsCompleted}
                  </Text>
                  <Text style={dynamicStyles.statLabel}>Workouts</Text>
                  {analysis.trend.workoutsChange !== 0 && (
                    <Text style={[styles.changeIndicator, {
                      color: analysis.trend.workoutsChange > 0 ? colors.success : colors.error
                    }]}>
                      {analysis.trend.workoutsChange > 0 ? '+' : ''}{analysis.trend.workoutsChange} vs last week
                    </Text>
                  )}
                </View>

                <View style={dynamicStyles.divider} />

                <View style={styles.statBox}>
                  <Text style={[
                    dynamicStyles.statValue,
                    {
                      color: analysis.trend.volumeChange > 0 ? colors.success :
                             analysis.trend.volumeChange < 0 ? colors.error :
                             colors.primary
                    }
                  ]}>
                    {formatVolume(analysis.totalVolume)}
                  </Text>
                  <Text style={dynamicStyles.statLabel}>Volume (lbs)</Text>
                  {analysis.trend.volumeChange !== 0 && (
                    <Text style={[styles.changeIndicator, {
                      color: analysis.trend.volumeChange > 0 ? colors.success : colors.error
                    }]}>
                      {analysis.trend.volumeChange > 0 ? '+' : ''}{analysis.trend.volumeChange}%
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={dynamicStyles.statValue}>{analysis.totalSets}</Text>
                  <Text style={dynamicStyles.statLabel}>Total Sets</Text>
                </View>

                <View style={dynamicStyles.divider} />

                <View style={styles.statBox}>
                  <Text style={dynamicStyles.statValue}>{formatDuration(analysis.totalDuration)}</Text>
                  <Text style={dynamicStyles.statLabel}>Duration</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={dynamicStyles.emptyText}>
                {isFirstWeek
                  ? 'Welcome to MuscleUp! 👋'
                  : 'No workouts recorded in the last 7 days.'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {isFirstWeek
                  ? 'Complete your first workouts to start tracking progress!'
                  : 'Complete some workouts to get personalized recommendations!'}
              </Text>
            </View>
          )}
        </Card>

        {/* Day-to-Day Progress Preview (if available) */}
        {hasWorkouts && analysis.dayToDayComparison && analysis.dayToDayComparison.lastWeekFullTotal > 0 && (
          <Card style={styles.previewCard} shadow="small">
            <Text style={[styles.previewCardTitle, { color: colors.textPrimary }]}>
              📊 Mid-Week Progress Check
            </Text>
            <Text style={[styles.previewCardSubtitle, { color: colors.textTertiary }]}>
              How you're tracking vs. last week at this point
            </Text>

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            {/* Last Week by Today */}
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                Last week by today:
              </Text>
              <View style={styles.comparisonStatsRow}>
                <Text style={[styles.comparisonStat, { color: colors.textPrimary }]}>
                  {analysis.dayToDayComparison.lastWeekSameDayWorkouts} workouts
                </Text>
                <Text style={[styles.comparisonDot, { color: colors.textTertiary }]}>•</Text>
                <Text style={[styles.comparisonStat, { color: colors.textPrimary }]}>
                  {formatVolume(analysis.dayToDayComparison.lastWeekSameDayVolume)} lbs
                </Text>
              </View>
            </View>

            {/* This Week So Far */}
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                This week so far:
              </Text>
              <View style={styles.comparisonStatsRow}>
                <Text style={[styles.comparisonStat, { color: colors.textPrimary }]}>
                  {analysis.dayToDayComparison.thisWeekSoFarWorkouts} workouts
                </Text>
                <Text style={[styles.comparisonDot, { color: colors.textTertiary }]}>•</Text>
                <Text style={[styles.comparisonStat, { color: colors.textPrimary }]}>
                  {formatVolume(analysis.dayToDayComparison.thisWeekSoFarVolume)} lbs
                </Text>
              </View>

              {/* Delta Badges */}
              {(analysis.dayToDayComparison.workoutsDelta !== 0 || analysis.dayToDayComparison.volumeDelta !== 0) && (
                <View style={styles.deltaBadgesRow}>
                  {analysis.dayToDayComparison.workoutsDelta !== 0 && (
                    <View style={[styles.deltaBadge, {
                      backgroundColor: analysis.dayToDayComparison.workoutsDelta > 0 ? colors.success + '20' : colors.error + '20'
                    }]}>
                      <Text style={[styles.deltaBadgeText, {
                        color: analysis.dayToDayComparison.workoutsDelta > 0 ? colors.success : colors.error
                      }]}>
                        {analysis.dayToDayComparison.workoutsDelta > 0 ? '✅' : '⚠️'} {analysis.dayToDayComparison.workoutsDelta > 0 ? '+' : ''}{analysis.dayToDayComparison.workoutsDelta} workout{Math.abs(analysis.dayToDayComparison.workoutsDelta) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {analysis.dayToDayComparison.volumeDelta !== 0 && (
                    <View style={[styles.deltaBadge, {
                      backgroundColor: analysis.dayToDayComparison.volumeDelta > 0 ? colors.success + '20' : colors.error + '20'
                    }]}>
                      <Text style={[styles.deltaBadgeText, {
                        color: analysis.dayToDayComparison.volumeDelta > 0 ? colors.success : colors.error
                      }]}>
                        {analysis.dayToDayComparison.volumeDelta > 0 ? '+' : ''}{formatVolume(analysis.dayToDayComparison.volumeDelta)} lbs ({analysis.dayToDayComparison.volumePercentChange > 0 ? '+' : ''}{analysis.dayToDayComparison.volumePercentChange}%)
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />

            {/* Full Week Goal */}
            <Text style={[styles.comparisonTitle, { color: colors.textPrimary }]}>
              🎯 Full Week Goal
            </Text>
            <View style={styles.goalSection}>
              <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
                Last week's total: {analysis.dayToDayComparison.lastWeekFullTotal} workouts, {formatVolume(analysis.dayToDayComparison.lastWeekFullVolume)} lbs
              </Text>
              <Text style={[styles.goalProgress, { color: colors.primary }]}>
                You're {analysis.dayToDayComparison.progressPercent}% of the way there!
              </Text>
              {analysis.dayToDayComparison.remainingWorkouts > 0 && (
                <Text style={[styles.goalRemaining, { color: colors.textSecondary }]}>
                  {analysis.dayToDayComparison.remainingWorkouts} more workout{analysis.dayToDayComparison.remainingWorkouts !== 1 ? 's' : ''} to match last week
                </Text>
              )}
            </View>
          </Card>
        )}

        {/* Exercises List */}
        {hasWorkouts && analysis.exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>Top Exercises</Text>
            <Card shadow="small">
              {analysis.exercises.slice(0, 5).map((exercise, index) => (
                <View key={exercise.name}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseInfo}>
                      <Text style={dynamicStyles.exerciseName}>{exercise.name}</Text>
                      <Text style={dynamicStyles.exerciseDetails}>
                        {Math.round(exercise.thisWeek.maxWeight)} lbs × {Math.round(exercise.thisWeek.avgReps)} reps • {exercise.thisWeek.totalSets} sets
                      </Text>
                    </View>
                    <View style={styles.exerciseBadges}>
                      {/* Progress Badge */}
                      {exercise.change && exercise.change.weightDelta !== 0 && (
                        <View style={[styles.progressBadge, {
                          backgroundColor: exercise.change.weightDelta > 0 ? colors.success + '20' : colors.error + '20'
                        }]}>
                          <Text style={[styles.progressText, {
                            color: exercise.change.weightDelta > 0 ? colors.success : colors.error
                          }]}>
                            {exercise.change.weightDelta > 0 ? '↑' : '↓'} {Math.abs(Math.round(exercise.change.weightDelta))} lbs
                          </Text>
                        </View>
                      )}
                      {/* Volume Badge */}
                      {exercise.change && (
                        <View style={[styles.completionBadge, {
                          backgroundColor: exercise.change.volumePercent >= 0 ? colors.success + '20' : colors.error + '20'
                        }]}>
                          <Text style={[styles.completionText, {
                            color: exercise.change.volumePercent >= 0 ? colors.success : colors.error
                          }]}>
                            {exercise.change.volumePercent > 0 ? '+' : ''}{Math.round(exercise.change.volumePercent)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {index < Math.min(4, analysis.exercises.length - 1) && (
                    <View style={dynamicStyles.divider} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Start Check-in Button */}
        {hasWorkouts && (
          <View>
            <Button
              title="Help Atlas Adjust Your Plan"
              onPress={() => setScreenState('questions')}
              style={styles.startButton}
            />
            <Text style={[styles.buttonSubtext, { color: colors.textTertiary }]}>
              Takes 30 seconds • Prevents injury • Maximizes gains
            </Text>
          </View>
        )}

        {/* Custom Comparison Card - Always visible */}
        <Card shadow="small" style={styles.customComparisonCard}>
          <TouchableOpacity
            style={styles.customComparisonTouchable}
            onPress={() => {
              console.log('Custom comparison button pressed');
              setShowCustomComparisonModal(true);
            }}
          >
            <View style={styles.customComparisonContent}>
              <View style={[styles.customComparisonIcon, { backgroundColor: colors.primary + '15' }]}>
                <Text style={styles.customComparisonEmoji}>📅</Text>
              </View>
              <View style={styles.customComparisonTextContainer}>
                <Text style={[styles.customComparisonButtonText, { color: colors.textPrimary }]}>
                  Custom Comparison
                </Text>
                <Text style={[styles.customComparisonSubtext, { color: colors.textSecondary }]}>
                  Compare any date ranges you want
                </Text>
              </View>
              <Text style={[styles.customComparisonArrow, { color: colors.textTertiary }]}>→</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>
      ) : null}

      {/* Custom Comparison Overlay - Absolute positioned since Modal doesn't work */}
      <CustomComparisonModal
        visible={showCustomComparisonModal}
        onClose={() => setShowCustomComparisonModal(false)}
        onGenerateComparison={handleGenerateCustomComparison}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  summaryCard: {
    marginBottom: spacing.xl,
  },
  previewCard: {
    marginBottom: spacing.xl,
  },
  previewCardTitle: {
    ...typography.h4,
    fontWeight: '700' as const,
    marginBottom: spacing.xs / 2,
  },
  previewCardSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  dateRange: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  // Hero section styles
  heroSection: {
    paddingVertical: spacing.md,
  },
  heroContent: {
    alignItems: 'center' as const,
  },
  heroTitle: {
    ...typography.h3,
    fontWeight: '700' as const,
    marginBottom: spacing.xs / 2,
    textAlign: 'center' as const,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    textAlign: 'center' as const,
  },
  dividerLine: {
    height: 1,
    marginVertical: spacing.md,
  },
  statsHeader: {
    ...typography.caption,
    marginBottom: spacing.xs / 2,
    textAlign: 'center' as const,
  },
  statsSubheader: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
  },
  changeIndicator: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  divider: {
    width: 1,
    height: 40,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  exerciseDetails: {
    ...typography.bodySmall,
  },
  exerciseBadges: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  progressBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  completionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  completionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  startButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  buttonSubtext: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
  questionCard: {
    marginBottom: spacing.lg,
  },
  questionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  questionSubtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
  },
  scaleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButtonText: {
    ...typography.h3,
  },
  scaleButtonsContainer: {
    marginBottom: spacing.sm,
  },
  scaleButtonRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.xs,
  },
  compactScaleButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginHorizontal: spacing.xs / 2,
  },
  compactScaleButtonText: {
    ...typography.body,
    fontSize: 16,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  scaleLabelText: {
    ...typography.caption,
    fontSize: 11,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  generateButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  loadingSubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  messageCard: {
    marginBottom: spacing.xl,
  },
  messageTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  deloadBadge: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
  },
  deloadText: {
    ...typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  recommendationCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recExerciseName: {
    ...typography.body,
    fontWeight: '700',
    flex: 1,
  },
  changeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  changeBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  recWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recWeight: {
    ...typography.h4,
  },
  recArrow: {
    ...typography.h4,
    marginHorizontal: spacing.sm,
  },
  recChange: {
    ...typography.bodySmall,
    marginLeft: spacing.xs,
  },
  recReason: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  lockInButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  // New emoji scale styles
  mainQuestionCard: {
    marginBottom: spacing.lg,
  },
  mainQuestionTitle: {
    ...typography.h3,
    marginBottom: spacing.xl,
    textAlign: 'center' as const,
  },
  emojiScaleContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emojiButton: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: spacing.xs / 2,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  emojiText: {
    fontSize: 32,
    marginBottom: spacing.xs / 2,
  },
  emojiValue: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emojiLabels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  emojiLabelText: {
    ...typography.caption,
    fontSize: 11,
  },
  addNotesButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  addNotesText: {
    ...typography.body,
    fontWeight: '500' as const,
  },
  notesContainer: {
    marginTop: spacing.md,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  valueProposition: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center' as const,
  },
  valuePropText: {
    ...typography.bodySmall,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  // Preview styles
  previewContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewHeader: {
    marginBottom: spacing.md,
  },
  previewTitle: {
    ...typography.body,
    fontWeight: '700' as const,
    marginBottom: spacing.xs / 2,
  },
  previewSubtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  previewItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  previewExerciseName: {
    ...typography.body,
    flex: 1,
    marginRight: spacing.sm,
  },
  previewChangeContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  previewIcon: {
    fontSize: 16,
    marginRight: spacing.xs / 2,
  },
  previewChange: {
    ...typography.bodySmall,
    fontWeight: '600' as const,
  },
  previewDisclaimer: {
    ...typography.caption,
    fontSize: 10,
    marginTop: spacing.sm,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  settingsButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    marginTop: spacing.lg,
  },
  settingsButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
  },
  // Day-to-day comparison styles
  comparisonTitle: {
    ...typography.h4,
    fontWeight: '700' as const,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  comparisonSection: {
    marginBottom: spacing.md,
  },
  comparisonLabel: {
    ...typography.caption,
    marginBottom: spacing.xs / 2,
  },
  comparisonStatsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
  },
  comparisonStat: {
    ...typography.body,
    fontWeight: '600' as const,
  },
  comparisonDot: {
    ...typography.body,
    marginHorizontal: spacing.xs,
  },
  deltaBadgesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  deltaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  deltaBadgeText: {
    ...typography.caption,
    fontWeight: '600' as const,
    fontSize: 11,
  },
  goalSection: {
    marginTop: spacing.xs,
  },
  goalLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  goalProgress: {
    ...typography.h4,
    fontWeight: '700' as const,
    marginBottom: spacing.xs / 2,
  },
  goalRemaining: {
    ...typography.caption,
    fontStyle: 'italic' as const,
  },
  customComparisonCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  customComparisonTouchable: {
    padding: spacing.md,
  },
  customComparisonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  customComparisonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.md,
  },
  customComparisonEmoji: {
    fontSize: 24,
  },
  customComparisonTextContainer: {
    flex: 1,
  },
  customComparisonButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
    marginBottom: spacing.xs / 2,
  },
  customComparisonSubtext: {
    ...typography.caption,
    fontSize: 12,
  },
  customComparisonArrow: {
    ...typography.h3,
    marginLeft: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
  },
  customComparisonTitle: {
    ...typography.h2,
    fontWeight: 'bold' as const,
    marginBottom: spacing.md,
  },
  periodRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  periodBox: {
    flex: 1,
  },
  vsText: {
    ...typography.h3,
    marginHorizontal: spacing.sm,
    color: '#9CA3AF',
  },
  periodLabel: {
    ...typography.caption,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.xs / 2,
  },
  periodDate: {
    ...typography.body,
    fontWeight: '600' as const,
    marginBottom: spacing.xs / 2,
  },
  periodStat: {
    ...typography.caption,
  },
  trendBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    borderRadius: 12,
  },
  trendEmoji: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  trendTextContainer: {
    flex: 1,
  },
  trendTitle: {
    ...typography.bodyLarge,
    fontWeight: 'bold' as const,
    marginBottom: spacing.xs / 4,
  },
  trendSubtitle: {
    ...typography.body,
  },
  exercisesList: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    ...typography.h3,
    fontWeight: 'bold' as const,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  exerciseCard: {
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    marginBottom: spacing.sm,
  },
  customExerciseName: {
    ...typography.bodyLarge,
    fontWeight: 'bold' as const,
  },
  newBadge: {
    ...typography.caption,
    fontWeight: 'bold' as const,
  },
  comparisonRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.xs,
  },
  comparisonValue: {
    ...typography.body,
    fontWeight: '600' as const,
  },
  comparisonDelta: {
    ...typography.bodySmall,
    fontWeight: 'bold' as const,
  },
});

export default WeeklyCheckinScreen;
