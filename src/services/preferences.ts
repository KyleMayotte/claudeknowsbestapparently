// Preferences Service - Client-side storage for workout preferences
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutPreferences,
  DEFAULT_PREFERENCES,
  PreferenceUpdate,
} from '../types/preferences';
import {
  scheduleDailyWorkoutReminder,
  cancelDailyWorkoutReminder,
  scheduleWorkoutRemindersForDays,
  cancelAllWorkoutReminders,
  scheduleWeeklyCheckinReminder,
  cancelWeeklyCheckinReminder,
  initializeNotifications,
  requestNotificationPermission,
} from './notifications';

const STORAGE_KEY = '@muscleup/preferences';

class PreferencesService {
  /**
   * Load preferences from AsyncStorage
   * Returns default preferences if none exist
   */
  async loadPreferences(): Promise<WorkoutPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Migration: Handle old progressiveOverloadConfig structure
        if (parsed.progressiveOverloadConfig) {
          const oldConfig = parsed.progressiveOverloadConfig;
          // Check if this is the old format (has increaseAfterAttempts)
          if ('increaseAfterAttempts' in oldConfig && !('targetRepRange' in oldConfig)) {
            // Migrate to new format
            parsed.progressiveOverloadConfig = {
              weightIncrement: oldConfig.increaseWeight || 5,
              targetRepRange: { min: 8, max: 12 },
              increaseAtReps: 12,
            };
          }
          // Add increaseAtReps if missing (from version without it)
          if (!('increaseAtReps' in oldConfig)) {
            parsed.progressiveOverloadConfig.increaseAtReps =
              oldConfig.targetRepRange?.max || 12;
          }
        }

        // Migration: Remove old unused preferences if present
        if (parsed.progressiveOverloadStyle) {
          delete parsed.progressiveOverloadStyle;
        }
        if (parsed.restTimerDefaults) {
          delete parsed.restTimerDefaults;
        }
        if (parsed.defaultSetsPerExercise) {
          delete parsed.defaultSetsPerExercise;
        }
        if (parsed.exerciseOrderPreference) {
          delete parsed.exerciseOrderPreference;
        }
        if (parsed.showPRCelebrations !== undefined) {
          delete parsed.showPRCelebrations;
        }
        if (parsed.hapticIntensity) {
          delete parsed.hapticIntensity;
        }

        // Merge with defaults to handle new preferences added in updates
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
      return DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save preferences to AsyncStorage
   */
  async savePreferences(preferences: WorkoutPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  }

