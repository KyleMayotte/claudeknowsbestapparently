import notifee, { AndroidImportance, AndroidCategory, EventType } from '@notifee/react-native';

export interface WorkoutNotificationData {
  workoutName: string;
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  lastWeight?: string;
  lastReps?: string;
  restTimeRemaining?: number;
}

class WorkoutNotificationService {
  private channelId = 'workout-channel';
  private notificationId = 'active-workout';
  private isActive = false;

  async initialize() {
    // Create notification channel for Android
    await notifee.createChannel({
      id: this.channelId,
      name: 'Active Workout',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    console.log('📢 Workout notification service initialized');
  }

  async startWorkoutNotification(workoutName: string) {
    await this.initialize();

    await notifee.displayNotification({
      id: this.notificationId,
      title: '🏋️ MuscleUp - Workout Active',
      body: workoutName,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.WORKOUT,
        ongoing: true, // Can't be dismissed by user
        autoCancel: false,
        smallIcon: 'ic_launcher',
        color: '#007AFF',
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: '🎤 Voice',
            pressAction: {
              id: 'voice',
            },
          },
          {
            title: '✓ Done',
            pressAction: {
              id: 'complete',
            },
          },
          {
            title: '⏭️ Skip',
            pressAction: {
              id: 'skip',
            },
          },
        ],
      },
    });

    this.isActive = true;
    console.log('📢 Workout notification started:', workoutName);
  }

  async updateNotification(data: WorkoutNotificationData) {
    if (!this.isActive) {
      console.warn('⚠️ Notification not active, cannot update');
      return;
    }

    // Build the body text
    let bodyText = `${data.exerciseName} - Set ${data.currentSet}/${data.totalSets}`;

    if (data.lastWeight && data.lastReps) {
      bodyText += `\nLast: ${data.lastWeight} lbs × ${data.lastReps} reps`;
    }

    if (data.restTimeRemaining && data.restTimeRemaining > 0) {
      const minutes = Math.floor(data.restTimeRemaining / 60);
      const seconds = data.restTimeRemaining % 60;
      const timeStr = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : `${seconds}s`;
      bodyText += `\n⏱️ Rest: ${timeStr}`;
    }

    await notifee.displayNotification({
      id: this.notificationId,
      title: `🏋️ ${data.workoutName}`,
      body: bodyText,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.WORKOUT,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_launcher',
        color: '#007AFF',
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: '🎤 Voice',
            pressAction: {
              id: 'voice',
            },
          },
          {
            title: '✓ Done',
            pressAction: {
              id: 'complete',
            },
          },
          {
            title: '⏭️ Skip',
            pressAction: {
              id: 'skip',
            },
          },
        ],
      },
    });
  }

  async stopNotification() {
    if (this.isActive) {
      await notifee.cancelNotification(this.notificationId);
      this.isActive = false;
      console.log('📢 Workout notification stopped');
    }
  }

  // Set up event listeners for button presses
  setupEventListeners(
    onVoice: () => void,
    onComplete: () => void,
    onSkip: () => void
  ) {
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        switch (detail.pressAction?.id) {
          case 'voice':
            console.log('🎤 Voice button pressed from notification');
            onVoice();
            break;
          case 'complete':
            console.log('✓ Complete button pressed from notification');
            onComplete();
            break;
          case 'skip':
            console.log('⏭️ Skip button pressed from notification');
            onSkip();
            break;
        }
      }
    });

    // Handle background events
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        switch (detail.pressAction?.id) {
          case 'voice':
            console.log('🎤 Voice button pressed from notification (background)');
            onVoice();
            break;
          case 'complete':
            console.log('✓ Complete button pressed from notification (background)');
            onComplete();
            break;
          case 'skip':
            console.log('⏭️ Skip button pressed from notification (background)');
            onSkip();
            break;
        }
      }
    });
  }

  isNotificationActive(): boolean {
    return this.isActive;
  }
}

export const workoutNotification = new WorkoutNotificationService();
