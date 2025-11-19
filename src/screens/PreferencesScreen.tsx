// PreferencesScreen - Comprehensive workout preferences management
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../hooks/usePreferences';
import { colors, typography, spacing, radius } from '../theme';
import {
  WorkoutPreferences,
  WeightIncrement,
  UnitSystem,
} from '../types/preferences';
import { preferencesService } from '../services';
import { useAuthContext } from '../context/AuthContext';
import { exportAndShareCSV, exportAndShareJSON, getExportStats } from '../services/dataExport';

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2000],
  });

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate: rotation }] }]}>
          ▼
        </Animated.Text>
      </TouchableOpacity>
      <Animated.View style={[styles.sectionContent, { maxHeight, overflow: 'hidden' }]}>
        {children}
      </Animated.View>
    </View>
  );
};

// Preference Row Component
const PreferenceRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <View style={styles.preferenceRow}>
    <View style={styles.preferenceLabel}>
      <Text style={styles.preferenceText}>{label}</Text>
      {description && <Text style={styles.preferenceDescription}>{description}</Text>}
    </View>
    <View style={styles.preferenceControl}>{children}</View>
  </View>
);

// Segmented Control Component
const SegmentedControl: React.FC<{
  options: { value: string; label: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
}> = ({ options, selectedValue, onChange }) => (
  <View style={styles.segmentedControl}>
    {options.map((option) => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.segment,
          selectedValue === option.value && styles.segmentSelected,
        ]}
        onPress={() => onChange(option.value)}>
        <Text
          style={[
            styles.segmentText,
            selectedValue === option.value && styles.segmentTextSelected,
          ]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Number Input with +/- buttons
const NumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ value, onChange, min = 1, max = 10, step = 1 }) => (
  <View style={styles.numberInput}>
    <TouchableOpacity
      style={styles.numberButton}
      onPress={() => onChange(Math.max(min, value - step))}>
      <Text style={styles.numberButtonText}>-</Text>
    </TouchableOpacity>
    <Text style={styles.numberValue}>{value}</Text>
    <TouchableOpacity
      style={styles.numberButton}
      onPress={() => onChange(Math.min(max, value + step))}>
      <Text style={styles.numberButtonText}>+</Text>
    </TouchableOpacity>
  </View>
);

// Simple Dropdown Picker
const CustomValuePicker: React.FC<{
  value: number;
  onChange: (value: number) => void;
  presets: number[];
  suffix?: string;
  min?: number;
  max?: number;
  label: string;
}> = ({ value, onChange, presets, suffix = '' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [buttonLayout, setButtonLayout] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const buttonRef = useRef<View>(null);

  const handleSelect = (preset: number) => {
    onChange(preset);
    setShowDropdown(false);
  };

  const handleOpenDropdown = () => {
    if (buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setButtonLayout({ x: pageX, y: pageY, width, height });
        setShowDropdown(true);
      });
    }
  };

  return (
    <View style={styles.dropdownContainer}>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={handleOpenDropdown}>
          <Text style={styles.dropdownButtonText}>{value} {suffix}</Text>
          <Text style={styles.dropdownChevron}>▼</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}>
          {buttonLayout && (
            <View
              style={[
                styles.dropdownModalMenu,
                {
                  position: 'absolute',
                  top: buttonLayout.y + buttonLayout.height + 4,
                  left: buttonLayout.x,
                  width: buttonLayout.width,
                }
              ]}
              onStartShouldSetResponder={() => true}>
              <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                {presets.map((preset, index) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.dropdownItem,
                      value === preset && styles.dropdownItemSelected,
                      index === presets.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleSelect(preset)}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        value === preset && styles.dropdownItemTextSelected,
                      ]}>
                      {preset} {suffix}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Picker Component (Dropdown alternative)
const Picker: React.FC<{
  options: { value: any; label: string }[];
  selectedValue: any;
  onChange: (value: any) => void;
}> = ({ options, selectedValue, onChange }) => {
  const [showOptions, setShowOptions] = useState(false);
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || '';

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowOptions(!showOptions)}>
        <Text style={styles.pickerButtonText}>{selectedLabel}</Text>
        <Text style={styles.pickerChevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}>
          <View style={styles.modalContentWrapper} pointerEvents="box-none">
            <View style={styles.pickerOptions}>
              {options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.pickerOption,
                    option.value === selectedValue && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setShowOptions(false);
                  }}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      option.value === selectedValue && styles.pickerOptionTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// Time Picker Component for reminder time
const TimePicker: React.FC<{
  value: string; // HH:MM format
  onChange: (time: string) => void;
}> = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hours, minutes] = value.split(':').map(Number);

  // Convert 24-hour to 12-hour format for initial state
  const initialPeriod = hours >= 12 ? 'PM' : 'AM';
  const initialDisplayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  const [selectedHour, setSelectedHour] = useState(initialDisplayHour);
  const [selectedMinute, setSelectedMinute] = useState(minutes);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialPeriod);

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleConfirm = () => {
    // Convert 12-hour format to 24-hour format
    let hour24 = selectedHour;
    if (selectedPeriod === 'AM') {
      hour24 = selectedHour === 12 ? 0 : selectedHour;
    } else {
      hour24 = selectedHour === 12 ? 12 : selectedHour + 12;
    }

    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
    setShowPicker(false);
  };

  const handleCancel = () => {
    // Reset to original values
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    setSelectedHour(displayHour);
    setSelectedMinute(minutes);
    setSelectedPeriod(period as 'AM' | 'PM');
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.timePickerButton}
        onPress={() => setShowPicker(true)}>
        <Text style={styles.timePickerButtonText}>{formatTime(hours, minutes)}</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}>
        <View style={styles.timePickerModal}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Reminder Time</Text>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.timePickerWheels}>
                {/* Hour Picker (1-12) */}
                <ScrollView style={styles.timePickerWheel} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 1; // 1-12
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timePickerOption,
                          selectedHour === hour && styles.timePickerOptionSelected,
                        ]}
                        onPress={() => setSelectedHour(hour)}>
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            selectedHour === hour && styles.timePickerOptionTextSelected,
                          ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.timePickerSeparator}>:</Text>

                {/* Minute Picker */}
                <ScrollView style={styles.timePickerWheel} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 60 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.timePickerOption,
                        selectedMinute === i && styles.timePickerOptionSelected,
                      ]}
                      onPress={() => setSelectedMinute(i)}>
                      <Text
                        style={[
                          styles.timePickerOptionText,
                          selectedMinute === i && styles.timePickerOptionTextSelected,
                        ]}>
                        {i.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* AM/PM Picker */}
                <ScrollView style={styles.timePickerWheel} showsVerticalScrollIndicator={false}>
                  {['AM', 'PM'].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.timePickerOption,
                        selectedPeriod === period && styles.timePickerOptionSelected,
                      ]}
                      onPress={() => setSelectedPeriod(period as 'AM' | 'PM')}>
                      <Text
                        style={[
                          styles.timePickerOptionText,
                          selectedPeriod === period && styles.timePickerOptionTextSelected,
                        ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timePickerActions}>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerCancelButton]}
                  onPress={handleCancel}>
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerConfirmButton]}
                  onPress={handleConfirm}>
                  <Text style={styles.timePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export const PreferencesScreen: React.FC = () => {
  const {
    preferences,
    loading,
    saving,
    updatePreference,
    resetPreferences,
    exportPreferences,
  } = usePreferences();

  const { user } = useAuthContext();
  const [exportStats, setExportStats] = useState<{
    totalWorkouts: number;
    totalSets: number;
    dateRange: { earliest: string; latest: string } | null;
  } | null>(null);
  const [exportingData, setExportingData] = useState(false);

  // Load export statistics on mount
  useEffect(() => {
    if (user?.email) {
      getExportStats(user.email).then(setExportStats).catch(console.error);
    }
  }, [user?.email]);

  // Wrappers to avoid returning promises from callbacks
  const handleToggle = async (key: keyof WorkoutPreferences, value: any) => {
    try {
      // Handle workout reminders specifically
      if (key === 'enableWorkoutReminders') {
        if (value) {
          // Enable reminders with the set time, days, and custom message
          const reminderTime = preferences.reminderTime || '09:00';
          const reminderDays = preferences.reminderDays || [1, 2, 3, 4, 5];
          const customMessage = preferences.reminderMessage;
          const success = await preferencesService.enableWorkoutReminders(
            reminderTime,
            reminderDays,
            customMessage
          );

          if (!success) {
            console.warn('[PreferencesScreen] Failed to schedule workout reminder (may be emulator limitation)');
            // Still update preference - notification scheduling may fail on emulators but works on real devices
          }
        } else {
          // Disable reminders
          await preferencesService.disableWorkoutReminders();
        }
      }

      // Handle weekly check-in reminders specifically
      if (key === 'enableWeeklyCheckin') {
        if (value) {
          // Enable weekly check-in reminder with saved day/time or defaults
          const day = preferences.weeklyCheckinDay ?? 0;
          const time = preferences.weeklyCheckinTime || '20:00';
          const success = await preferencesService.enableWeeklyCheckinReminder(day, time);

          if (!success) {
            console.warn('[PreferencesScreen] Failed to schedule weekly check-in reminder (may be emulator limitation)');
            // Still update preference - notification scheduling may fail on emulators but works on real devices
          }
        } else {
          // Disable weekly check-in reminder
          await preferencesService.disableWeeklyCheckinReminder();
        }
      }

      // Update the preference (always, even if scheduling failed)
      await updatePreference(key, value);
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const handleChange = (key: keyof WorkoutPreferences) => (value: any) => {
    updatePreference(key, value as any).catch(err => console.error('Failed to update preference:', err));
  };

  const handleExportCSV = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'You must be logged in to export data');
      return;
    }

    setExportingData(true);
    try {
      await exportAndShareCSV(user.email, preferences.unitSystem);
    } catch (error: any) {
      console.error('CSV export error:', error);
      if (error.message === 'No workout data to export') {
        Alert.alert(
          'No Data',
          'You don\'t have any completed workouts to export yet. Start tracking your workouts first!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Export Failed',
          'Could not export your workout data. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setExportingData(false);
    }
  };

  const handleExportJSON = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'You must be logged in to export data');
      return;
    }

    setExportingData(true);
    try {
      await exportAndShareJSON(user.email);
    } catch (error: any) {
      console.error('JSON export error:', error);
      if (error.message === 'No workout data to export') {
        Alert.alert(
          'No Data',
          'You don\'t have any completed workouts to export yet. Start tracking your workouts first!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Export Failed',
          'Could not export your workout data. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setExportingData(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to defaults? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetPreferences();
              Alert.alert('Success', 'Preferences have been reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset preferences');
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const json = await exportPreferences();
      Alert.alert(
        'Export Preferences',
        'Your preferences have been exported. You can copy this JSON and save it for backup.',
        [{ text: 'OK' }]
      );
      console.log('Exported preferences:', json);
    } catch (error) {
      Alert.alert('Error', 'Failed to export preferences');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Workout Preferences</Text>
        <Text style={styles.headerSubtitle}>Customize your training experience</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Progressive Overload Settings */}
        <CollapsibleSection title="Progressive Overload" icon="🔄" defaultExpanded={true}>
          <PreferenceRow
            label="Enable Progressive Overload"
            description="Automatically suggest weight increases when you hit your rep target">
            <Switch
              value={preferences.enableProgressiveOverload}
              onValueChange={(value) => updatePreference('enableProgressiveOverload', value)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={preferences.enableProgressiveOverload ? colors.primary : colors.textTertiary}
            />
          </PreferenceRow>

          {preferences.enableProgressiveOverload && (
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>Progressive Overload Settings</Text>
              <Text style={styles.subSectionDescription}>
                Set your target rep range for reference, then choose when to increase weight
              </Text>

              <View style={styles.progressionSentence}>
              <Text style={styles.progressionLabel}>Target rep range:</Text>
              <TextInput
                style={styles.repsInput}
                value={String(preferences.progressiveOverloadConfig.targetRepRange.min)}
                onChangeText={(text) => {
                  if (text === '') {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      targetRepRange: {
                        ...preferences.progressiveOverloadConfig.targetRepRange,
                        min: '' as any,
                      },
                    });
                  } else {
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 1 && num <= 99) {
                      updatePreference('progressiveOverloadConfig', {
                        ...preferences.progressiveOverloadConfig,
                        targetRepRange: {
                          ...preferences.progressiveOverloadConfig.targetRepRange,
                          min: num,
                        },
                      });
                    }
                  }
                }}
                onBlur={() => {
                  const current = preferences.progressiveOverloadConfig.targetRepRange.min;
                  if (!current || current < 1) {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      targetRepRange: {
                        ...preferences.progressiveOverloadConfig.targetRepRange,
                        min: 1,
                      },
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholder="8"
              />
              <Text style={styles.progressionLabel}>-</Text>
              <TextInput
                style={styles.repsInput}
                value={String(preferences.progressiveOverloadConfig.targetRepRange.max)}
                onChangeText={(text) => {
                  if (text === '') {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      targetRepRange: {
                        ...preferences.progressiveOverloadConfig.targetRepRange,
                        max: '' as any,
                      },
                    });
                  } else {
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 1 && num <= 99) {
                      updatePreference('progressiveOverloadConfig', {
                        ...preferences.progressiveOverloadConfig,
                        targetRepRange: {
                          ...preferences.progressiveOverloadConfig.targetRepRange,
                          max: num,
                        },
                      });
                    }
                  }
                }}
                onBlur={() => {
                  const current = preferences.progressiveOverloadConfig.targetRepRange.max;
                  const min = preferences.progressiveOverloadConfig.targetRepRange.min;
                  if (!current || current < min) {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      targetRepRange: {
                        ...preferences.progressiveOverloadConfig.targetRepRange,
                        max: min + 4,
                      },
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholder="12"
              />
              <Text style={styles.progressionLabel}>reps</Text>
            </View>

            <View style={styles.progressionSentence}>
              <Text style={styles.progressionLabel}>When I hit</Text>
              <TextInput
                style={styles.repsInput}
                value={String(preferences.progressiveOverloadConfig.increaseAtReps)}
                onChangeText={(text) => {
                  if (text === '') {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      increaseAtReps: '' as any,
                    });
                  } else {
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 1 && num <= 99) {
                      updatePreference('progressiveOverloadConfig', {
                        ...preferences.progressiveOverloadConfig,
                        increaseAtReps: num,
                      });
                    }
                  }
                }}
                onBlur={() => {
                  const current = preferences.progressiveOverloadConfig.increaseAtReps;
                  if (!current || current < 1) {
                    updatePreference('progressiveOverloadConfig', {
                      ...preferences.progressiveOverloadConfig,
                      increaseAtReps: preferences.progressiveOverloadConfig.targetRepRange.max,
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholder="12"
              />
              <Text style={styles.progressionLabel}>reps</Text>
            </View>

            <View style={styles.progressionSentence}>
              <Text style={styles.progressionLabel}>Increase weight by</Text>
              <CustomValuePicker
                value={preferences.progressiveOverloadConfig.weightIncrement}
                onChange={(value) =>
                  updatePreference('progressiveOverloadConfig', {
                    ...preferences.progressiveOverloadConfig,
                    weightIncrement: value,
                  })
                }
                presets={[2.5, 5, 10, 15, 20]}
                suffix={preferences.unitSystem}
                min={0.5}
                max={50}
                label="Weight Increase"
              />
            </View>

            <Text style={styles.progressionExample}>
              Example: When you hit {preferences.progressiveOverloadConfig.increaseAtReps} reps at 185 {preferences.unitSystem}, weight increases to {185 + preferences.progressiveOverloadConfig.weightIncrement} {preferences.unitSystem}
            </Text>

            <PreferenceRow
              label="Units"
              description="Weight measurement system">
              <SegmentedControl
                options={[
                  { value: 'lbs', label: 'lbs' },
                  { value: 'kg', label: 'kg' },
                ]}
                selectedValue={preferences.unitSystem}
                onChange={handleChange('unitSystem')}
              />
            </PreferenceRow>
            </View>
          )}
        </CollapsibleSection>

        {/* Weekly Workout Goal */}
        <CollapsibleSection title="Weekly Workout Goal" icon="📅" defaultExpanded={true}>
          <PreferenceRow
            label="Weekly Training Goal"
            description="Workouts per week">
            <View style={styles.weeklyGoalCompact}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.weeklyGoalButtonCompact,
                    (preferences.weeklyWorkoutGoal || 4) === num && styles.weeklyGoalButtonCompactActive,
                  ]}
                  onPress={() => updatePreference('weeklyWorkoutGoal', num)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.weeklyGoalButtonCompactText,
                      (preferences.weeklyWorkoutGoal || 4) === num && styles.weeklyGoalButtonCompactTextActive,
                    ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </PreferenceRow>
        </CollapsibleSection>

        {/* Notifications & Reminders */}
        <CollapsibleSection title="Notifications & Reminders" icon="🔔">
          <PreferenceRow
            label="Workout Reminders"
            description="Daily workout notifications">
            <Switch
              value={preferences.enableWorkoutReminders}
              onValueChange={(value) => handleToggle('enableWorkoutReminders', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </PreferenceRow>

          {preferences.enableWorkoutReminders && (
            <>
              <View style={styles.reminderTimeSection}>
                <View style={styles.reminderTimeHeader}>
                  <View style={styles.reminderTimeLabels}>
                    <Text style={styles.reminderTimeLabel}>Reminder Time</Text>
                    <Text style={styles.reminderTimeDescription}>Time & days for notifications</Text>
                  </View>
                  <TimePicker
                    value={preferences.reminderTime || '09:00'}
                    onChange={async (time) => {
                      await updatePreference('reminderTime', time);
                      // Reschedule notification with new time and current days
                      const days = preferences.reminderDays || [1, 2, 3, 4, 5];
                      await preferencesService.updateWorkoutReminderDays(
                        days,
                        time,
                        preferences.reminderMessage
                      );
                    }}
                  />
                </View>
                <View style={styles.daySelectorCompact}>
                  {[
                    { day: 0, label: 'S' },
                    { day: 1, label: 'M' },
                    { day: 2, label: 'T' },
                    { day: 3, label: 'W' },
                    { day: 4, label: 'T' },
                    { day: 5, label: 'F' },
                    { day: 6, label: 'S' },
                  ].map(({ day, label }) => {
                    const selectedDays = preferences.reminderDays || [1, 2, 3, 4, 5];
                    const isSelected = selectedDays.includes(day);

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButtonCompact,
                          isSelected && styles.dayButtonCompactActive,
                        ]}
                        onPress={async () => {
                          let newDays: number[];
                          if (isSelected) {
                            // Remove day from selection
                            newDays = selectedDays.filter(d => d !== day);
                          } else {
                            // Add day to selection
                            newDays = [...selectedDays, day].sort();
                          }

                          // Don't allow deselecting all days
                          if (newDays.length === 0) {
                            return;
                          }

                          await updatePreference('reminderDays', newDays);
                          // Reschedule notifications with new days
                          await preferencesService.updateWorkoutReminderDays(
                            newDays,
                            preferences.reminderTime || '09:00',
                            preferences.reminderMessage
                          );
                        }}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.dayButtonCompactText,
                            isSelected && styles.dayButtonCompactTextActive,
                          ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <PreferenceRow
                label="Custom Message"
                description="Personalize your reminder">
                <TextInput
                  style={styles.messageInput}
                  value={preferences.reminderMessage || ''}
                  onChangeText={async (text) => {
                    await updatePreference('reminderMessage', text);
                    // Reschedule notification with new message and current days
                    const days = preferences.reminderDays || [1, 2, 3, 4, 5];
                    await preferencesService.updateWorkoutReminderDays(
                      days,
                      preferences.reminderTime || '09:00',
                      text
                    );
                  }}
                  placeholder="Time to grind!"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={100}
                />
              </PreferenceRow>
            </>
          )}

          <PreferenceRow
            label="Rest Timer Sound"
            description="Audio alert when rest ends">
            <Switch
              value={preferences.enableRestTimerSound}
              onValueChange={(value) => handleToggle('enableRestTimerSound', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </PreferenceRow>

          <PreferenceRow
            label="Weekly Check-in Reminder"
            description="Get reminded to review your week">
            <Switch
              value={preferences.enableWeeklyCheckin}
              onValueChange={(value) => handleToggle('enableWeeklyCheckin', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </PreferenceRow>

          {preferences.enableWeeklyCheckin && (
            <>
              <PreferenceRow
                label="Check-in Day"
                description="Day of the week">
                <Picker
                  options={[
                    { value: 0, label: 'Sunday' },
                    { value: 1, label: 'Monday' },
                    { value: 2, label: 'Tuesday' },
                    { value: 3, label: 'Wednesday' },
                    { value: 4, label: 'Thursday' },
                    { value: 5, label: 'Friday' },
                    { value: 6, label: 'Saturday' },
                  ]}
                  selectedValue={preferences.weeklyCheckinDay ?? 0}
                  onChange={async (day) => {
                    await updatePreference('weeklyCheckinDay', day);
                    // Reschedule notification with new day
                    await preferencesService.updateWeeklyCheckinReminder(
                      day,
                      preferences.weeklyCheckinTime || '20:00'
                    );
                  }}
                />
              </PreferenceRow>

              <PreferenceRow
                label="Check-in Time"
                description="Time for weekly notification">
                <TimePicker
                  value={preferences.weeklyCheckinTime || '20:00'}
                  onChange={async (time) => {
                    await updatePreference('weeklyCheckinTime', time);
                    // Reschedule notification with new time
                    await preferencesService.updateWeeklyCheckinReminder(
                      preferences.weeklyCheckinDay ?? 0,
                      time
                    );
                  }}
                />
              </PreferenceRow>
            </>
          )}
        </CollapsibleSection>

        {/* Data Export Section */}
        <CollapsibleSection title="Data & Privacy" icon="📊">
          <View style={styles.exportSection}>
            <Text style={styles.exportTitle}>Export Workout Data</Text>
            <Text style={styles.exportDescription}>
              Download your complete workout history. Your data belongs to you.
            </Text>

            {exportStats && exportStats.totalWorkouts > 0 ? (
              <View style={styles.exportStats}>
                <View style={styles.exportStatRow}>
                  <Text style={styles.exportStatLabel}>Total Workouts:</Text>
                  <Text style={styles.exportStatValue}>{exportStats.totalWorkouts}</Text>
                </View>
                <View style={styles.exportStatRow}>
                  <Text style={styles.exportStatLabel}>Total Sets:</Text>
                  <Text style={styles.exportStatValue}>{exportStats.totalSets}</Text>
                </View>
                {exportStats.dateRange && (
                  <View style={styles.exportStatRow}>
                    <Text style={styles.exportStatLabel}>Date Range:</Text>
                    <Text style={styles.exportStatValue}>
                      {exportStats.dateRange.earliest} - {exportStats.dateRange.latest}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.exportStatsEmpty}>
                <Text style={styles.exportStatsEmptyText}>
                  No workout data yet. Complete your first workout to enable export.
                </Text>
              </View>
            )}

            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={[styles.exportButton, exportingData && styles.exportButtonDisabled]}
                onPress={handleExportCSV}
                disabled={exportingData || !exportStats || exportStats.totalWorkouts === 0}>
                {exportingData ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.exportButtonIcon}>📄</Text>
                    <View style={styles.exportButtonTextContainer}>
                      <Text style={styles.exportButtonTitle}>Export CSV</Text>
                      <Text style={styles.exportButtonSubtitle}>
                        For Excel, Google Sheets
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportButton, exportingData && styles.exportButtonDisabled]}
                onPress={handleExportJSON}
                disabled={exportingData || !exportStats || exportStats.totalWorkouts === 0}>
                {exportingData ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.exportButtonIcon}>💾</Text>
                    <View style={styles.exportButtonTextContainer}>
                      <Text style={styles.exportButtonTitle}>Export JSON</Text>
                      <Text style={styles.exportButtonSubtitle}>
                        Full backup (raw data)
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.exportNote}>
              💡 Exported files can be imported into other fitness apps or saved as backup.
            </Text>
          </View>
        </CollapsibleSection>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.surface} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  chevron: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
  sectionContent: {
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  preferenceLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  preferenceDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  preferenceControl: {
    flexShrink: 0,
  },
  subSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  subSectionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 2,
  },
  segment: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: colors.textInverse,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 2,
  },
  numberButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  numberButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  numberValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  pickerContainer: {
    // Container for the button only
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    minWidth: 120,
  },
  pickerButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  pickerChevron: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginLeft: spacing.xs,
  },
  pickerOptions: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '15',
  },
  pickerOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionButton: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  resetButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  savingIndicator: {
    position: 'absolute',
    bottom: spacing.xl,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  savingText: {
    ...typography.caption,
    color: colors.surface,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  // Weekly Goal Styles - Compact Version
  weeklyGoalCompact: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  weeklyGoalButtonCompact: {
    width: 36,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyGoalButtonCompactActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weeklyGoalButtonCompactText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  weeklyGoalButtonCompactTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  reminderTimeSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reminderTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reminderTimeLabels: {
    flex: 1,
  },
  reminderTimeLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderTimeDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  daySelectorCompact: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  dayButtonCompact: {
    width: 34,
    height: 34,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonCompactActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonCompactText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  dayButtonCompactTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  // Modal Styles (used by both Picker and CustomValuePicker)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  // Progressive Overload Custom Picker Styles
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  progressionSentence: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexWrap: 'wrap',
  },
  progressionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  progressionExample: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  repsInput: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    minWidth: 50,
    textAlign: 'center',
    marginRight: spacing.xs,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  customPickerContainer: {
    // Container for the button only
  },
  // Simple Dropdown Styles
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  dropdownButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  dropdownChevron: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownModalMenu: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: 150,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  customPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FF0000',
    padding: spacing.md,
  },
  customPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customPickerContent: {
    padding: spacing.md,
  },
  customPickerTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  customPickerClose: {
    ...typography.h4,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  customPickerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  customPickerPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  presetButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  presetButtonTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  customInputRow: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  customInputButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  customInputButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  // Absolute positioned overlay (replaces Modal)
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  absoluteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  absoluteModalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  // New Picker Modal Styles (Clean Rebuild)
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '85%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerModalTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pickerModalClose: {
    ...typography.h4,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  pickerModalSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerModalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  pickerPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickerPresetBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerPresetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerPresetText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pickerPresetTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  pickerCustomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerCustomInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  pickerCustomApply: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  pickerCustomApplyText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '700',
  },
  // Time Picker Styles
  timePickerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  timePickerButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  timePickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timePickerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  timePickerContent: {
    padding: spacing.lg,
  },
  timePickerWheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  timePickerWheel: {
    width: 80,
    maxHeight: 200,
  },
  timePickerSeparator: {
    ...typography.h2,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    fontWeight: '700',
  },
  timePickerOption: {
    padding: spacing.md,
    alignItems: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
  },
  timePickerOptionText: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  timePickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  timePickerCancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePickerConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  timePickerCancelText: {
    ...typography.button,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timePickerConfirmText: {
    ...typography.button,
    color: colors.textInverse,
    textAlign: 'center',
  },
  // Message Input Styles
  messageInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 150,
    maxWidth: 250,
  },
  // Export Section Styles
  exportSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exportTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  exportDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  exportStats: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exportStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  exportStatLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  exportStatValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  exportStatsEmpty: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exportStatsEmptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exportButtons: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  exportButtonTextContainer: {
    flex: 1,
  },
  exportButtonTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportButtonSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exportNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PreferencesScreen;
