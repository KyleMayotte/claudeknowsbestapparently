import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import { Button, Card } from '../components';
import { colors, typography, spacing } from '../theme';
import {
  getMyInviteCode,
  loadFriends,
  addFriend,
  removeFriend,
} from '../utils/friendSystem';
import { Friend, InviteCode } from '../types/friend';
import { showErrorAlert, showSuccessAlert } from '../utils/errorHandler';

interface FriendsScreenProps {
  onBack: () => void;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onBack }) => {
  const { user } = useAuthContext();
  const [myInviteCode, setMyInviteCode] = useState<InviteCode | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [friendName, setFriendName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingFriends(true);
    try {
      // Get user's invite code
      const userId = user?.id || 'user';
      const userName = user?.name || 'User';

      console.log('=== LOADING INVITE CODE ===');
      console.log('userId:', userId);
      console.log('userName:', userName);
      console.log('user object:', JSON.stringify(user));

      const code = await getMyInviteCode(userId, userName);

      console.log('=== GOT INVITE CODE ===');
      console.log('code:', JSON.stringify(code));

      setMyInviteCode(code);
      setErrorMessage(''); // Clear any previous errors

      // Load friends list
      const friendsList = await loadFriends(userId);
      console.log('Friends loaded:', friendsList.length);
      setFriends(friendsList);
    } catch (error: any) {
      console.error('=== ERROR LOADING FRIENDS DATA ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Full error:', JSON.stringify(error, null, 2));

      const errorMsg = error?.message || error?.code || 'Failed to load friends data';
      setErrorMessage(errorMsg);
      showErrorAlert('Error Loading Friends', error, () => loadData());
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleShareInviteCode = async () => {
    if (!myInviteCode) return;

    try {
      await Share.share({
        message: `Join me on MuscleUp! Use my invite code: ${myInviteCode.code}`,
        title: 'Join MuscleUp',
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim() || !friendName.trim()) {
      Alert.alert('Error', 'Please enter both invite code and friend name');
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id || 'user';
      await addFriend(userId, friendCode.trim().toUpperCase(), friendName.trim());
      showSuccessAlert('Success', `${friendName} added as a friend!`);
      setFriendCode('');
      setFriendName('');
      setShowAddFriend(false);
      await loadData();
    } catch (error: any) {
      showErrorAlert('Failed to Add Friend', error, () => handleAddFriend());
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = user?.id || 'user';
              await removeFriend(userId, friend.id);
              showSuccessAlert('Success', `${friend.name} removed`);
              await loadData();
            } catch (error: any) {
              showErrorAlert('Failed to Remove Friend', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* My Invite Code Section */}
        <Card style={styles.inviteCard}>
          <Text style={styles.sectionTitle}>Your Invite Code</Text>
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCode}>
              {myInviteCode?.code || (errorMessage ? 'Error' : 'Loading...')}
            </Text>
          </View>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={styles.inviteHint}>
              Share this code with friends so they can add you
            </Text>
          )}
          <Button
            title="Share Code"
            onPress={handleShareInviteCode}
            variant="primary"
            style={styles.shareButton}
            disabled={!myInviteCode}
          />
        </Card>

        {/* Friends List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
            <TouchableOpacity onPress={() => setShowAddFriend(!showAddFriend)}>
              <Text style={styles.addButton}>{showAddFriend ? '✕' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>

          {/* Add Friend Form */}
          {showAddFriend && (
            <Card style={styles.addFriendCard}>
              <Text style={styles.formLabel}>Friend's Invite Code</Text>
              <TextInput
                style={styles.input}
                value={friendCode}
                onChangeText={setFriendCode}
                placeholder="ABC123"
                autoCapitalize="characters"
                maxLength={6}
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={styles.formLabel}>Friend's Name</Text>
              <TextInput
                style={styles.input}
                value={friendName}
                onChangeText={setFriendName}
                placeholder="Mike"
                placeholderTextColor={colors.textTertiary}
              />

              <Button
                title={loading ? 'Adding...' : 'Add Friend'}
                onPress={handleAddFriend}
                disabled={loading || !friendCode.trim() || !friendName.trim()}
                style={styles.addFriendButton}
              />
            </Card>
          )}

          {/* Friends List */}
          {loadingFriends ? (
            <Card style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </Card>
          ) : friends.length > 0 ? (
            friends.map(friend => (
              <Card key={friend.id} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendEmoji}>👤</Text>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendCode}>Code: {friend.id}</Text>
                    {friend.lastWorkoutDate && (
                      <Text style={styles.friendLastWorkout}>
                        Last workout: {new Date(friend.lastWorkoutDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFriend(friend)}
                  style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends to see their workouts and compete on PRs
              </Text>
            </Card>
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inviteCard: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  inviteCodeContainer: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  inviteCode: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 4,
  },
  inviteHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  shareButton: {
    minWidth: 150,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  addButton: {
    ...typography.label,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  addFriendCard: {
    marginBottom: spacing.md,
  },
  formLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  addFriendButton: {
    marginTop: spacing.md,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendEmoji: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  friendCode: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  friendLastWorkout: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  removeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  loadingCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
});

export default FriendsScreen;
