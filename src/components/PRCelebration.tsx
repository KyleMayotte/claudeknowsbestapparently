import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { typography, spacing } from '../theme';
import { colors } from '../theme/colors';
import { PRCelebration as PRCelebrationType } from '../types/pr';

interface PRCelebrationProps {
  celebration: PRCelebrationType;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const PRCelebration: React.FC<PRCelebrationProps> = ({ celebration, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale and fade in animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Emoji */}
        <Text style={styles.emoji}>🏆</Text>

        {/* Title */}
        <Text style={styles.title}>NEW PR!</Text>

        {/* Exercise Name */}
        <Text style={styles.exerciseName}>{celebration.exerciseName}</Text>

        {/* New Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.newStats}>
            {celebration.newWeight} lbs × {celebration.newReps} reps
          </Text>
        </View>

        {/* Improvement */}
        <View style={styles.improvementBadge}>
          <Text style={styles.improvementText}>{celebration.improvement}</Text>
        </View>

        {/* Old Stats (if exists) */}
        {celebration.oldWeight && celebration.oldReps && (
          <Text style={styles.oldStats}>
            Previous: {celebration.oldWeight} lbs × {celebration.oldReps} reps
          </Text>
        )}

        {/* Tap to close hint */}
        <Text style={styles.closeHint}>Tap anywhere to close</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFD700', // Gold border
  },
  emoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700', // Gold
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  exerciseName: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  newStats: {
    ...typography.h2,
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  improvementBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  improvementText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  oldStats: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  closeHint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
