// FIREBASE REMOVED - Mock implementation
// import firestore from '@react-native-firebase/firestore';
import { Friend, FriendWorkout, InviteCode } from '../types/friend';

/**
 * Firebase Firestore collections:
 * - inviteCodes: { userId, code, userName, createdAt }
 * - friendRelationships: { userId, friendId, friendName, dateAdded }
 * - sharedWorkouts: { userId, workoutId, friendId, friendName, templateName, ... }
 */

const INVITE_CODES_COLLECTION = 'inviteCodes';
const FRIEND_RELATIONSHIPS_COLLECTION = 'friendRelationships';
const SHARED_WORKOUTS_COLLECTION = 'sharedWorkouts';
const WORKOUT_LIKES_COLLECTION = 'workoutLikes';
const WORKOUT_COMMENTS_COLLECTION = 'workoutComments';

/**
 * Generate a unique 6-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Get or create the user's invite code from Firestore
 */
export async function getMyInviteCode(userId: string, userName: string): Promise<InviteCode> {
  try {
    console.log('Mock: getMyInviteCode called');

    // Mock - return a generated invite code
    const inviteCode: InviteCode = {
      code: generateInviteCode(),
      userId,
      userName,
      createdAt: new Date().toISOString(),
    };

    return inviteCode;
  } catch (error: any) {
    console.error('Error in mock getMyInviteCode:', error);
    throw new Error(error?.message || 'Failed to generate invite code');
  }
}

/**
 * Find a user by their invite code
 */
async function findUserByInviteCode(inviteCode: string): Promise<{ userId: string; userName: string } | null> {
  try {
    // Mock - return null (no user found)
    console.log('Mock: findUserByInviteCode called with code:', inviteCode);
    return null;
  } catch (error) {
    console.error('Error in mock findUserByInviteCode:', error);
    throw error;
  }
}

/**
 * Add a friend using their invite code
 */
export async function addFriend(userId: string, friendInviteCode: string, customName?: string): Promise<Friend> {
  try {
    // Mock - throw error (friend not found)
    console.log('Mock: addFriend called');
    throw new Error('Invalid invite code');
  } catch (error) {
    console.error('Error in mock addFriend:', error);
    throw error;
  }
}

/**
 * Load all friends from Firestore
 */
export async function loadFriends(userId: string): Promise<Friend[]> {
  try {
    // Mock - return empty array
    console.log('Mock: loadFriends called');
    return [];
  } catch (error) {
    console.error('Error in mock loadFriends:', error);
    return [];
  }
}

/**
 * Remove a friend from Firestore
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: removeFriend called');
  } catch (error) {
    console.error('Error in mock removeFriend:', error);
    throw error;
  }
}

/**
 * Share a workout with all friends via Firestore
 */
export async function shareWorkout(
  userId: string,
  workoutId: string,
  templateName: string,
  emoji: string,
  date: string,
  duration: number,
  exercises: any[],
  myInviteCode: string,
  myName: string,
  photoUrl?: string
): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: shareWorkout called for workout:', workoutId);
  } catch (error) {
    console.error('Error in mock shareWorkout:', error);
    throw error;
  }
}

/**
 * Load friend workouts from Firestore
 */
export async function loadFriendWorkouts(userId: string): Promise<FriendWorkout[]> {
  try {
    // Mock - return empty array
    console.log('Mock: loadFriendWorkouts called');
    return [];
  } catch (error) {
    console.error('Error in mock loadFriendWorkouts:', error);
    return [];
  }
}

/**
 * Get recent workouts from a specific friend
 */
export async function getFriendWorkouts(
  userId: string,
  friendId: string,
  limit: number = 10
): Promise<FriendWorkout[]> {
  try {
    // Mock - return empty array
    console.log('Mock: getFriendWorkouts called');
    return [];
  } catch (error) {
    console.error('Error in mock getFriendWorkouts:', error);
    return [];
  }
}

/**
 * Get all friends' recent workouts (for feed)
 */
export async function getAllFriendsWorkouts(userId: string, limit: number = 20): Promise<FriendWorkout[]> {
  try {
    // Mock - return empty array
    console.log('Mock: getAllFriendsWorkouts called');
    return [];
  } catch (error) {
    console.error('Error in mock getAllFriendsWorkouts:', error);
    return [];
  }
}

/**
 * Like a workout
 */
export async function likeWorkout(workoutId: string, userId: string, userName: string): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: likeWorkout called');
  } catch (error) {
    console.error('Error in mock likeWorkout:', error);
    throw error;
  }
}

/**
 * Unlike a workout
 */
export async function unlikeWorkout(workoutId: string, userId: string): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: unlikeWorkout called');
  } catch (error) {
    console.error('Error in mock unlikeWorkout:', error);
    throw error;
  }
}

/**
 * Get likes for a workout
 */
export async function getWorkoutLikes(workoutId: string): Promise<any[]> {
  try {
    // Mock - return empty array
    console.log('Mock: getWorkoutLikes called');
    return [];
  } catch (error) {
    console.error('Error in mock getWorkoutLikes:', error);
    return [];
  }
}

/**
 * Add a comment to a workout (or reply to a comment)
 */
export async function addWorkoutComment(
  workoutId: string,
  userId: string,
  userName: string,
  text: string,
  parentCommentId?: string
): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: addWorkoutComment called');
  } catch (error) {
    console.error('Error in mock addWorkoutComment:', error);
    throw error;
  }
}

/**
 * Get comments for a workout (organized with nested replies)
 */
export async function getWorkoutComments(workoutId: string): Promise<any[]> {
  try {
    // Mock - return empty array
    console.log('Mock: getWorkoutComments called');
    return [];
  } catch (error) {
    console.error('Error in mock getWorkoutComments:', error);
    return [];
  }
}

/**
 * Delete a comment
 */
export async function deleteWorkoutComment(commentId: string): Promise<void> {
  try {
    // Mock - do nothing
    console.log('Mock: deleteWorkoutComment called');
  } catch (error) {
    console.error('Error in mock deleteWorkoutComment:', error);
    throw error;
  }
}
