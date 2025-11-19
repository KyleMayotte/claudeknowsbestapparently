import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radius } from '../theme';
import { colors } from '../theme/colors';
import type { ExerciseResult } from '../services/exercise';

interface ExerciseDemoModalProps {
  visible: boolean;
  exercise: ExerciseResult | null;
  onClose: () => void;
}

const ExerciseDemoModal: React.FC<ExerciseDemoModalProps> = ({
  visible,
  exercise,
  onClose,
}) => {
  const { colors } = useTheme();
  const [imageLoading, setImageLoading] = React.useState(true);

  if (!exercise) return null;

  const dynamicStyles = {
    modalContent: {
      ...styles.modalContent,
      backgroundColor: colors.background,
    },
    title: {
      ...styles.title,
      color: colors.textPrimary,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: colors.textPrimary,
    },
    infoText: {
      ...styles.infoText,
      color: colors.textSecondary,
    },
    instructions: {
      ...styles.instructions,
      color: colors.textSecondary,
    },
    badge: {
      ...styles.badge,
      backgroundColor: colors.surface,
    },
    badgeText: {
      ...styles.badgeText,
      color: colors.textPrimary,
    },
    closeButton: {
      ...styles.closeButton,
      backgroundColor: colors.primary,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={dynamicStyles.title}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Text style={styles.closeIconText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* GIF Demonstration */}
            {exercise.gifUrl && (
              <View style={styles.gifContainer}>
                {imageLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Loading demonstration...
                    </Text>
                  </View>
                )}
                <Image
                  source={{ uri: exercise.gifUrl }}
                  style={styles.gif}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                />
              </View>
            )}

            {/* Exercise Info */}
            <View style={styles.infoContainer}>
              <View style={styles.badgeRow}>
                <View style={dynamicStyles.badge}>
                  <Text style={dynamicStyles.badgeText}>💪 {exercise.muscle}</Text>
                </View>
                <View style={dynamicStyles.badge}>
                  <Text style={dynamicStyles.badgeText}>🏋️ {exercise.equipment}</Text>
                </View>
                <View style={dynamicStyles.badge}>
                  <Text style={dynamicStyles.badgeText}>📊 {exercise.difficulty}</Text>
                </View>
              </View>

              {/* Instructions */}
              {exercise.instructions && (
                <View style={styles.instructionsContainer}>
                  <Text style={dynamicStyles.sectionTitle}>How to Perform</Text>
                  <Text style={dynamicStyles.instructions}>{exercise.instructions}</Text>
                </View>
              )}

              {/* Target Muscle */}
              <View style={styles.targetContainer}>
                <Text style={dynamicStyles.sectionTitle}>Target Muscle</Text>
                <Text style={dynamicStyles.infoText}>{exercise.type}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  closeIcon: {
    padding: spacing.xs,
  },
  closeIconText: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.textSecondary,
  },
  gifContainer: {
    width: '100%',
    height: 250,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  badgeText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  instructionsContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
  },
  instructions: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  targetContainer: {
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

export default ExerciseDemoModal;