  /**
   * Update specific preferences (partial update)
   */
  async updatePreferences(updates: PreferenceUpdate): Promise<WorkoutPreferences> {
    try {
      const current = await this.loadPreferences();
      const updated = { ...current, ...updates };
      await this.savePreferences(updated);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<WorkoutPreferences> {
    try {
      await this.savePreferences(DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Get a specific preference value
   */
  async getPreference<K extends keyof WorkoutPreferences>(
    key: K
  ): Promise<WorkoutPreferences[K]> {
    const preferences = await this.loadPreferences();
    return preferences[key];
  }

  /**
   * Set a specific preference value
   */
  async setPreference<K extends keyof WorkoutPreferences>(
    key: K,
    value: WorkoutPreferences[K]
  ): Promise<void> {
    await this.updatePreferences({ [key]: value } as PreferenceUpdate);
  }

  /**
   * Export preferences as JSON string (for backup/sharing)
   */
  async exportPreferences(): Promise<string> {
    const preferences = await this.loadPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  /**
   * Import preferences from JSON string
   */
  async importPreferences(jsonString: string): Promise<WorkoutPreferences> {
    try {
      const preferences = JSON.parse(jsonString);
      // Validate it has the right structure
      const merged = { ...DEFAULT_PREFERENCES, ...preferences };
      await this.savePreferences(merged);
      return merged;
    } catch (error) {
      console.error('Error importing preferences:', error);
      throw new Error('Invalid preferences format');
    }
  }

  /**
   * Clear all preferences (for testing/debugging)
   */
  async clearPreferences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing preferences:', error);
      throw error;
    }
  }

  /**
   * Initialize notifications system
   * Should be called on app startup
   */
  async initializeNotificationSystem(): Promise<void> {
    try {
      await initializeNotifications();
      console.log('Notification system initialized');
    } catch (error) {
      console.error('Error initializing notification system:', error);
    }
  }

  /**
   * Enable workout reminders
   * Requests permission and schedules reminders for selected days
   */
  async enableWorkoutReminders(time: string, days: number[], customMessage?: string): Promise<boolean> {
    try {
      console.log('[DEBUG] enableWorkoutReminders called with time:', time, 'days:', days, 'customMessage:', customMessage);

      // Request permission
      const hasPermission = await requestNotificationPermission();
      console.log('[DEBUG] requestNotificationPermission returned:', hasPermission);

      if (!hasPermission) {
        console.log('[DEBUG] Notification permission denied');
        return false;
      }

      // Cancel any existing reminders first
      await cancelAllWorkoutReminders();

      // Schedule reminders for selected days
      console.log('[DEBUG] Calling scheduleWorkoutRemindersForDays...');
      const notificationIds = await scheduleWorkoutRemindersForDays(days, time, customMessage);
      console.log('[DEBUG] scheduleWorkoutRemindersForDays returned IDs:', notificationIds);

      if (notificationIds.length === 0) {
        console.error('[ERROR] Failed to schedule workout reminders');
        return false;
      }

      console.log('[SUCCESS] Workout reminders enabled for', days.length, 'days');
      return true;
    } catch (error) {
      console.error('[ERROR] Error enabling workout reminders:', error);
      console.error('[ERROR] Error details:', JSON.stringify(error));
      return false;
    }
  }

  /**
   * Disable workout reminders
   * Cancels all scheduled notifications
   */
  async disableWorkoutReminders(): Promise<void> {
    try {
      await cancelAllWorkoutReminders();
      console.log('Workout reminders disabled');
    } catch (error) {
      console.error('Error disabling workout reminders:', error);
    }
  }

  /**
   * Update workout reminder days
   * Reschedules notifications with new days
   */
  async updateWorkoutReminderDays(days: number[], time: string, customMessage?: string): Promise<boolean> {
    try {
      // Cancel all existing reminders
      await cancelAllWorkoutReminders();

      // Schedule with new days
      const notificationIds = await scheduleWorkoutRemindersForDays(days, time, customMessage);
      if (notificationIds.length === 0) {
        console.error('Failed to reschedule workout reminders');
        return false;
      }

      console.log(`Workout reminders updated for ${days.length} days`);
      return true;
    } catch (error) {
      console.error('Error updating workout reminder days:', error);
      return false;
    }
  }

  /**
   * Update reminder time
   * Reschedules the notification with new time
   */
  async updateReminderTime(time: string, customMessage?: string): Promise<boolean> {
    try {
      // Cancel existing reminder
      await cancelDailyWorkoutReminder();

      // Schedule with new time
      const notificationId = await scheduleDailyWorkoutReminder(time, customMessage);
      if (!notificationId) {
        console.error('Failed to reschedule workout reminder');
        return false;
      }

      console.log('Reminder time updated to', time);
      return true;
    } catch (error) {
      console.error('Error updating reminder time:', error);
      return false;
    }
  }

  /**
   * Enable weekly check-in reminders
   * Schedules notification for specified day and time
   */
  async enableWeeklyCheckinReminder(dayOfWeek: number = 0, time: string = '20:00'): Promise<boolean> {
    try {
      console.log('[DEBUG] enableWeeklyCheckinReminder called with dayOfWeek:', dayOfWeek, 'time:', time);

      // Request permission
      const hasPermission = await requestNotificationPermission();
      console.log('[DEBUG] requestNotificationPermission returned:', hasPermission);

      if (!hasPermission) {
        console.log('[DEBUG] Notification permission denied');
        return false;
      }

      // Schedule weekly reminder
      console.log('[DEBUG] Calling scheduleWeeklyCheckinReminder...');
      const notificationId = await scheduleWeeklyCheckinReminder(dayOfWeek, time);
      console.log('[DEBUG] scheduleWeeklyCheckinReminder returned ID:', notificationId);

      if (!notificationId) {
        console.error('[ERROR] Failed to schedule weekly check-in reminder - notificationId is null');
        return false;
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      console.log(`[SUCCESS] Weekly check-in reminder enabled for ${dayNames[dayOfWeek]} ${time}`);
      return true;
    } catch (error) {
      console.error('[ERROR] Error enabling weekly check-in reminder:', error);
      console.error('[ERROR] Error details:', JSON.stringify(error));
      return false;
    }
  }

  /**
   * Disable weekly check-in reminders
   * Cancels the scheduled notification
   */
  async disableWeeklyCheckinReminder(): Promise<void> {
    try {
      await cancelWeeklyCheckinReminder();
      console.log('Weekly check-in reminder disabled');
    } catch (error) {
      console.error('Error disabling weekly check-in reminder:', error);
    }
  }

  /**
   * Update weekly check-in reminder day/time
   * Reschedules the notification with new day and time
   */
  async updateWeeklyCheckinReminder(dayOfWeek: number, time: string): Promise<boolean> {
    try {
      // Cancel existing reminder
      await cancelWeeklyCheckinReminder();

      // Schedule with new day/time
      const notificationId = await scheduleWeeklyCheckinReminder(dayOfWeek, time);
      if (!notificationId) {
        console.error('Failed to reschedule weekly check-in reminder');
        return false;
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      console.log(`Weekly check-in reminder updated to ${dayNames[dayOfWeek]} ${time}`);
      return true;
    } catch (error) {
      console.error('Error updating weekly check-in reminder:', error);
      return false;
    }
  }
}

// Export singleton instance
export const preferencesService = new PreferencesService();
export default preferencesService;
