// Notification Service - Handles local notifications for workout reminders
import notifee, {
  AndroidImportance,
  TriggerType,
  RepeatFrequency,
  TimestampTrigger,
  EventType,
  AndroidCategory,
  AndroidVisibility,
} from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * Initialize notification channels (Android only)
 * Must be called before any notifications are displayed
 */
export const initializeNotifications = async () => {
  if (Platform.OS === 'android') {
    try {
      console.log('🔧 Creating workout-reminders channel...');
      await notifee.createChannel({
        id: 'workout-reminders',
        name: 'Workout Reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
      console.log('✅ workout-reminders channel created');

      console.log('🔧 Creating rest-timer channel...');
      await notifee.createChannel({
        id: 'rest-timer',
        name: 'Rest Timer',
        importance: AndroidImportance.HIGH,
        sound: 'default', // Using default sound (changed from 'hollow' which may not exist)
        vibration: true,
        vibrationPattern: [300, 500, 200, 500], // Strong vibration: wait 300ms, vibrate 500ms, pause 200ms, vibrate 500ms
      });
      console.log('✅ rest-timer channel created');

      console.log('✅ Notification channels created successfully');
    } catch (error) {
      console.error('❌ Error creating notification channels:', error);
      throw error;
    }
  }
};

/**
 * Request notification permissions
 * Returns true if permission granted, false otherwise
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // On Android, notification permissions are handled at install time
    // Emulators often hang on requestPermission(), so we skip it for Android
    if (Platform.OS === 'android') {
      console.log('[DEBUG] Android detected - skipping permission request (granted at install)');
      return true;
    }

    const settings = await notifee.requestPermission();
    console.log('Notification permission:', settings.authorizationStatus);
    return settings.authorizationStatus === 1; // 1 = AUTHORIZED
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Check if notifications are enabled
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === 1; // 1 = AUTHORIZED
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Schedule a daily workout reminder notification
 * @param time - Time in HH:MM format (24-hour)
 * @param customMessage - Custom message to display (optional)
 * @returns Notification ID
 */
export const scheduleDailyWorkoutReminder = async (
  time: string,
  customMessage?: string
): Promise<string | null> => {
  try {
    console.log('[DEBUG] scheduleDailyWorkoutReminder called with time:', time);

    // Parse time (format: "HH:MM")
    const [hours, minutes] = time.split(':').map(Number);
    console.log('[DEBUG] Parsed hours:', hours, 'minutes:', minutes);

    // Create date for next occurrence of this time
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    console.log('[DEBUG] Scheduling workout reminder for:', scheduledDate.toLocaleString());
    console.log('[DEBUG] Timestamp:', scheduledDate.getTime());

    // Create trigger for daily repeat
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: scheduledDate.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    };

    // Use custom message or default
    const message = customMessage || "Time to grind! 💪 Let's get that workout in!";
    console.log('[DEBUG] Notification message:', message);

    console.log('[DEBUG] About to call notifee.createTriggerNotification...');

    // Create notification
    const notificationId = await notifee.createTriggerNotification(
      {
        id: 'daily-workout-reminder',
        title: '💪 Workout Reminder',
        body: message,
        android: {
          channelId: 'workout-reminders',
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data: {
          screen: 'Workout', // Deep link to Workout tab
        },
      },
      trigger
    );

    console.log('[DEBUG] notifee.createTriggerNotification returned ID:', notificationId);

    if (!notificationId) {
      console.error('[DEBUG] notificationId is null or undefined!');
      return null;
    }

    console.log('[SUCCESS] Daily workout reminder scheduled with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[ERROR] Error scheduling workout reminder:', error);
    console.error('[ERROR] Error details:', JSON.stringify(error));
    return null;
  }
};

/**
 * Cancel the daily workout reminder
 */
export const cancelDailyWorkoutReminder = async (): Promise<void> => {
  try {
    await notifee.cancelNotification('daily-workout-reminder');
    console.log('Daily workout reminder cancelled');
  } catch (error) {
    console.error('Error cancelling workout reminder:', error);
  }
};

/**
 * Schedule workout reminders for specific days of the week
 * @param days - Array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @param time - Time in HH:MM format (24-hour)
 * @param customMessage - Custom message to display (optional)
 * @returns Array of notification IDs
 */
export const scheduleWorkoutRemindersForDays = async (
  days: number[],
  time: string,
  customMessage?: string
): Promise<string[]> => {
  try {
    console.log('[DEBUG] scheduleWorkoutRemindersForDays called with days:', days, 'time:', time);

    const notificationIds: string[] = [];
    const [hours, minutes] = time.split(':').map(Number);
    const message = customMessage || "Time to grind! 💪 Let's get that workout in!";

    // Schedule a notification for each selected day
    for (const dayOfWeek of days) {
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Calculate days until next occurrence of target day
      const currentDay = scheduledDate.getDay();
      let daysUntilTarget = dayOfWeek - currentDay;

      // If target day is today but time has passed, or target day is in the past, add 7 days
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && scheduledDate <= now)) {
        daysUntilTarget += 7;
      }

      scheduledDate.setDate(scheduledDate.getDate() + daysUntilTarget);

      console.log(`[DEBUG] Scheduling for day ${dayOfWeek} at:`, scheduledDate.toLocaleString());

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: scheduledDate.getTime(),
        repeatFrequency: RepeatFrequency.WEEKLY, // Repeat every week on this day
      };

      const notificationId = await notifee.createTriggerNotification(
        {
          id: `workout-reminder-day-${dayOfWeek}`,
          title: '💪 Workout Reminder',
          body: message,
          android: {
            channelId: 'workout-reminders',
            smallIcon: 'ic_launcher',
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            sound: 'default',
            foregroundPresentationOptions: {
              alert: true,
              badge: true,
              sound: true,
            },
          },
          data: {
            screen: 'Workout',
          },
        },
        trigger
      );

      if (notificationId) {
        notificationIds.push(notificationId);
        console.log(`[SUCCESS] Scheduled workout reminder for day ${dayOfWeek} with ID:`, notificationId);
      }
    }

    return notificationIds;
  } catch (error) {
    console.error('[ERROR] Error scheduling workout reminders for days:', error);
    return [];
  }
};

