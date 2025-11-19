import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Easing,
  GestureResponderEvent,
  Linking,
  Platform,
} from 'react-native';
import { voiceLogger, VoiceLoggerResult } from '../services/voiceLogger';
import { VoicePermissionModal } from './VoicePermissionModal';
import { colors } from '../theme';
import { Icon } from './Icon';

interface VoiceMicButtonProps {
  onResult: (result: VoiceLoggerResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onResult,
  onError,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionError, setPermissionError] = useState<string>('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Request permissions
  const handleRequestPermission = async () => {
    try {
      const granted = await voiceLogger.requestPermission();
      if (granted) {
        setShowPermissionModal(false);
        setPermissionError('');
      } else {
        setPermissionError('Microphone permission denied');
        // Open app settings
        if (Platform.OS === 'android') {
          Linking.openSettings();
        }
      }
    } catch (error: any) {
      setPermissionError(error.message || 'Failed to request permission');
    }
  };

  // Start recording on press in
  const handlePressIn = async (e: GestureResponderEvent) => {
    if (disabled) return;

    // Check permission first
    const hasPermission = await voiceLogger.requestPermission();
    if (!hasPermission) {
      setPermissionError('');
      setShowPermissionModal(true);
      return;
    }

    setIsRecording(true);
    setTranscript('Listening...');

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Scale down button
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();

    // Start voice recording
    try {
      await voiceLogger.startListening(
        (result: VoiceLoggerResult) => {
          setTranscript(result.transcript);
          setTimeout(() => {
            setTranscript('');
            onResult(result);
          }, 1000);
        },
        (error: string) => {
          console.error('Voice error:', error);

          // Handle specific error types
          if (error.toLowerCase().includes('permission')) {
            setPermissionError(error);
            setShowPermissionModal(true);
            setTranscript('');
          } else if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
            setTranscript('No internet connection');
            setTimeout(() => setTranscript(''), 2500);
          } else {
            setTranscript('Could not understand');
            setTimeout(() => setTranscript(''), 2000);
          }

          onError?.(error);
        }
      );
    } catch (error: any) {
      console.error('Voice logger error:', error);
      setTranscript('Failed to start');
      setTimeout(() => setTranscript(''), 2000);
      onError?.(error.message);
      setIsRecording(false);
    }
  };

  // Stop recording on press out
  const handlePressOut = async () => {
    if (disabled || !isRecording) return;

    setIsRecording(false);

    // Stop pulse animation
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Scale back button
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Stop voice recording
    try {
      await voiceLogger.stopListening();
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Transcript preview */}
        {transcript !== '' && (
          <View style={styles.transcriptBubble}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        {/* Mic button */}
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={styles.buttonWrapper}
        >
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: isRecording ? 0.3 : 0,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.button,
              disabled && styles.buttonDisabled,
              isRecording && styles.buttonRecording,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Icon name="microphone" size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>

        {/* Instruction text */}
        <Text style={styles.instructionText}>
          {isRecording ? 'Release to log' : 'Hold to speak'}
        </Text>
      </View>

      {/* Permission modal */}
      <VoicePermissionModal
        visible={showPermissionModal}
        onRequestPermission={handleRequestPermission}
        onDismiss={() => setShowPermissionModal(false)}
        error={permissionError}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
  },
  buttonWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: '#e74c3c',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.5,
  },
  transcriptBubble: {
    position: 'absolute',
    bottom: 80,
    right: 0,
    backgroundColor: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  transcriptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
