import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Icon } from './Icon';

interface AtlasCoachingBannerProps {
  message: string;
  onPress: () => void;
  onDismiss: () => void;
}

const AtlasCoachingBanner: React.FC<AtlasCoachingBannerProps> = ({
  message,
  onPress,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.8}>
        <Icon name="atlas-robot" size={32} color={colors.primary} />
        <View style={styles.textContainer}>
          <Text style={styles.label}>Atlas suggests:</Text>
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.dismissButton}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: 30, // Space for dismiss button
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -12, // Half of height to center
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: colors.textTertiary,
    fontSize: 18,
    fontWeight: '300',
  },
});

export default AtlasCoachingBanner;
