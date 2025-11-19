import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Vibration,
} from 'react-native';
import { typography, spacing, radius } from '../theme';
import { colors } from '../theme/colors';
import type { PRCelebration } from '../types/pr';
import type { UnitSystem } from '../types/preferences';
import { RobotMascot } from './RobotMascot';

interface WorkoutCompletionModalProps {
  visible: boolean;
  workoutName: string;
  emoji: string;
  duration: number; // in minutes
  totalSets: number;
  totalVolume: number; // in lbs/kg
  prs: PRCelebration[]; // Array of PRs achieved in this workout
  comparisonMessage?: string; // Optional workout comparison
  unitSystem?: UnitSystem; // Unit system for displaying weights
  onClose: () => void;
  onShare?: () => void; // Callback for share button
}

const { width } = Dimensions.get('window');

export const WorkoutCompletionModal: React.FC<WorkoutCompletionModalProps> = ({
  visible,
  workoutName,
  emoji,
  duration,
  totalSets,
  totalVolume,
  prs,
  comparisonMessage,
  unitSystem = 'lbs',
  onClose,
  onShare,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Confetti animations (8 particles)
  const confettiAnims = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: new Animated.Value(-100),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const hasPRs = prs.length > 0;

  useEffect(() => {
    if (visible) {
      // Reset closing flag
      setIsClosing(false);

      // Vibration feedback for PRs
      if (hasPRs) {
        Vibration.vibrate(400); // Strong single pulse for PR celebration
      }

      // Scale and fade in animation (values already at 0 from initialization or handleClose)
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

      // Pulse animation for trophy
      if (hasPRs) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Confetti animation
        confettiAnims.forEach((anim, index) => {
          const delay = index * 80;
          const xOffset = (index % 2 === 0 ? 1 : -1) * (50 + Math.random() * 100);

          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 100,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: 600,
              duration: 2000,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateX, {
              toValue: xOffset,
              duration: 2000,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: (index % 2 === 0 ? 1 : -1) * 720,
              duration: 2000,
              delay,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Fade out at the end
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          });
        });
      }
    }
    // Don't do anything in else - let animations complete naturally
  }, [visible]); // Removed hasPRs from dependencies to prevent re-triggers

  const handleClose = () => {
    if (isClosing) return; // Prevent multiple close calls
    setIsClosing(true);

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
    ]).start(({ finished }) => {
      if (finished) {
        // Reset all animation values for next time
        scaleAnim.setValue(0);
        fadeAnim.setValue(0);
        pulseAnim.setValue(1);
        confettiAnims.forEach(anim => {
          anim.translateY.setValue(-100);
          anim.translateX.setValue(0);
          anim.rotate.setValue(0);
          anim.opacity.setValue(0);
        });
        onClose();
      }
    });
  };

  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

  // Don't render when not visible
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="auto"
    >
      {/* Confetti particles */}
      {hasPRs && confettiAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: confettiColors[index],
              opacity: anim.opacity,
              transform: [
                { translateY: anim.translateY },
                { translateX: anim.translateX },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={isClosing ? undefined : handleClose}
      />
      <Animated.View
        style={[
          styles.container,
          hasPRs && styles.containerWithPR,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header - Robot Mascot */}
        <Animated.View
          style={[
            styles.robotContainer,
            hasPRs && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <RobotMascot width={120} height={140} animate={visible} />
        </Animated.View>

        <Text style={[styles.mainTitle, hasPRs && styles.prMainTitle]}>
          {hasPRs ? `NEW PR${prs.length > 1 ? 'S' : ''}!` : 'Workout Complete!'}
        </Text>

        {/* PR Summary - compact with scroll */}
        {hasPRs && (
          <ScrollView
            style={styles.prSummaryContainer}
            contentContainerStyle={styles.prSummary}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
          >
            {prs.map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExerciseName}>💪 {pr.exerciseName}</Text>
                {pr.oldWeight && pr.oldReps ? (
                  <View style={styles.prComparison}>
                    <Text style={styles.prOld}>
                      {pr.oldWeight} {unitSystem} × {pr.oldReps}
                    </Text>
                    <Text style={styles.prArrow}> → </Text>
                    <Text style={styles.prNew}>
                      {pr.newWeight} {unitSystem} × {pr.newReps}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.prNew}>
                    {pr.newWeight} {unitSystem} × {pr.newReps} <Text style={styles.improvement}>({pr.improvement})</Text>
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Workout Name */}
        <Text style={styles.workoutName}>
          {emoji} {workoutName}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>sets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{(totalVolume / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>{unitSystem}</Text>
          </View>
        </View>

        {/* Workout Comparison */}
        {comparisonMessage && (
          <View style={styles.comparisonBox}>
            {comparisonMessage.split('\n').map((line, index) => {
              // Check if line is bold (wrapped in **)
              const isBold = line.startsWith('**') && line.endsWith('**');
              const text = isBold ? line.slice(2, -2) : line;

              // Skip empty lines but keep spacing
              if (line === '') {
                return <View key={index} style={{ height: 4 }} />;
              }

              return (
                <Text
                  key={index}
                  style={[
                    styles.comparisonText,
                    isBold && styles.comparisonHeader
                  ]}
                >
                  {text}
                </Text>
              );
            })}
          </View>
        )}

        {/* Share Button */}
        {onShare && (
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Text style={styles.shareButtonText}>Share 📤</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={isClosing ? undefined : handleClose}
          disabled={isClosing}
        >
          <Text style={styles.closeButtonText}>
            {hasPRs ? "LET'S WORK! 🔥" : 'NICE WORK!'}
          </Text>
        </TouchableOpacity>
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
  confetti: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -5, // Center the 10px particle
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 10000, // Ensure confetti appears above everything
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: width * 0.9,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  containerWithPR: {
    borderWidth: 3,
    borderColor: '#FFD700', // Gold border for PRs
  },

  // Main Header
  robotContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  mainEmoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  mainTitle: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  prMainTitle: {
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // PR Summary - compact with scroll support
  prSummaryContainer: {
    width: '100%',
    maxHeight: 130, // Limit height, allows ~5 PRs before scrolling
    marginBottom: spacing.lg,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.lg,
  },
  prSummary: {
    padding: spacing.md,
  },
  prItem: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  prExerciseName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  prComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prOld: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  prArrow: {
    ...typography.body,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
  },
  prNew: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  prText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  improvement: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  // Workout Name
  workoutName: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // Comparison Box
  comparisonBox: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.lg,
  },
  comparisonText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  comparisonHeader: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    color: colors.primary,
  },

  // Share Button
  shareButton: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shareButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },

  // Close Button
  closeButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.button,
    fontSize: 17,
    fontWeight: '900',
    color: colors.textInverse,
    letterSpacing: 1.2,
  },
});
