// FIREBASE REMOVED - Mock implementation
// import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncStatus {
  lastSyncTime: number;
  isSyncing: boolean;
  error: string | null;
}

class CloudSyncService {
  private syncStatus: SyncStatus = {
    lastSyncTime: 0,
    isSyncing: false,
    error: null,
  };

  /**
   * Sync workout history to Firestore
   * Called after every workout save
   */
  async syncWorkoutHistory(userId: string, workouts: any[]): Promise<boolean> {
    try {
      if (!userId) {
        console.error('No user ID provided for sync');
        return false;
      }

      this.syncStatus.isSyncing = true;
      this.syncStatus.error = null;

      // Mock - do nothing, just update status
      this.syncStatus.lastSyncTime = Date.now();
      this.syncStatus.isSyncing = false;

      // Save sync status to AsyncStorage
      await AsyncStorage.setItem(
        `@muscleup/last_sync_${userId}`,
        JSON.stringify({ lastSyncTime: this.syncStatus.lastSyncTime })
      );

      console.log(`Mock: Would sync ${workouts.length} workouts to cloud`);
      return true;
    } catch (error) {
      console.error('Error in mock sync:', error);
      this.syncStatus.isSyncing = false;
      this.syncStatus.error = error instanceof Error ? error.message : 'Sync failed';
      return false;
    }
  }

  /**
   * Sync single workout to Firestore
   * More efficient for adding one workout
   */
  async syncSingleWorkout(userId: string, workout: any): Promise<boolean> {
    try {
      if (!userId) return false;

      // Mock - do nothing
      this.syncStatus.lastSyncTime = Date.now();
      await AsyncStorage.setItem(
        `@muscleup/last_sync_${userId}`,
        JSON.stringify({ lastSyncTime: this.syncStatus.lastSyncTime })
      );

      console.log(`Mock: Would sync workout ${workout.id} to cloud`);
      return true;
    } catch (error) {
      console.error('Error in mock sync:', error);
      return false;
    }
  }

  /**
   * Restore workouts from Firestore to local AsyncStorage
   * Called on app launch or when user logs in
   */
  async restoreFromCloud(userId: string, userEmail: string): Promise<any[]> {
    try {
      if (!userId) {
        console.error('No user ID provided for restore');
        return [];
      }

      this.syncStatus.isSyncing = true;

      // Mock - return empty array
      console.log('Mock: Would restore workouts from cloud');

      this.syncStatus.isSyncing = false;
      this.syncStatus.lastSyncTime = Date.now();

      return [];
    } catch (error) {
      console.error('Error in mock restore:', error);
      this.syncStatus.isSyncing = false;
      this.syncStatus.error = error instanceof Error ? error.message : 'Restore failed';
      return [];
    }
  }

  /**
   * Sync workout templates to Firestore
   */
  async syncTemplates(userId: string, templates: any[]): Promise<boolean> {
    try {
      if (!userId) return false;

      // Mock - do nothing
      console.log(`Mock: Would sync ${templates.length} templates to cloud`);
      return true;
    } catch (error) {
      console.error('Error in mock sync templates:', error);
      return false;
    }
  }

  /**
   * Restore templates from Firestore
   */
  async restoreTemplates(userId: string): Promise<any[]> {
    try {
      if (!userId) return [];

      // Mock - return empty array
      console.log('Mock: Would restore templates from cloud');
      return [];
    } catch (error) {
      console.error('Error in mock restore templates:', error);
      return [];
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get last sync time from AsyncStorage
   */
  async getLastSyncTime(userId: string): Promise<number> {
    try {
      const syncData = await AsyncStorage.getItem(`@muscleup/last_sync_${userId}`);
      if (syncData) {
        const { lastSyncTime } = JSON.parse(syncData);
        return lastSyncTime || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if device is online before syncing
   */
  private async isOnline(): Promise<boolean> {
    try {
      // Mock - always return true
      return true;
    } catch (error) {
      console.log('Device appears offline');
      return false;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
export default cloudSyncService;
