import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Animated, Vibration, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, WeeklyStreakCard, Icon } from '../components';
import { typography, spacing } from '../theme';
import FriendsScreen from './FriendsScreen';
import AtlasChatScreen from './AtlasChatScreen';
import { getTodayDate } from '../utils/date';
import { useNavigation } from '@react-navigation/native';
import { useWeeklyStreak } from '../hooks/useWeeklyStreak';
import { usePreferences } from '../hooks/usePreferences';

type ModalScreen = null | 'friends' | 'atlas';

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string;
  duration: number;
  exercises: any[];
}

const HomeDashboard: React.FC = () => {
  const { theme, colors } = useTheme();
  const { user, logout, token } = useAuthContext();
  const navigation = useNavigation<any>();
  const [modalScreen, setModalScreen] = useState<ModalScreen>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const userEmail = user?.email || '';
  const authToken = token || '';

  // Streak data
  const { streak, longestStreak, totalWorkouts, thisWeekWorkouts, loading: streakLoading } = useWeeklyStreak();
  const { preferences, updatePreference } = usePreferences();

  // Pulsing animation for Start Workout emoji
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Press scale animation for Start Workout button
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create pulsing animation loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  // Handle press animations with haptic feedback
  const handlePressIn = () => {
    // Trigger haptic feedback
    Vibration.vibrate(10); // Light 10ms vibration
    // Animate scale down
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    // Animate scale back to normal
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handleProactiveFreeze = async () => {
    const freezeData = preferences.streakFreezeData;

    if (!freezeData || freezeData.freezesAvailable === 0) {
      Alert.alert(
        'No Freeze Available',
        'You have already used your freeze this month. Freezes reset on the 1st of each month.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get next week's Sunday
    const now = new Date();
    const daysUntilNextSunday = 7 - now.getDay();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilNextSunday);
    nextSunday.setHours(0, 0, 0, 0);
    const nextWeekKey = nextSunday.toISOString().split('T')[0];

    Alert.alert(
      'Use Streak Freeze?',
      `This will protect your streak for the week starting ${nextSunday.toLocaleDateString()}. You can miss your workout goal that week without breaking your streak.\n\nYou have ${freezeData.freezesAvailable} freeze available this month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Freeze',
          onPress: async () => {
            const updatedFreezeData = {
              ...freezeData,
              freezesAvailable: 0,
              frozenWeeks: [...freezeData.frozenWeeks, nextWeekKey],
              pendingFreezeWeek: nextWeekKey,
            };
            await updatePreference('streakFreezeData', updatedFreezeData);
            Alert.alert('Freeze Activated!', `Your streak is protected for the week of ${nextSunday.toLocaleDateString()} 🛡️`);
          },
        },
      ]
    );
  };

  // Load workout history
  useEffect(() => {
    loadWorkoutHistory();
  }, [refreshKey]);

  // Reload data when screen gains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  const loadWorkoutHistory = async () => {
    try {
      const userEmail = user?.email || 'guest';
      const storageKey = `@muscleup/workout_history_${userEmail}`;
      const storedHistory = await AsyncStorage.getItem(storageKey);
      if (storedHistory) {
        setWorkoutHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to load workout history:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get recent activity (last 5 items)
  const getRecentActivity = () => {
    const today = getTodayDate();
    const todayWorkouts = workoutHistory.filter(w => w.date === today);

    const activities: Array<{
      id: string;
      type: 'workout';
      title: string;
      subtitle: string;
      emoji: string;
      time?: string;
    }> = [];

    // Add workouts
    todayWorkouts.forEach(workout => {
      activities.push({
        id: workout.id,
        type: 'workout',
        title: workout.templateName,
        subtitle: `${workout.exercises.length} exercises • ${workout.duration} min`,
        emoji: workout.emoji,
      });
    });

    return activities.slice(0, 5);
  };

  const recentActivity = getRecentActivity();

  // Show modal screens
  if (modalScreen === 'friends') {
    return <FriendsScreen onBack={() => setModalScreen(null)} />;
  }

  if (modalScreen === 'atlas') {
    return <AtlasChatScreen onBack={() => setModalScreen(null)} userEmail={userEmail} />;
  }

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    greeting: {
      ...styles.greeting,
      color: colors.textSecondary,
    },
    userName: {
      ...styles.userName,
      color: colors.textPrimary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: colors.textPrimary,
    },
    emptyText: {
      ...styles.emptyText,
      color: colors.textSecondary,
    },
    emptySubtext: {
      ...styles.emptySubtext,
      color: colors.textTertiary,
    },
    avatarSmall: {
      ...styles.avatarSmall,
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    compactActivityText: {
      ...styles.compactActivityText,
      color: colors.textPrimary,
    },
    actionCard: {
      ...styles.actionCard,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionTitle: {
      ...styles.actionTitle,
      color: colors.textPrimary,
    },
    actionSubtitle: {
      ...styles.actionSubtitle,
      color: colors.textSecondary,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={dynamicStyles.avatarSmall}>
              <Icon name="dumbbell" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={dynamicStyles.greeting}>{getGreeting()}</Text>
              <Text style={dynamicStyles.userName}>{user?.name || user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Icon name="settings" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Weekly Streak Card - Compact Mode */}
        {!streakLoading && (
          <WeeklyStreakCard
            compact={true}
            streak={streak}
            longestStreak={longestStreak}
            totalWorkouts={totalWorkouts}
            thisWeekWorkouts={thisWeekWorkouts}
            weeklyGoal={preferences.weeklyWorkoutGoal || 4}
            freezesAvailable={preferences.streakFreezeData?.freezesAvailable || 0}
            onPressFreezeButton={handleProactiveFreeze}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          {/* Primary Action - Full Width with Gradient & Press Animation */}
          <Pressable
            onPress={() => navigation.navigate('Workout')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.heroCardWrapper}>
            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
              <LinearGradient
                colors={[colors.primary, colors.primary + 'CC', colors.primary + '99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCardGradient}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: spacing.xs }}>
                  <Icon name="dumbbell" size={40} color="#FFFFFF" />
                </Animated.View>
                <Text style={styles.heroTitle}>Start Workout</Text>
                <Text style={styles.heroSubtitle}>Begin your training session</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>

          {/* Action Cards Grid - 2x3 Layout (Organized by category) */}
          <View style={styles.actionGridContainer}>
            {/* Row 1: AI Features */}
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => navigation.navigate('ProgramGenerator')}
              shadow="none">
              <Icon name="clipboard" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>AI Program</Text>
              <Text style={dynamicStyles.actionSubtitle}>Custom plans</Text>
            </Card>
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => setModalScreen('atlas')}
              shadow="none">
              <Icon name="atlas-robot" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>Chat Atlas</Text>
              <Text style={dynamicStyles.actionSubtitle}>Ask questions</Text>
            </Card>

            {/* Row 2: Tracking Features */}
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => navigation.navigate('Progress')}
              shadow="none">
              <Icon name="chart" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>Progress</Text>
              <Text style={dynamicStyles.actionSubtitle}>Track stats</Text>
            </Card>
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => navigation.navigate('WeeklyCheckin')}
              shadow="none">
              <Icon name="calendar" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>Weekly Check-in</Text>
              <Text style={dynamicStyles.actionSubtitle}>Review & adapt</Text>
            </Card>

            {/* Row 3: Social & Settings */}
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => setModalScreen('friends')}
              shadow="none">
              <Icon name="users" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>Friends</Text>
              <Text style={dynamicStyles.actionSubtitle}>Add & invite</Text>
            </Card>
            <Card
              style={dynamicStyles.actionCard}
              onPress={() => navigation.navigate('Preferences')}
              shadow="none">
              <Icon name="settings" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={dynamicStyles.actionTitle}>Preferences</Text>
              <Text style={dynamicStyles.actionSubtitle}>Customize settings</Text>
            </Card>
          </View>
        </View>

        {/* Recent Activity - Compact (only show if workouts exist today) */}
        {recentActivity.length > 0 && (
          <Card style={styles.compactActivityCard} shadow="small">
            <Text style={styles.compactActivityEmoji}>{recentActivity[0].emoji}</Text>
            <Text style={dynamicStyles.compactActivityText}>
              {recentActivity[0].title} • {recentActivity[0].subtitle}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  settingsIcon: {
    fontSize: 28,
  },
  greeting: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.h3,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  heroCardWrapper: {
    marginBottom: spacing.md,
  },
  heroCardGradient: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
  },
  heroEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.h4,
    fontWeight: '700',
    marginBottom: 2,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1.5,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    ...typography.label,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  actionSubtitle: {
    ...typography.caption,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  compactActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  compactActivityEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  compactActivityText: {
    ...typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
});

export default HomeDashboard;
