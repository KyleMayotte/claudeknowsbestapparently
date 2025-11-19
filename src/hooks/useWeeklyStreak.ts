// Weekly Streak Hook
// Shared logic for calculating and managing weekly streaks

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../context/AuthContext';
import { usePreferences } from './usePreferences';

interface WorkoutHistory {
  id: string;
  date: string;
  templateName: string;
}

export interface WeeklyStreakData {
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  thisWeekWorkouts: number;
  loading: boolean;
}

export const useWeeklyStreak = (): WeeklyStreakData => {
  const { user } = useAuthContext();
  const { preferences, updatePreference } = usePreferences();

  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const calculateStreak = async () => {
        try {
          if (!user?.email) return;

          setLoading(true);

          // Check and reset monthly freezes if needed
          const now = new Date();
          const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
          let freezeData = preferences.streakFreezeData || {
            freezesAvailable: 1,
            lastResetMonth: currentMonth,
            frozenWeeks: [],
            pendingFreezeWeek: undefined,
          };

          // Monthly reset logic
          if (freezeData.lastResetMonth !== currentMonth) {
            freezeData = {
              ...freezeData,
              freezesAvailable: 1,
              lastResetMonth: currentMonth,
            };
            await updatePreference('streakFreezeData', freezeData);
          }

          const historyKey = `@muscleup/workout_history_${user.email}`;
          const historyData = await AsyncStorage.getItem(historyKey);

          if (!historyData) {
            setLoading(false);
            return;
          }

          const workouts: WorkoutHistory[] = JSON.parse(historyData);
          setTotalWorkouts(workouts.length);

          if (workouts.length === 0) {
            setLoading(false);
            return;
          }

          // Group workouts by week (Sunday = start of week)
          const weeklyGroups = new Map<string, number>();
          workouts.forEach(w => {
            const date = new Date(w.date);
            // Check if date is valid
            if (isNaN(date.getTime())) {
              console.warn('Invalid date in workout:', w.date);
              return;
            }
            const sunday = new Date(date);
            sunday.setDate(date.getDate() - date.getDay());
            sunday.setHours(0, 0, 0, 0);
            const weekKey = sunday.toISOString().split('T')[0];
            weeklyGroups.set(weekKey, (weeklyGroups.get(weekKey) || 0) + 1);
          });

          // Sort weeks (newest first)
          const sortedWeeks = Array.from(weeklyGroups.entries())
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

          // Get current week's Sunday
          const currentSunday = new Date(now);
          currentSunday.setDate(now.getDate() - now.getDay());
          currentSunday.setHours(0, 0, 0, 0);
          const currentWeekKey = currentSunday.toISOString().split('T')[0];

          // Calculate weekly streak with freeze support
          const weeklyGoal = preferences.weeklyWorkoutGoal || 4;
          let currentStreak = 0;
          let maxStreak = 0;
          let lastCompletedWeek: string | undefined = undefined;
          const frozenWeeks = new Set(freezeData.frozenWeeks);
          let freezeUsedThisCalculation = false;

          for (const [weekKey, count] of sortedWeeks) {
            // Skip current week (incomplete)
            if (weekKey === currentWeekKey) {
              continue;
            }

            // Check if this week hit the goal OR is frozen
            const isFrozen = frozenWeeks.has(weekKey);
            const hitGoal = count >= weeklyGoal;

            if (hitGoal || isFrozen) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
              if (!lastCompletedWeek) {
                lastCompletedWeek = weekKey;
              }
            } else {
              // Streak would break - check for REACTIVE freeze
              if (freezeData.freezesAvailable > 0 && !freezeUsedThisCalculation) {
                // Auto-activate freeze to save streak
                console.log(`🛡️ Auto-activating freeze for week ${weekKey}`);
                frozenWeeks.add(weekKey);
                freezeData = {
                  ...freezeData,
                  freezesAvailable: 0,
                  frozenWeeks: Array.from(frozenWeeks),
                };
                freezeUsedThisCalculation = true;

                // Continue streak with freeze
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
                if (!lastCompletedWeek) {
                  lastCompletedWeek = weekKey;
                }
              } else {
                // No freeze available, streak broken
                break;
              }
            }
          }

          // Update streak state
          setStreak(currentStreak);

          // Check if we need to update Firestore
          const savedStreak = preferences.weeklyStreakData?.currentStreak || 0;
          const savedLongest = preferences.weeklyStreakData?.longestStreak || 0;
          const newLongest = Math.max(maxStreak, savedLongest);

          setLongestStreak(newLongest);

          // Save to Firestore if streak changed or longest changed or freeze used
          if (currentStreak !== savedStreak || newLongest !== savedLongest || freezeUsedThisCalculation) {
            await updatePreference('weeklyStreakData', {
              currentStreak,
              longestStreak: newLongest,
              lastStreakWeek: lastCompletedWeek,
            });

            if (freezeUsedThisCalculation) {
              await updatePreference('streakFreezeData', freezeData);
            }
          }

          // Calculate this week's workout count (reuse currentSunday)
          const thisWeekCount = workouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= currentSunday;
          }).length;

          setThisWeekWorkouts(thisWeekCount);
        } catch (error) {
          console.error('Error calculating streak:', error);
        } finally {
          setLoading(false);
        }
      };

      calculateStreak();
    }, [user, preferences.weeklyWorkoutGoal, preferences.weeklyStreakData, preferences.streakFreezeData, updatePreference])
  );

  return {
    streak,
    longestStreak,
    totalWorkouts,
    thisWeekWorkouts,
    loading,
  };
};
