/**
 * Friend System - Firebase Cloud Implementation
 *
 * This module re-exports Firebase-based friend system functions from firebaseFriend.
 * All friend data is now stored in Firebase Firestore for real cross-device functionality.
 *
 * Collections:
 * - inviteCodes: User invite codes for adding friends
 * - friendRelationships: Bidirectional friend connections
 * - sharedWorkouts: Workouts shared with friends
 */

export {
  generateInviteCode,
  getMyInviteCode,
  addFriend,
  loadFriends,
  removeFriend,
  shareWorkout,
  loadFriendWorkouts,
  getFriendWorkouts,
  getAllFriendsWorkouts,
} from '../services/firebaseFriend';
