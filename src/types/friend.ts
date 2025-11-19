// Friend System Types

export interface Friend {
  id: string; // Unique friend ID (their invite code)
  name: string;
  email?: string;
  dateAdded: string; // ISO date string
  lastWorkoutDate?: string; // ISO date string of their last workout
}

export interface FriendWorkout {
  id: string;
  friendId: string;
  friendName: string;
  templateName: string;
  emoji: string;
  date: string; // ISO date string
  duration: number; // minutes
  exercises: FriendExercise[];
  photoUrl?: string; // Optional photo URL from Firebase Storage
  likes?: WorkoutLike[];
  comments?: WorkoutComment[];
  likeCount?: number;
  commentCount?: number;
}

export interface FriendExercise {
  name: string;
  sets: FriendSet[];
}

export interface FriendSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface InviteCode {
  code: string; // 6-character alphanumeric code
  userId: string; // User's unique ID
  userName: string;
  createdAt: string; // ISO date string
}

export interface FriendRequest {
  fromUserId: string;
  fromUserName: string;
  toInviteCode: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface WorkoutLike {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  createdAt: string; // ISO date string
}

export interface WorkoutComment {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string; // ISO date string
  parentCommentId?: string; // For replies
  replies?: WorkoutComment[]; // Nested replies
}
