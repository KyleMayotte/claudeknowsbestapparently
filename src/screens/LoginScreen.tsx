import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Input, Button } from '../components';
import { typography, spacing } from '../theme';

interface LoginScreenProps {
  onNavigateToSignup?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignup }) => {
  const { theme, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthContext();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Navigation will be handled automatically by auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    subtitle: {
      ...styles.subtitle,
      color: colors.textSecondary,
    },
    linkText: {
      ...styles.linkText,
      color: colors.textSecondary,
    },
    linkTextBold: {
      ...styles.linkTextBold,
      color: colors.primary,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <Text style={styles.title}>MuscleUp</Text>
          <Text style={dynamicStyles.subtitle}>Welcome Back!</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            <Button
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.loginButton}
            />

            {onNavigateToSignup && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={onNavigateToSignup}
                disabled={isLoading}>
                <Text style={dynamicStyles.linkText}>
                  Don't have an account? <Text style={dynamicStyles.linkTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.displayLarge,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  linkButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  linkText: {
    ...typography.body,
  },
  linkTextBold: {
    ...typography.body,
    fontWeight: '600',
  },
});

export default LoginScreen;
