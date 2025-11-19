import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

interface RobotMascotProps {
  width?: number;
  height?: number;
  animate?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RobotMascot: React.FC<RobotMascotProps> = ({
  width = 140,
  height = 160,
  animate = false
}) => {
  // Animation values
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const eyeBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let bounceAnimation: Animated.CompositeAnimation | null = null;
    let blinkTimeout: NodeJS.Timeout | null = null;
    let isRunning = true;

    if (animate) {
      // Small delay before starting animations to let modal settle
      const startTimeout = setTimeout(() => {
        if (!isRunning) return;

        // Antenna bounce animation
        bounceAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
        bounceAnimation.start();

        // Eye blink animation
        const blinkSequence = () => {
          if (!isRunning) return;

          blinkTimeout = setTimeout(() => {
            Animated.sequence([
              Animated.timing(eyeBlinkAnim, {
                toValue: 0.1, // Almost closed
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(eyeBlinkAnim, {
                toValue: 1, // Open
                duration: 100,
                useNativeDriver: true,
              }),
            ]).start(() => {
              if (isRunning) {
                blinkSequence();
              }
            });
          }, 2000);
        };
        blinkSequence();
      }, 100); // Short delay to let modal animation complete

      return () => {
        isRunning = false;
        clearTimeout(startTimeout);
        if (blinkTimeout) clearTimeout(blinkTimeout);
        if (bounceAnimation) bounceAnimation.stop();
        bounceAnim.setValue(0);
        eyeBlinkAnim.setValue(1);
      };
    } else {
      // Reset animations immediately
      bounceAnim.setValue(0);
      eyeBlinkAnim.setValue(1);
    }
  }, [animate, bounceAnim, eyeBlinkAnim]);

  // Convert Animated.Value to interpolated Y position for antenna
  const antennaY = bounceAnim.interpolate({
    inputRange: [-4, 0],
    outputRange: [1, 5],
  });

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 140 160"
      style={styles.svg}
    >
      {/* Antenna */}
      <Line x1="70" y1="8" x2="70" y2="22" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
      <AnimatedCircle
        cx="70"
        cy={antennaY}
        r="5"
        fill="#3B82F6"
      />

      {/* Head - larger and rounder */}
      <Rect x="30" y="22" width="80" height="75" rx="25" fill="#3B82F6" />

      {/* Eyes - bigger and more expressive */}
      <AnimatedCircle cx="52" cy="55" r="13" fill="white" opacity={eyeBlinkAnim} />
      <AnimatedCircle cx="88" cy="55" r="13" fill="white" opacity={eyeBlinkAnim} />
      <AnimatedCircle cx="52" cy="55" r="7" fill="#1E293B" opacity={eyeBlinkAnim} />
      <AnimatedCircle cx="88" cy="55" r="7" fill="#1E293B" opacity={eyeBlinkAnim} />

      {/* Eye shine for cuteness */}
      <AnimatedCircle cx="54" cy="52" r="3" fill="white" opacity={eyeBlinkAnim} />
      <AnimatedCircle cx="90" cy="52" r="3" fill="white" opacity={eyeBlinkAnim} />

      {/* Smile - more curved and friendly */}
      <Path
        d="M 48 75 Q 70 88 92 75"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small Body */}
      <Rect x="45" y="97" width="50" height="38" rx="18" fill="#3B82F6" />

      {/* Arms - small and cute, slightly raised like waving */}
      <G>
        {/* Left arm */}
        <Rect x="25" y="100" width="12" height="28" rx="6" fill="#60A5FA" />
        <Circle cx="31" cy="132" r="7" fill="#60A5FA" />

        {/* Right arm */}
        <Rect x="103" y="100" width="12" height="28" rx="6" fill="#60A5FA" />
        <Circle cx="109" cy="132" r="7" fill="#60A5FA" />
      </G>

      {/* Legs - small and stubby */}
      <G>
        {/* Left leg */}
        <Rect x="52" y="135" width="14" height="18" rx="7" fill="#60A5FA" />
        <Ellipse cx="59" cy="153" rx="9" ry="5" fill="#3B82F6" />

        {/* Right leg */}
        <Rect x="74" y="135" width="14" height="18" rx="7" fill="#60A5FA" />
        <Ellipse cx="81" cy="153" rx="9" ry="5" fill="#3B82F6" />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  svg: {
    alignSelf: 'center',
  },
});
