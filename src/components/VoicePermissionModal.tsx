import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

interface VoicePermissionModalProps {
  visible: boolean;
  onRequestPermission: () => void;
  onDismiss: () => void;
  error?: string;
}

export const VoicePermissionModal: React.FC<VoicePermissionModalProps> = ({
  visible,
  onRequestPermission,
  onDismiss,
  error,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎤</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {error ? 'Microphone Access Required' : 'Enable Voice Logging'}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {error
              ? 'MuscleUp needs microphone access to log your sets with voice commands. Please grant permission in your device settings.'
              : 'Log your sets hands-free by speaking! Just say things like "225 for 8" or "same weight".'
            }
          </Text>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onRequestPermission}
            >
              <Text style={styles.primaryButtonText}>
                {error ? 'Open Settings' : 'Enable Voice'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper text */}
          {Platform.OS === 'android' && (
            <Text style={styles.helperText}>
              Voice recognition requires an active internet connection
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: colors.error + '15',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
