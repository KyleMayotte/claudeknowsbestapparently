// Services barrel export
// Import all services from a single location

export { default as api } from './api';
export { default as authService } from './auth';
export { default as exerciseService } from './exercise';
export { default as workoutService } from './workouts';
export { default as goalsService } from './goals';
export { default as progressService } from './progress';
export { default as preferencesService } from './preferences';
export { default as cloudSyncService } from './cloudSync';
export { voiceLogger } from './voiceLogger';
export { atlasVoice } from './atlasVoice';
export { workoutNotification } from './workoutNotification';
export type { VoiceLoggerResult } from './voiceLogger';
export type { AtlasVoiceContext } from './atlasVoice';
export type { WorkoutNotificationData } from './workoutNotification';

// Re-export named functions from function-based services
export * from './exerciseDB';
export * from './firebaseFriend';
export * from './openai';
export * from './notifications';
export * from './workoutSession';
export * from './plateCalculator';
export * from './weeklyAnalysis';
export * from './weeklyAdaptation';

// Re-export types for convenience
export type * from './auth';
export type * from './exercise';
export type * from './workouts';
export type * from './goals';
export type * from './progress';
export type * from '../types/preferences';
