import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../context/AuthContext';
import { Card } from '../components';
import { colors, typography, spacing } from '../theme';
import { getAllFriendsWorkouts, loadFriends } from '../utils/friendSystem';
import {
  likeWorkout,
  unlikeWorkout,
  addWorkoutComment
} from '../services/firebaseFriend';
import { FriendWorkout } from '../types/friend';

interface FriendFeedScreenProps {
  onBack?: () => void;
  onManageFriends?: () => void;
}

const FriendFeedScreen: React.FC<FriendFeedScreenProps> = ({ onBack, onManageFriends }) => {
  const { user } = useAuthContext();
  const userId = user?.id || 'user';
  const CACHE_KEY = `@muscleup/friend_feed_${userId}`;

  const [workouts, setWorkouts] = useState<FriendWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [workoutId: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<{ [commentId: string]: boolean }>({});
  const [replyText, setReplyText] = useState<{ [commentId: string]: string }>({});

  // Memoized function to load workouts
  const loadWorkouts = useCallback(async (silent = true) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const friends = await loadFriends(userId);
      const friendWorkouts = await getAllFriendsWorkouts(userId, 20);

      setWorkouts(friendWorkouts);

      // Cache the results
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(friendWorkouts));
    } catch (error) {
      console.error('Error loading friend workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, CACHE_KEY]);

  // Load cached data immediately on mount
  useEffect(() => {
    let mounted = true;

    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && mounted) {
          const parsedWorkouts = JSON.parse(cached);
          setWorkouts(parsedWorkouts);
          setLoading(false);
        } else if (mounted) {
          // No cache found, wait for network load
          setLoading(true);
        }
      } catch (error) {
        console.error('Error loading cached workouts:', error);
        if (mounted) {
          setLoading(true);
        }
      }
    };

    loadCached();

    return () => {
      mounted = false;
    };
  }, [CACHE_KEY]);

  // Reload workouts when the Feed tab becomes visible
  useFocusEffect(
    useCallback(() => {
      loadWorkouts(true);
    }, [loadWorkouts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts(true);
    setRefreshing(false);
  };

  const toggleWorkoutExpand = (workoutId: string) => {
    setExpandedWorkoutId(expandedWorkoutId === workoutId ? null : workoutId);
  };

  const formatDate = (workout: FriendWorkout) => {
    // Use workout ID (timestamp) to get actual completion time
    const completedAt = new Date(parseInt(workout.id));
    const now = new Date();
    const diffMs = now.getTime() - completedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 hour ago: "X min ago"
    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    // Less than 24 hours ago: "X hr ago"
    else if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    // Less than 7 days ago: "X days ago"
    else if (diffDays < 7) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    }
    // Older: "Jan 15"
    else {
      return completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleLike = async (workout: FriendWorkout) => {
    try {
      const userId = user?.id || '';
      const userName = user?.name || 'User';
      const userHasLiked = workout.likes?.some(like => like.userId === userId);

      // OPTIMISTIC UPDATE: Update UI immediately (both likes array and count)
      setWorkouts(prev => prev.map(w => {
        if (w.id === workout.id) {
          const updatedLikes = userHasLiked
            ? (w.likes || []).filter(like => like.userId !== userId)
            : [...(w.likes || []), { userId, userName, timestamp: new Date() }];
          return {
            ...w,
            likes: updatedLikes,
            likeCount: updatedLikes.length // Update count immediately
          };
        }
        return w;
      }));

      // Then update Firebase in background
      if (userHasLiked) {
        await unlikeWorkout(workout.id, userId);
      } else {
        await likeWorkout(workout.id, userId, userName);
      }
    } catch (error) {
      console.error('Error liking workout:', error);
      // Revert optimistic update on error
      await loadWorkouts(true);
    }
  };

  const handleComment = async (workoutId: string) => {
    try {
      const text = commentText[workoutId]?.trim();
      if (!text) return;

      const userId = user?.id || '';
      const userName = user?.name || 'User';

      // OPTIMISTIC UPDATE: Add comment to UI immediately (both comments array and count)
      const tempCommentId = `temp-${Date.now()}`;
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          const newComment = {
            id: tempCommentId,
            userId,
            userName,
            text,
            timestamp: new Date(),
            replies: []
          };
          const updatedComments = [...(w.comments || []), newComment];
          return {
            ...w,
            comments: updatedComments,
            commentCount: updatedComments.length // Update count immediately
          };
        }
        return w;
      }));

      // Clear comment input immediately
      setCommentText(prev => ({ ...prev, [workoutId]: '' }));

      // Then save to Firebase in background
      await addWorkoutComment(workoutId, userId, userName, text);

      // Reload to get real comment ID from Firebase
      await loadWorkouts(true).catch(err => {
        console.log('Error reloading workouts after comment, ignoring:', err);
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update on error
      await loadWorkouts(true);
    }
  };

  const handleReply = async (workoutId: string, commentId: string) => {
    try {
      const text = replyText[commentId]?.trim();
      if (!text) return;

      const userId = user?.id || '';
      const userName = user?.name || 'User';

      await addWorkoutComment(workoutId, userId, userName, text, commentId);

      // Clear reply input and hide reply form
      setReplyText(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(prev => ({ ...prev, [commentId]: false }));

      // Reload workouts silently to show new reply
      await loadWorkouts(true).catch(err => {
        console.log('Error reloading workouts after reply, ignoring:', err);
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      // Silently fail - the reply was probably saved, just can't reload yet
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.title}>Friend Feed</Text>
        {onManageFriends ? (
          <TouchableOpacity onPress={onManageFriends} style={styles.manageFriendsButton}>
            <Text style={styles.manageFriendsText}>Manage</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>

        {workouts.length > 0 ? (
          workouts.map(workout => {
            const isExpanded = expandedWorkoutId === workout.id;
            return (
              <Card key={workout.id} style={styles.workoutCard}>
                <TouchableOpacity
                  onPress={() => toggleWorkoutExpand(workout.id)}
                  activeOpacity={0.7}>
                  {/* Header */}
                  <View style={styles.workoutHeader}>
                    <View style={styles.workoutHeaderLeft}>
                      <Text style={styles.workoutEmoji}>{workout.emoji}</Text>
                      <View>
                        <Text style={styles.friendName}>{workout.friendName}</Text>
                        <Text style={styles.workoutName}>{workout.templateName}</Text>
                      </View>
                    </View>
                    <View style={styles.workoutHeaderRight}>
                      <Text style={styles.workoutDate}>{formatDate(workout)}</Text>
                      <Text style={styles.workoutDuration}>{workout.duration} min</Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.quickStats}>
                    <Text style={styles.quickStatsText}>
                      {workout.exercises.length} exercises • {' '}
                      {workout.exercises.reduce((total, ex) => total + ex.sets.filter(s => s.completed).length, 0)} sets
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Workout Photo */}
                {workout.photoUrl && (
                  <Image
                    source={{ uri: workout.photoUrl }}
                    style={styles.workoutPhoto}
                    resizeMode="cover"
                  />
                )}

                <TouchableOpacity
                  onPress={() => toggleWorkoutExpand(workout.id)}
                  activeOpacity={0.7}>
                  {/* Expand indicator */}
                  <Text style={styles.expandIndicator}>
                    {isExpanded ? '▲ Tap to collapse' : '▼ Tap to see details'}
                  </Text>
                </TouchableOpacity>

                {/* Like and Comment Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(workout)}>
                    <Text style={styles.actionIcon}>
                      {workout.likes?.some(like => like.userId === user?.id) ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.actionText}>
                      {workout.likeCount || 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleWorkoutExpand(workout.id)}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>
                      {workout.commentCount || 0}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {/* Exercise Details */}
                    {workout.exercises.map((exercise, exIndex) => (
                      <View key={exIndex} style={styles.exerciseSection}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <View style={styles.setsContainer}>
                          {exercise.sets.map((set, setIndex) => (
                            set.completed && (
                              <View key={setIndex} style={styles.setRow}>
                                <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                                <Text style={styles.setValue}>
                                  {set.weight} lbs × {set.reps} reps
                                </Text>
                              </View>
                            )
                          ))}
                        </View>
                      </View>
                    ))}

                    {/* Comments Section */}
                    <View style={styles.commentsSection}>
                      <Text style={styles.commentsSectionTitle}>Comments</Text>

                      {/* Existing Comments */}
                      {workout.comments && workout.comments.length > 0 ? (
                        workout.comments.map((comment) => (
                          <View key={comment.id}>
                            <View style={styles.commentItem}>
                              <Text style={styles.commentAuthor}>{comment.userName}</Text>
                              <Text style={styles.commentText}>{comment.text}</Text>
                              <View style={styles.commentFooter}>
                                <Text style={styles.commentDate}>
                                  {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => setReplyingTo(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}>
                                  <Text style={styles.replyButton}>Reply</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Reply Input */}
                            {replyingTo[comment.id] && (
                              <View style={[styles.addCommentContainer, styles.replyContainer]}>
                                <TextInput
                                  style={styles.commentInput}
                                  placeholder={`Reply to ${comment.userName}...`}
                                  placeholderTextColor={colors.textTertiary}
                                  value={replyText[comment.id] || ''}
                                  onChangeText={(text) =>
                                    setReplyText(prev => ({ ...prev, [comment.id]: text }))
                                  }
                                  multiline
                                />
                                <TouchableOpacity
                                  style={[
                                    styles.postButton,
                                    !replyText[comment.id]?.trim() && styles.postButtonDisabled
                                  ]}
                                  onPress={() => handleReply(workout.id, comment.id)}
                                  disabled={!replyText[comment.id]?.trim()}>
                                  <Text style={styles.postButtonText}>Reply</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Nested Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <View style={styles.repliesContainer}>
                                {comment.replies.map((reply) => (
                                  <View key={reply.id} style={styles.replyItem}>
                                    <Text style={styles.commentAuthor}>{reply.userName}</Text>
                                    <Text style={styles.commentText}>{reply.text}</Text>
                                    <Text style={styles.commentDate}>
                                      {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noComments}>No comments yet</Text>
                      )}

                      {/* Add Comment Input */}
                      <View style={styles.addCommentContainer}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Add a comment..."
                          placeholderTextColor={colors.textTertiary}
                          value={commentText[workout.id] || ''}
                          onChangeText={(text) =>
                            setCommentText(prev => ({ ...prev, [workout.id]: text }))
                          }
                          multiline
                        />
                        <TouchableOpacity
                          style={[
                            styles.postButton,
                            !commentText[workout.id]?.trim() && styles.postButtonDisabled
                          ]}
                          onPress={() => handleComment(workout.id)}
                          disabled={!commentText[workout.id]?.trim()}>
                          <Text style={styles.postButtonText}>Post</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👻</Text>
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>
              Your friends' workouts will appear here when they complete them
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 16,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 60,
  },
  manageFriendsButton: {
    padding: spacing.sm,
  },
  manageFriendsText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  workoutCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  workoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  friendName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  workoutName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs / 2,
  },
  workoutHeaderRight: {
    alignItems: 'flex-end',
  },
  workoutDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  workoutDuration: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs / 2,
  },
  quickStats: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.xs,
  },
  quickStatsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  workoutPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  expandIndicator: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseSection: {
    marginBottom: spacing.md,
  },
  exerciseName: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  setsContainer: {
    backgroundColor: colors.surface + '80',
    borderRadius: 8,
    padding: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  setNumber: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  setValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentsSectionTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  commentItem: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface + '60',
    borderRadius: 8,
  },
  commentAuthor: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  commentText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  commentDate: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  noComments: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  commentInput: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.textPrimary,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  postButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  postButtonText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#fff',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
  },
  replyButton: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  replyContainer: {
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
  },
  repliesContainer: {
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
  },
  replyItem: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface + '40',
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
});

export default FriendFeedScreen;
