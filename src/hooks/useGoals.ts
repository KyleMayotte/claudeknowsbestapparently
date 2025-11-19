// Goals management hook
// Provides fitness goals and recommendations

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import goalsService, { UserGoals, GoalRecommendationInput } from '../services/goals';

const GOALS_STORAGE_KEY = '@muscleup/goals';

export const useGoals = (userEmail: string, token: string) => {
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from local storage
  const loadFromStorage = async (): Promise<UserGoals | null> => {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load goals from storage:', error);
      return null;
    }
  };

  // Save to local storage
  const saveToStorage = async (goalsData: UserGoals) => {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goalsData));
    } catch (error) {
      console.error('Failed to save goals to storage:', error);
    }
  };

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    try {
      setError(null);

      // Load from storage immediately for instant display
      const localGoals = await loadFromStorage();
      if (localGoals) {
        setGoals(localGoals);
      }

      // Then try to sync with API in the background
      try {
        const data = await goalsService.getGoals(userEmail, token);
        setGoals(data);
        await saveToStorage(data);
        return data;
      } catch (apiError) {
        // Silently fail - we already have local data displayed
        console.log('API sync failed, using local goals');
        return localGoals;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch goals');
    }
  }, [userEmail, token]);

  // Save goals (optimistic update with offline support)
  const saveGoals = useCallback(async (updatedGoals: UserGoals) => {
    try {
      setError(null);

      // Save to local storage immediately (optimistic update)
      const goalsWithMetadata = {
        ...updatedGoals,
        _id: updatedGoals._id || Date.now().toString(),
        updatedAt: new Date().toISOString(),
      };

      setGoals(goalsWithMetadata);
      await saveToStorage(goalsWithMetadata);

      // Then try to sync with API in the background
      try {
        const saved = await goalsService.saveGoals(updatedGoals, token);
        setGoals(saved);
        await saveToStorage(saved);
        return saved;
      } catch (apiError) {
        // API failed but we already saved locally
        console.log('API unavailable, saved goals to local storage only');
        return goalsWithMetadata;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save goals');
      throw err;
    }
  }, [token]);

  // Get AI recommendations
  const getRecommendations = useCallback(async (input: GoalRecommendationInput) => {
    try {
      setLoading(true);
      setError(null);
      const recommendations = await goalsService.getRecommendations(input, token);
      return recommendations;
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    saveGoals,
    getRecommendations,
  };
};
