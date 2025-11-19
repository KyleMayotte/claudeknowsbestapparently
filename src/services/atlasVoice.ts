import Tts from 'react-native-tts';

export interface AtlasVoiceContext {
  isPR?: boolean;
  isFirstSet?: boolean;
  exerciseName?: string;
  weight?: number;
  reps?: number;
  previousWeight?: number;
  previousReps?: number;
}

class AtlasVoice {
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];

  private isInitialized: boolean = false;

  constructor() {
    // Don't initialize in constructor - wait for first use
  }

  // Initialize TTS (lazy initialization)
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
      this.isInitialized = true;
      console.log('🗣️ Atlas Voice initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      return false;
    }
  }

  // Speak a message
  async speak(message: string, interrupt: boolean = false): Promise<void> {
    // Initialize on first use
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        console.warn('TTS not available, skipping speech');
        return;
      }
    }

    if (interrupt) {
      // Stop current speech and clear queue
      await this.stop();
      this.speechQueue = [];
    }

    if (this.isSpeaking) {
      // Add to queue if already speaking
      this.speechQueue.push(message);
    } else {
      // Speak immediately
      try {
        this.isSpeaking = true;
        Tts.speak(message);

        // Set up one-time listener for completion
        const finishHandler = () => {
          this.isSpeaking = false;
          this.processQueue();
        };

        // Use addEventListener without trying to remove (library handles cleanup)
        Tts.addEventListener('tts-finish', finishHandler);
      } catch (error) {
        console.error('TTS speak error:', error);
        this.isSpeaking = false;
      }
    }
  }

  // Process speech queue
  private async processQueue(): Promise<void> {
    if (this.speechQueue.length > 0 && !this.isSpeaking) {
      const nextMessage = this.speechQueue.shift();
      if (nextMessage) {
        await this.speak(nextMessage);
      }
    }
  }

  // Stop speaking
  async stop(): Promise<void> {
    try {
      await Tts.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  // Get response for set logged
  getSetLoggedResponse(context: AtlasVoiceContext): string {
    const { isPR, weight, reps, previousWeight, previousReps } = context;

    // PR celebration
    if (isPR) {
      const prMessages = [
        "That's a PR! Let's fucking go!",
        "New PR! You're crushing it!",
        "PR alert! Beast mode activated!",
        "Holy shit, that's a new record!",
      ];
      return this.randomChoice(prMessages);
    }

    // Improved from last time
    if (previousWeight && previousReps && weight && reps) {
      const volumeIncrease = (weight * reps) > (previousWeight * previousReps);
      if (volumeIncrease) {
        const improvedMessages = [
          `Nice! Up from ${previousWeight} by ${reps}.`,
          `Solid improvement over last time!`,
          `You're getting stronger!`,
        ];
        return this.randomChoice(improvedMessages);
      }
    }

    // Standard set logged
    const standardMessages = [
      "Set logged!",
      "Got it!",
      "Nice work!",
      "Keep it up!",
      "Locked in!",
    ];
    return this.randomChoice(standardMessages);
  }

  // Get rest reminder
  getRestReminder(seconds: number): string {
    if (seconds >= 120) {
      return "Rest 2 minutes";
    } else if (seconds >= 90) {
      return "Rest 90 seconds";
    } else if (seconds >= 60) {
      return "Rest 1 minute";
    } else {
      return `Rest ${seconds} seconds`;
    }
  }

  // Get encouragement for struggling
  getEncouragementResponse(): string {
    const encouragements = [
      "You got this!",
      "Push through it!",
      "One more rep!",
      "Don't quit now!",
      "Finish strong!",
    ];
    return this.randomChoice(encouragements);
  }

  // Get response for workout complete
  getWorkoutCompleteResponse(totalSets: number, duration: number): string {
    const messages = [
      `Workout complete! ${totalSets} sets in ${duration} minutes. Nice work!`,
      `Great session! ${totalSets} sets done.`,
      `You crushed it! ${duration} minutes of solid work.`,
      `That's how it's done! ${totalSets} sets completed.`,
    ];
    return this.randomChoice(messages);
  }

  // Get error response
  getErrorResponse(): string {
    const errors = [
      "Sorry, I didn't catch that. Try again.",
      "I couldn't understand that. Say it again?",
      "Come again?",
      "Didn't get that. Repeat?",
    ];
    return this.randomChoice(errors);
  }

  // Random choice helper
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Check if currently speaking
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  // Clear queue
  clearQueue(): void {
    this.speechQueue = [];
  }

  // Cleanup
  async destroy(): Promise<void> {
    try {
      await this.stop();
      this.clearQueue();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    } catch (error) {
      console.error('Failed to destroy TTS:', error);
    }
  }
}

export const atlasVoice = new AtlasVoice();
