import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { PermissionsAndroid, Platform } from 'react-native';

export interface VoiceLoggerResult {
  transcript: string;
  weight?: number;
  reps?: number;
  success: boolean;
  error?: string;
}

class VoiceLogger {
  private isListening: boolean = false;
  private onResultCallback?: (result: VoiceLoggerResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechError = this.onSpeechError;
  }

  // Request microphone permission (Android)
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'MuscleUp needs access to your microphone to log sets with your voice.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    // iOS handles permission automatically on first use
    return true;
  }

  // Start listening (press mic button)
  async startListening(
    onResult: (result: VoiceLoggerResult) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    try {
      await Voice.start('en-US');
      this.isListening = true;
      console.log('🎤 Voice recording started');
    } catch (error: any) {
      console.error('Failed to start voice:', error);
      this.onErrorCallback?.('Failed to start recording');
      this.isListening = false;
    }
  }

  // Stop listening (release mic button)
  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
      console.log('🎤 Voice recording stopped');
    } catch (error: any) {
      console.error('Failed to stop voice:', error);
    }
  }

  // Cancel listening (user cancels)
  async cancelListening(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
      console.log('🎤 Voice recording cancelled');
    } catch (error: any) {
      console.error('Failed to cancel voice:', error);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
      this.isListening = false;
    } catch (error: any) {
      console.error('Failed to destroy voice:', error);
    }
  }

  // Event handlers
  private onSpeechStart = () => {
    console.log('🎤 Speech started');
  };

  private onSpeechEnd = () => {
    console.log('🎤 Speech ended');
  };

  private onSpeechResults = (e: SpeechResultsEvent) => {
    if (!e.value || e.value.length === 0) {
      this.onErrorCallback?.('No speech detected');
      return;
    }

    const transcript = e.value[0].toLowerCase();
    console.log('📝 Transcript:', transcript);

    // Parse transcript for weight/reps
    const parsed = this.parseTranscript(transcript);

    if (this.onResultCallback) {
      this.onResultCallback({
        transcript,
        weight: parsed.weight,
        reps: parsed.reps,
        success: parsed.weight !== undefined || parsed.reps !== undefined,
        error: parsed.weight === undefined && parsed.reps === undefined
          ? 'Could not understand weight or reps'
          : undefined,
      });
    }
  };

  private onSpeechError = (e: SpeechErrorEvent) => {
    // Extract error code and message
    const errorCode = e.error?.code || '';
    let errorMessage: string;

    if (typeof e.error === 'string') {
      errorMessage = e.error;
    } else if (e.error?.message) {
      errorMessage = e.error.message;
    } else if (e.error?.code) {
      errorMessage = e.error.code;
    } else if (e.error) {
      errorMessage = String(e.error);
    } else {
      errorMessage = 'Voice recognition failed';
    }

    // Silently ignore common transient errors (these are normal and don't affect functionality)
    const ignoredErrors = [
      '7',           // Network/service temporarily unavailable
      '5',           // Client-side error (usually transient)
      'no-match',    // No speech detected
      '7/5',         // Combined error codes
      '7/',          // Partial error codes
      '5/',
    ];

    for (const ignored of ignoredErrors) {
      if (errorCode === ignored || errorMessage.includes(ignored)) {
        // Silently return - these errors are expected and don't need user notification
        return;
      }
    }

    // Only show errors that are actually problematic
    console.warn('Voice error:', errorMessage);
    this.onErrorCallback?.(errorMessage);
  };

  // Parse transcript to extract weight and reps
  private parseTranscript(transcript: string): { weight?: number; reps?: number } {
    console.log('🎤 Original:', transcript);

    // Apply smart word corrections for commonly misheard terms FIRST
    let cleaned = transcript.toLowerCase();
    cleaned = this.correctMisheardWords(cleaned);
    console.log('🔧 After corrections:', cleaned);

    // Convert word numbers to digits
    cleaned = this.convertWordsToNumbers(cleaned);

    // Remove ALL non-essential words aggressively - keep only numbers, "reps", "for", "at", "with", weight units
    cleaned = cleaned
      .replace(/\b(um|uh|like|you know|so|yeah|okay|alright|hey|hi|hello|what|how|hows|how's|it|going|good|great|fine|thanks|thank you|sorry|excuse me|pardon|the|a|an|my|your|his|her|their|our|and|or|but|if|then|when|where|who|why|that|this|these|those|i|me|we|us|you|he|she|they|them|had|have|has|been|being|am|is|are|was|were|be|do|does|did|will|would|should|could|can|may|might|must|shall|mom|dad|man|woman|guy|girl|person|people)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('🧹 After cleaning:', cleaned);

    // Handle fractional weights: "185 and a half" → "185.5", "225 and a quarter" → "225.25"
    cleaned = cleaned.replace(/(\d+)\s+and\s+a\s+half/gi, '$1.5');
    cleaned = cleaned.replace(/(\d+)\s+and\s+a\s+quarter/gi, '$1.25');
    cleaned = cleaned.replace(/(\d+)\s+and\s+three\s+quarters?/gi, '$1.75');
    cleaned = cleaned.replace(/(\d+)\s+(?:point|dot)\s+five/gi, '$1.5');
    cleaned = cleaned.replace(/(\d+)\s+(?:point|dot)\s+25/gi, '$1.25');

    // Normalize weight units (strip them out or standardize position)
    // "225 lb for 8" -> "225 for 8"
    // "8 reps at 225 pounds" -> "8 reps at 225"
    cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kgs?|kilos?)\s+/gi, '$1 ');

    console.log('🔧 After normalization:', cleaned);

    // Pattern 1: "I got/did X at/with Y" - Natural phrases
    // "I got 8 at 225", "just did 10 with 185", "I did 12 at 135"
    const pattern1 = /(?:i|just|we)\s*(?:got|did|made|hit|completed?)\s*(\d+)\s*(?:at|with|@)\s*(\d+(?:\.\d+)?)/i;
    const match1 = cleaned.match(pattern1);
    if (match1) {
      console.log('✅ Matched pattern 1 (I got X at Y)');
      return {
        reps: parseInt(match1[1], 10),
        weight: parseFloat(match1[2]),
      };
    }

    // Pattern 2: "X reps for/at/with Y" - Explicit "reps" keyword
    const pattern2 = /(\d+)\s*reps?\s*(?:at|with|for|@)\s*(\d+(?:\.\d+)?)/i;
    const match2 = cleaned.match(pattern2);
    if (match2) {
      console.log('✅ Matched pattern 2 (X reps at Y weight)');
      return {
        reps: parseInt(match2[1], 10),
        weight: parseFloat(match2[2]),
      };
    }

    // Pattern 3: "Xx225" or "8x225" - Compact notation
    const pattern3 = /(\d+)\s*x\s*(\d+(?:\.\d+)?)/i;
    const match3 = cleaned.match(pattern3);
    if (match3) {
      const num1 = parseInt(match3[1], 10);
      const num2 = parseFloat(match3[2]);
      // Larger number is weight
      if (num2 > num1) {
        console.log('✅ Matched pattern 3 (XxY compact notation)');
        return {
          reps: num1,
          weight: num2,
        };
      } else {
        console.log('✅ Matched pattern 3 (YxX compact notation - reversed)');
        return {
          reps: num2,
          weight: num1,
        };
      }
    }

    // Pattern 4: "225 times 8" or "8 times 225"
    const pattern4 = /(\d+(?:\.\d+)?)\s*times\s*(\d+(?:\.\d+)?)/i;
    const match4 = cleaned.match(pattern4);
    if (match4) {
      const num1 = parseFloat(match4[1]);
      const num2 = parseFloat(match4[2]);
      // Larger number is weight
      if (num1 > num2) {
        console.log('✅ Matched pattern 4 (X times Y)');
        return {
          weight: num1,
          reps: num2,
        };
      } else {
        console.log('✅ Matched pattern 4 (Y times X - reversed)');
        return {
          weight: num2,
          reps: num1,
        };
      }
    }

    // Pattern 5: "X for Y" with weight units - "20 for 225 pounds"
    const pattern5 = /(\d+)\s*(?:for|at|with|@)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kgs?|kilos)/i;
    const match5 = cleaned.match(pattern5);
    if (match5) {
      console.log('✅ Matched pattern 5 (X for Y weight-unit)');
      return {
        reps: parseInt(match5[1], 10),
        weight: parseFloat(match5[2]),
      };
    }

    // Pattern 6: "225 for 8" - Larger number first = weight for reps
    const pattern6 = /(\d+(?:\.\d+)?)\s*(?:for|@)\s*(\d+)(?!\d)/i;
    const match6 = cleaned.match(pattern6);
    if (match6) {
      const num1 = parseFloat(match6[1]);
      const num2 = parseInt(match6[2], 10);
      console.log('🔍 Pattern 6 captured:', { num1, num2, match: match6[0] });
      // Assume larger number is weight
      if (num1 > num2) {
        console.log('✅ Matched pattern 6 (weight for reps)');
        console.log('📊 Returning:', { weight: num1, reps: num2 });
        return {
          weight: num1,
          reps: num2,
        };
      }
    }

    // Pattern 7: "same" or "same weight" (repeat last weight)
    const pattern7 = /(?:same|repeat|again)(?:\s+weight)?/i;
    const match7 = cleaned.match(pattern7);
    if (match7) {
      console.log('✅ Matched pattern 7 (same weight)');
      return { weight: -1 }; // Special marker for "use previous weight"
    }

    // Pattern 8: "up 5" or "add 5" or "plus 5" (increase weight)
    const pattern8 = /(?:up|add|plus|increase)\s*(\d+(?:\.\d+)?)/i;
    const match8 = cleaned.match(pattern8);
    if (match8) {
      console.log('✅ Matched pattern 8 (add weight)');
      return { weight: parseFloat(match8[1]) }; // Special: add to current weight
    }

    // Pattern 9: "down 5" or "minus 5" or "subtract 5" (decrease weight)
    const pattern9 = /(?:down|minus|subtract|less)\s*(\d+(?:\.\d+)?)/i;
    const match9 = cleaned.match(pattern9);
    if (match9) {
      console.log('✅ Matched pattern 9 (subtract weight)');
      return { weight: -parseFloat(match9[1]) }; // Special: subtract from current weight
    }

    // Pattern 10: Just weight "225" or "225 pounds"
    const pattern10 = /^(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?|kilos?|kgs?)?$/i;
    const match10 = cleaned.match(pattern10);
    if (match10) {
      console.log('✅ Matched pattern 10 (weight only)');
      return { weight: parseFloat(match10[1]) };
    }

    // Pattern 11: Just reps "8" or "8 reps"
    const pattern11 = /^(\d+)\s*(?:reps?)?$/i;
    const match11 = cleaned.match(pattern11);
    if (match11) {
      console.log('✅ Matched pattern 11 (reps only)');
      return { reps: parseInt(match11[1], 10) };
    }

    // Pattern 12: "I got 8" or "I did 8" (reps only - fallback)
    const pattern12 = /(?:i|we)\s*(?:got|did|completed)\s*(\d+)(?!\s*(?:at|with|@))/i;
    const match12 = cleaned.match(pattern12);
    if (match12) {
      console.log('✅ Matched pattern 12 (got X reps only)');
      return { reps: parseInt(match12[1], 10) };
    }

    // Pattern 13: Fallback - Extract any two numbers and assume larger = weight
    // Matches things like "six with 200 pounds" or "eight 225" or "12 at 185"
    const allNumbers = cleaned.match(/\d+(?:\.\d+)?/g);
    if (allNumbers && allNumbers.length >= 2) {
      const num1 = parseFloat(allNumbers[0]);
      const num2 = parseFloat(allNumbers[1]);
      console.log('✅ Matched pattern 13 (fallback - any two numbers)');
      console.log('🔍 Found numbers:', { num1, num2 });

      // Larger number is weight
      if (num1 > num2) {
        return { weight: num1, reps: num2 };
      } else {
        return { weight: num2, reps: num1 };
      }
    }

    console.log('❌ No pattern matched');
    return {};
  }

  // Correct commonly misheard words using fuzzy matching
  private correctMisheardWords(text: string): string {
    // Map of misheard words to correct words
    const corrections: { [key: string]: string } = {
      // "reps" variations
      'wraps': 'reps',
      'raps': 'reps',
      'reps': 'reps',
      'rep': 'reps',
      'wrap': 'reps',
      'rapes': 'reps',
      'wrecks': 'reps',

      // Number corrections (context-aware)
      'sex': 'six',
      'tex': 'ten',
      'ate': 'eight',
      'won': 'one',
      'tree': 'three',
      'fir': 'four',
      'fiv': 'five',
      'tin': 'ten',

      // Weight unit variations
      'pounds': 'pounds',
      'pound': 'pounds',
      'lbs': 'lbs',
      'lb': 'lbs',
      'kilos': 'kilos',
      'kilo': 'kilos',
      'kg': 'kilos',
      'kgs': 'kilos',
    };

    let corrected = text;

    // Apply corrections
    for (const [wrong, right] of Object.entries(corrections)) {
      // Use word boundaries to avoid partial replacements
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }

    // Additional fuzzy matching for words close to "reps"
    // If a word is near numbers and sounds like "reps", assume it's "reps"
    corrected = corrected.replace(/(\d+)\s+(wraps|raps|wrap|rapes|wrecks)/gi, '$1 reps');

    return corrected;
  }

  // Convert word numbers to digits
  private convertWordsToNumbers(text: string): string {
    const wordToNum: { [key: string]: string } = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100',
    };

    let result = text;

    // First pass: convert individual words to numbers
    for (const [word, num] of Object.entries(wordToNum)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, num);
    }

    // Handle "two hundred twenty five" → "225"
    // Pattern: X hundred Y → XY (e.g., "2 100 25" → "225")
    result = result.replace(/(\d+)\s*100\s*(\d+)/g, (match, hundreds, remainder) => {
      return (parseInt(hundreds) * 100 + parseInt(remainder)).toString();
    });

    // Handle "two hundred" → "200"
    result = result.replace(/(\d+)\s*100\b/g, (match, num) => {
      return (parseInt(num) * 100).toString();
    });

    // Handle compound numbers like "twenty five" → "25"
    // Pattern: tens + ones (e.g., "20 5" → "25")
    result = result.replace(/\b([2-9]0)\s+(\d)\b/g, (match, tens, ones) => {
      return (parseInt(tens) + parseInt(ones)).toString();
    });

    return result;
  }

  // Check if currently listening
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export const voiceLogger = new VoiceLogger();
