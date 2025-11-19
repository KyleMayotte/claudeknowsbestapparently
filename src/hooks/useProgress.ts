// Progress tracking hook
// Provides weight tracking and progress monitoring

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import progressService, { WeightEntry } from '../services/progress';

const WEIGHT_ENTRIES_KEY = '@weight_entries';

export const useProgress = (userEmail: string, token: string) => {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from local storage
  const loadFromStorage = async (): Promise<WeightEntry[]> => {
    try {
      const stored = await AsyncStorage.getItem(WEIGHT_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return [];
    }
  };

  // Save to local storage
  const saveToStorage = async (entries: WeightEntry[]) => {
    try {
      await AsyncStorage.setItem(WEIGHT_ENTRIES_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  };

  // Fetch weight entries
  const fetchWeightEntries = useCallback(async () => {
    try {
      setError(null);

      // Load from storage immediately for instant display
      const localData = await loadFromStorage();
      setWeightEntries(localData);

      // Then try to sync with API in the background (non-blocking)
      try {
        const data = await progressService.getWeightEntries(userEmail, token);
        setWeightEntries(data);
        await saveToStorage(data);
        return data;
      } catch (apiError) {
        // Silently fail - we already have local data displayed
        console.log('API sync failed, using local weight entries');
        return localData;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weight entries');
    }
  }, [userEmail, token]);

  // Add weight entry (optimistic update)
  const addWeightEntry = useCallback(async (entry: WeightEntry) => {
    try {
      setError(null);

      // Always create a new entry (save every single entry, even on same date)
      const tempEntry: WeightEntry = {
        ...entry,
        _id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      // Update UI immediately (optimistic update)
      const updated = [...weightEntries, tempEntry];
      setWeightEntries(updated);
      await saveToStorage(updated);

      // Then try to save to API in the background
      try {
        const newEntry = await progressService.addWeightEntry(entry, token);
        // Replace temp entry with real entry from API
        const finalUpdated = updated.filter(e => e._id !== tempEntry._id);
        const withNewEntry = [...finalUpdated, newEntry];
        setWeightEntries(withNewEntry);
        await saveToStorage(withNewEntry);
        return newEntry;
      } catch (apiError) {
        // API failed - keep the temp entry we already saved
        console.log('API unavailable, saved to local storage only');
        return tempEntry;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add weight entry');
      throw err;
    }
  }, [weightEntries, token]);

  // Delete weight entry (optimistic update)
  const deleteWeightEntry = useCallback(async (id: string) => {
    try {
      setError(null);

      // Update UI immediately (optimistic update)
      const updated = weightEntries.filter(e => e._id !== id);
      setWeightEntries(updated);
      await saveToStorage(updated);

      // Then try to delete from API in the background
      try {
        await progressService.deleteWeightEntry(id, token);
      } catch (apiError) {
        console.log('API unavailable, deleted from local storage only');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete weight entry');
      throw err;
    }
  }, [weightEntries, token]);

  // Get current weight (most recent entry)
  const getCurrentWeight = useCallback(() => {
    if (weightEntries.length === 0) return null;
    const sorted = [...weightEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0]?.weight;
  }, [weightEntries]);

  // Get starting weight (oldest entry)
  const getStartingWeight = useCallback(() => {
    if (weightEntries.length === 0) return null;
    const sorted = [...weightEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted[0]?.weight;
  }, [weightEntries]);

  // Calculate weight change
  const getWeightChange = useCallback(() => {
    const current = getCurrentWeight();
    const start = getStartingWeight();
    if (current === null || start === null) return null;
    return current - start;
  }, [getCurrentWeight, getStartingWeight]);

  return {
    weightEntries,
    loading,
    error,
    fetchWeightEntries,
    addWeightEntry,
    deleteWeightEntry,
    getCurrentWeight,
    getStartingWeight,
    getWeightChange,
  };
};
