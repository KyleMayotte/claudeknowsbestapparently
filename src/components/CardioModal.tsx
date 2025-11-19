import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { typography, spacing, radius } from '../theme';
import { colors } from '../theme/colors';
import { Button } from './Button';

interface CardioModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (cardioData: {
    activityType: string;
    emoji: string;
    distance: string;
    duration: string;
    calories: string;
    notes: string;
  }) => void;
}

const CARDIO_ACTIVITIES = [
  { name: 'Running', emoji: '🏃' },
  { name: 'Cycling', emoji: '🚴' },
  { name: 'Swimming', emoji: '🏊' },
  { name: 'Rowing', emoji: '🚣' },
  { name: 'Walking', emoji: '🚶' },
  { name: 'Elliptical', emoji: '⚡' },
  { name: 'Jump Rope', emoji: '🪢' },
  { name: 'Stair Climber', emoji: '🪜' },
  { name: 'Other', emoji: '💪' },
];

const CardioModal: React.FC<CardioModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [selectedActivity, setSelectedActivity] = useState(CARDIO_ACTIVITIES[0]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSelectedActivity(CARDIO_ACTIVITIES[0]);
    setDistance('');
    setDuration('');
    setCalories('');
    setNotes('');
  };

  const handleSave = () => {
    if (!duration.trim()) {
      Alert.alert('Error', 'Please enter a duration');
      return;
    }

    onSave({
      activityType: selectedActivity.name,
      emoji: selectedActivity.emoji,
      distance,
      duration,
      calories,
      notes,
    });

    resetForm();
    onClose();
  };

  const handleCancel = () => {
    if (distance || duration || calories || notes) {
      Alert.alert(
        'Discard Cardio',
        'Are you sure you want to discard this cardio session?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Cardio</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Activity Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Activity Type</Text>
            <View style={styles.activityGrid}>
              {CARDIO_ACTIVITIES.map((activity) => (
                <TouchableOpacity
                  key={activity.name}
                  style={[
                    styles.activityChip,
                    selectedActivity.name === activity.name && styles.activityChipActive,
                  ]}
                  onPress={() => setSelectedActivity(activity)}>
                  <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                  <Text
                    style={[
                      styles.activityName,
                      selectedActivity.name === activity.name && styles.activityNameActive,
                    ]}>
                    {activity.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration (Required) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration (minutes) *</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 30"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Distance (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Distance (miles)</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="e.g., 3.5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Calories (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Calories Burned</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="e.g., 350"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
          </View>

          {/* Notes (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it feel?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Button
            title="Save Cardio Session"
            variant="primary"
            onPress={handleSave}
            fullWidth
          />
        </View>
      </View>
    </Modal>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  saveButton: {
    padding: spacing.sm,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 110,
  },
  activityChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activityNameActive: {
    color: colors.primary,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default CardioModal;
