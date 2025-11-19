/**
 * Enhanced logging utility for MuscleUp
 * Provides structured logging with categories and automatic production filtering
 *
 * Usage:
 *   import { log } from '@/utils/logger';
 *   log.info('User logged in', { userId: '123' });
 *   log.error('Failed to save workout', error);
 *   log.debug('Exercise data', exerciseData);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  category?: string;
  data?: any;
}

class Logger {
  private isDev = __DEV__;

  /**
   * Debug-level logging (disabled in production)
   * Use for detailed debugging information
   */
  debug(message: string, data?: any) {
    if (this.isDev) {
      console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Info-level logging (disabled in production)
   * Use for general informational messages
   */
  info(message: string, data?: any) {
    if (this.isDev) {
      console.log(`ℹ️  [INFO] ${message}`, data || '');
    }
  }

  /**
   * Warning-level logging (enabled in production)
   * Use for recoverable errors or unexpected situations
   */
  warn(message: string, data?: any) {
    console.warn(`⚠️  [WARN] ${message}`, data || '');
  }

  /**
   * Error-level logging (enabled in production)
   * Use for errors that need investigation
   */
  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error || '');
  }

  /**
   * Categorized logging for specific features
   * Useful for filtering logs during development
   */
  category(category: string) {
    return {
      debug: (message: string, data?: any) => this.debug(`[${category}] ${message}`, data),
      info: (message: string, data?: any) => this.info(`[${category}] ${message}`, data),
      warn: (message: string, data?: any) => this.warn(`[${category}] ${message}`, data),
      error: (message: string, error?: any) => this.error(`[${category}] ${message}`, error),
    };
  }

  /**
   * Performance logging helper
   */
  time(label: string) {
    if (this.isDev) {
      console.time(`⏱️  ${label}`);
    }
  }

  timeEnd(label: string) {
    if (this.isDev) {
      console.timeEnd(`⏱️  ${label}`);
    }
  }
}

// Export singleton instance
export const log = new Logger();

// Export category-specific loggers for common features
export const authLog = log.category('AUTH');
export const workoutLog = log.category('WORKOUT');
export const syncLog = log.category('SYNC');
export const voiceLog = log.category('VOICE');
export const aiLog = log.category('AI');
