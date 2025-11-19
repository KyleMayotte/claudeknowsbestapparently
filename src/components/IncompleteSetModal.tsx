import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { typography, spacing, radius, shadows } from '../theme';
import { colors } from '../theme/colors';

interface IncompleteSetModalProps {
  visible: boolean;
  setCount: number;
  onComplete: () => void;
  onGoBack: () => void;
  onCancel: () => void;
}

const IncompleteSetModal: React.FC<IncompleteSetModalProps> = ({
  visible,
  setCount,
  onComplete,
  onGoBack,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onGoBack}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Incomplete Sets</Text>
          <Text style={styles.message}>
            You have {setCount} incomplete {setCount === 1 ? 'set' : 'sets'} with data entered.
          </Text>
          <Text style={styles.subtitle}>
            What would you like to do?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.tertiaryButtonText}>Cancel Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onGoBack}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onComplete}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Complete & Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.large,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    width: '100%',
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
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tertiaryButton: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.error,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tertiaryButtonText: {
    ...typography.button,
    color: colors.error,
    fontWeight: '600',
  },
});

export default IncompleteSetModal;
