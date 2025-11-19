import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../theme';
import { getAtlasResponse, ChatMessage } from '../services/openai';
import { getTodayDate } from '../utils/date';
import { getWorkoutSession } from '../services/workoutSession';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AtlasChatScreenProps {
  onBack: () => void;
  userEmail: string;
}

const AtlasChatScreen: React.FC<AtlasChatScreenProps> = ({ onBack, userEmail }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey! I'm Atlas, your AI workout coach. Ask me anything about your workouts, progress, or training advice!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load initial greeting with context when screen opens
  useEffect(() => {
    const loadInitialContext = async () => {
      try {
        const storageKey = `@muscleup/workout_history_${userEmail}`;
        const workoutHistoryStr = await AsyncStorage.getItem(storageKey);
        const workoutHistory = workoutHistoryStr ? JSON.parse(workoutHistoryStr) : [];

        if (workoutHistory.length > 0) {
          const lastWorkout = workoutHistory[0];
          const contextGreeting = `Hey! I'm Atlas, your AI workout coach. I see you recently completed ${lastWorkout.templateName} (${lastWorkout.duration} min). Great work! Ask me anything about your workouts, progress, or training advice! 💪`;

          setMessages([{
            id: '1',
            text: contextGreeting,
            isUser: false,
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        console.error('Error loading initial context:', error);
      }
    };

    loadInitialContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userQuestion = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
      }));

      // Load user data for context
      const storageKey = `@muscleup/workout_history_${userEmail}`;
      const workoutHistoryStr = await AsyncStorage.getItem(storageKey);

      const workoutHistory = workoutHistoryStr ? JSON.parse(workoutHistoryStr) : [];

      const recentWorkouts = workoutHistory.slice(0, 5);

      // Get active workout session if available
      const sessionContext = await getWorkoutSession();

      const userContext = {
        recentWorkouts,
        weeklyStats: { workouts: recentWorkouts.length, totalVolume: 0 },
        activeWorkout: sessionContext.isActive ? sessionContext.session : null,
      };

      // Get AI response with user context
      const atlasResponseText = await getAtlasResponse(userQuestion, conversationHistory, userContext);

      const atlasResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: atlasResponseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, atlasResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Try again! 🤔",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🤖</Text>
            <View>
              <Text style={styles.headerTitle}>Atlas</Text>
              <Text style={styles.headerSubtitle}>AI Workout Coach</Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}>
          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.atlasBubble,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userText : styles.atlasText,
                ]}>
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.isUser ? styles.userTime : styles.atlasTime,
                ]}>
                {message.timestamp.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageBubble, styles.atlasBubble]}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Atlas anything..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: colors.primary,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerRight: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  atlasBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  userText: {
    color: colors.textInverse,
  },
  atlasText: {
    color: colors.textPrimary,
  },
  messageTime: {
    ...typography.caption,
    fontSize: 11,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  atlasTime: {
    color: colors.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});

export default AtlasChatScreen;
