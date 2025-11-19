// usePreferences Hook - State management for workout preferences
import { useState, useEffect, useCallback } from 'react';
import { preferencesService } from '../services/preferences';
import {
  WorkoutPreferences,
  PreferenceUpdate,
  DEFAULT_PREFERENCES,
} from '../types/preferences';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<WorkoutPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load preferences on mount
   */
  useEffect(() => {
    loadPreferences();
  }, []);

  /**
   * Load preferences from storage
   */
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loaded = await preferencesService.loadPreferences();
      setPreferences(loaded);
    } catch (err) {
      setError('Failed to load preferences');
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update multiple preferences at once
   */
  const updatePreferences = useCallback(async (updates: PreferenceUpdate) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await preferencesService.updatePreferences(updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError('Failed to save preferences');
      console.error('Error updating preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Update a single preference
   */
  const updatePreference = useCallback(
    async <K extends keyof WorkoutPreferences>(
      key: K,
      value: WorkoutPreferences[K]
    ) => {
      return updatePreferences({ [key]: value } as PreferenceUpdate);
    },
    [updatePreferences]
  );

  /**
   * Reset preferences to defaults
   */
  const resetPreferences = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const defaults = await preferencesService.resetPreferences();
      setPreferences(defaults);
      return defaults;
    } catch (err) {
      setError('Failed to reset preferences');
      console.error('Error resetting preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Export preferences as JSON
   */
  const exportPreferences = useCallback(async (): Promise<string> => {
    try {
      return await preferencesService.exportPreferences();
    } catch (err) {
      console.error('Error exporting preferences:', err);
      throw err;
    }
  }, []);

  /**
   * Import preferences from JSON
   */
  const importPreferences = useCallback(async (jsonString: string) => {
    try {
      setSaving(true);
      setError(null);
      const imported = await preferencesService.importPreferences(jsonString);
      setPreferences(imported);
      return imported;
    } catch (err) {
      setError('Failed to import preferences');
      console.error('Error importing preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Toggle a boolean preference
   */
  const togglePreference = useCallback(
    async (key: keyof WorkoutPreferences) => {
      const currentValue = preferences[key];
      if (typeof currentValue === 'boolean') {
        return updatePreference(key, !currentValue as WorkoutPreferences[typeof key]);
      }
    },
    [preferences, updatePreference]
  );

  return {
    // State
    preferences,
    loading,
    saving,
    error,

    // Actions
    loadPreferences,
    updatePreferences,
    updatePreference,
    resetPreferences,
    togglePreference,
    exportPreferences,
    importPreferences,
  };
};

export default usePreferences;
