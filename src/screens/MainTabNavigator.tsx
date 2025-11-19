import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme';
import { Icon } from '../components/Icon';

// Import screens
import HomeDashboard from './HomeDashboard';
import WorkoutScreen from './WorkoutScreen';
import FriendFeedScreen from './FriendFeedScreen';
import PreferencesScreen from './PreferencesScreen';
import ViewProgressScreen from './ViewProgressScreen';
import ProfileScreen from './ProfileScreen';
import ProgramGeneratorScreen from './ProgramGeneratorScreen';
import WeeklyCheckinScreen from './WeeklyCheckinScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Navigator with only visible tabs
const TabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeDashboard}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={26} color={color} strokeWidth={2.5} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // Navigate to Home tab (this ensures it always goes to dashboard)
            navigation.navigate('Home');
          },
        })}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="dumbbell" size={26} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FriendFeedScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="users" size={26} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="settings" size={26} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ViewProgressScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="chart" size={26} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator with Stack for Profile and Program Generator
const MainTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="ProgramGenerator"
        component={ProgramGeneratorScreen}
        options={{
          headerShown: true,
          title: 'AI Program Generator',
          headerBackTitle: 'Back'
        }}
      />
      <Stack.Screen
        name="WeeklyCheckin"
        component={WeeklyCheckinScreen}
        options={{
          headerShown: true,
          title: 'Weekly Check-in',
          headerBackTitle: 'Back'
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    paddingHorizontal: 0,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MainTabNavigator;