/**
 * Cancel all day-specific workout reminders
 */
export const cancelAllWorkoutReminders = async (): Promise<void> => {
  try {
    // Cancel notifications for all 7 days
    for (let day = 0; day < 7; day++) {
      await notifee.cancelNotification(`workout-reminder-day-${day}`);
    }
    console.log('All workout reminders cancelled');
  } catch (error) {
    console.error('Error cancelling workout reminders:', error);
  }
};

/**
 * Display an immediate notification (for rest timer)
 * Now with optional workout context for interactive buttons
 */
export const displayRestTimerNotification = async (
  restSeconds: number,
  workoutContext?: {
    exerciseName: string;
    currentSet: number;
    totalSets: number;
    lastWeight?: string;
    lastReps?: string;
  }
): Promise<void> => {
  try {
    console.log('🔔 [REST TIMER] Attempting to display notification...');
    console.log('🔔 [REST TIMER] Rest duration:', restSeconds);

    // Ensure channel exists first
    await initializeNotifications();

    // Build notification body
    let body = `Your ${restSeconds}s rest is over. Ready for the next set?`;
    if (workoutContext) {
      body = `${workoutContext.exerciseName} - Set ${workoutContext.currentSet}/${workoutContext.totalSets}`;
      if (workoutContext.lastWeight && workoutContext.lastReps) {
        body += `\nLast: ${workoutContext.lastWeight} lbs × ${workoutContext.lastReps} reps`;
      }
    }

    await notifee.displayNotification({
      id: 'rest-timer-complete', // Fixed ID so we can update it
      title: '⏱️ Rest Timer Complete',
      body,
      android: {
        channelId: 'rest-timer',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [300, 500, 200, 500],
        category: AndroidCategory.ALARM,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: false, // Allow dismissal
        autoCancel: false, // Don't auto-dismiss when tapped
        showChronometer: false,
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: '🎤 Voice',
            pressAction: {
              id: 'voice-log',
            },
          },
          {
            title: '✓ Next',
            pressAction: {
              id: 'next-set',
            },
          },
          {
            title: '⏭️ Skip',
            pressAction: {
              id: 'skip-exercise',
            },
          },
        ],
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });

    console.log('✅ [REST TIMER] Notification displayed successfully');
  } catch (error) {
    console.error('❌ [REST TIMER] Error displaying notification:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await notifee.cancelAllNotifications();
    console.log('All notifications cancelled');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

/**
 * Get all scheduled notification IDs
 */
export const getScheduledNotifications = async (): Promise<string[]> => {
  try {
    const notifications = await notifee.getTriggerNotifications();
    return notifications.map(n => n.notification.id || '');
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Display Atlas AI proactive coaching notification
 * Used for mid-workout guidance and set recommendations
 */
export const displayAtlasCoachingNotification = async (
  message: string,
  title: string = '🤖 Atlas Coach'
): Promise<void> => {
  try {
    await notifee.displayNotification({
      title,
      body: message,
      android: {
        channelId: 'workout-reminders',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
  } catch (error) {
    console.error('Error displaying Atlas coaching notification:', error);
  }
};

/**
 * Schedule a weekly check-in reminder notification
 * Occurs every Sunday at 8pm by default
 * @param dayOfWeek - 0 = Sunday, 1 = Monday, etc. (default: 0 for Sunday)
 * @param time - Time in HH:MM format (24-hour, default: "20:00")
 * @returns Notification ID
 */
export const scheduleWeeklyCheckinReminder = async (
  dayOfWeek: number = 0,
  time: string = '20:00'
): Promise<string | null> => {
  try {
    console.log('[DEBUG] scheduleWeeklyCheckinReminder called with dayOfWeek:', dayOfWeek, 'time:', time);

    // Parse time (format: "HH:MM")
    const [hours, minutes] = time.split(':').map(Number);
    console.log('[DEBUG] Parsed hours:', hours, 'minutes:', minutes);

    // Create date for next occurrence of this day/time
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Calculate days until next occurrence of target day
    const currentDay = scheduledDate.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;
    console.log('[DEBUG] currentDay:', currentDay, 'daysUntilTarget:', daysUntilTarget);

    // If target day is today but time has passed, or target day is in the past, add 7 days
    if (daysUntilTarget < 0 || (daysUntilTarget === 0 && scheduledDate <= now)) {
      daysUntilTarget += 7;
      console.log('[DEBUG] Adjusted daysUntilTarget to:', daysUntilTarget);
    }

    scheduledDate.setDate(scheduledDate.getDate() + daysUntilTarget);

    console.log('[DEBUG] Scheduling weekly check-in reminder for:', scheduledDate.toLocaleString());
    console.log('[DEBUG] Timestamp:', scheduledDate.getTime());

    // Create trigger for weekly repeat
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: scheduledDate.getTime(),
      repeatFrequency: RepeatFrequency.WEEKLY,
    };

    console.log('[DEBUG] About to call notifee.createTriggerNotification...');

    // Create notification with deep link data
    const notificationId = await notifee.createTriggerNotification(
      {
        id: 'weekly-checkin-reminder',
        title: '📅 Weekly Check-in Ready!',
        body: 'Tap to review your progress and get your weekly plan 💪',
        android: {
          channelId: 'workout-reminders',
          smallIcon: 'ic_launcher',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'weekly-checkin', // Custom action for deep linking
          },
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data: {
          screen: 'WeeklyCheckin', // Used for navigation
        },
      },
      trigger
    );

    console.log('[DEBUG] notifee.createTriggerNotification returned ID:', notificationId);

    if (!notificationId) {
      console.error('[DEBUG] notificationId is null or undefined!');
      return null;
    }

    console.log('[SUCCESS] Weekly check-in reminder scheduled with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[ERROR] Error scheduling weekly check-in reminder:', error);
    console.error('[ERROR] Error details:', JSON.stringify(error));
    return null;
  }
};

/**
 * Cancel the weekly check-in reminder
 */
export const cancelWeeklyCheckinReminder = async (): Promise<void> => {
  try {
    await notifee.cancelNotification('weekly-checkin-reminder');
    console.log('Weekly check-in reminder cancelled');
  } catch (error) {
    console.error('Error cancelling weekly check-in reminder:', error);
  }
};

/**
 * Set up event listeners for rest timer notification actions
 * Call this once when the workout starts
 */
export const setupRestTimerNotificationHandlers = (handlers: {
  onVoiceLog: () => void;
  onNextSet: () => void;
  onSkipExercise: () => void;
}) => {
  // Handle foreground events (app is open)
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      console.log('🔔 Notification action pressed:', detail.pressAction?.id);

      switch (detail.pressAction?.id) {
        case 'voice-log':
          console.log('🎤 Voice log button pressed from notification');
          handlers.onVoiceLog();
          break;
        case 'next-set':
          console.log('✓ Next set button pressed from notification');
          handlers.onNextSet();
          break;
        case 'skip-exercise':
          console.log('⏭️ Skip exercise button pressed from notification');
          handlers.onSkipExercise();
          break;
      }
    }
  });

  // Handle background events (app is closed/locked)
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      console.log('🔔 Background notification action pressed:', detail.pressAction?.id);

      switch (detail.pressAction?.id) {
        case 'voice-log':
          console.log('🎤 Voice log button pressed from notification (background)');
          handlers.onVoiceLog();
          break;
        case 'next-set':
          console.log('✓ Next set button pressed from notification (background)');
          handlers.onNextSet();
          break;
        case 'skip-exercise':
          console.log('⏭️ Skip exercise button pressed from notification (background)');
          handlers.onSkipExercise();
          break;
      }
    }
  });
};

/**
 * TEST FUNCTION: Display a simple test notification immediately
 * Use this to verify notifications are working on the device
 */
export const displayTestNotification = async (): Promise<void> => {
  try {
    console.log('🧪 [TEST] Checking notification settings...');

    // Check notification permission
    const settings = await notifee.getNotificationSettings();
    console.log('🧪 [TEST] Authorization status:', settings.authorizationStatus);
    console.log('🧪 [TEST] Full settings:', JSON.stringify(settings, null, 2));

    // Initialize channels
    console.log('🧪 [TEST] Initializing notification channels...');
    await initializeNotifications();

    // Display test notification
    console.log('🧪 [TEST] Displaying test notification...');
    await notifee.displayNotification({
      title: '🧪 Test Notification',
      body: 'If you can see this, notifications are working!',
      android: {
        channelId: 'rest-timer',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });

    console.log('✅ [TEST] Test notification sent successfully');
  } catch (error) {
    console.error('❌ [TEST] Error in test notification:', error);
    console.error('❌ [TEST] Error details:', JSON.stringify(error, null, 2));
  }
};
