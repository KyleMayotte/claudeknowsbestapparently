import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme';
import { Button } from './Button';
import type { CardioType } from '../types';

interface AddCardioModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (type: CardioType, duration: number, distance?: number, notes?: string) => void;
}

const CARDIO_OPTIONS: Array<{ type: CardioType; label: string; emoji: string }> = [
  { type: 'walk', label: 'Walk', emoji: '🚶' },
  { type: 'run', label: 'Run', emoji: '🏃' },
  { type: 'bike', label: 'Bike', emoji: '🚴' },
  { type: 'swim', label: 'Swim', emoji: '🏊' },
  { type: 'other', label: 'Other', emoji: '💪' },
];

const AddCardioModal: React.FC<AddCardioModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState<CardioType>('walk');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!duration || parseInt(duration) <= 0) {
      return;
    }

    const durationNum = parseInt(duration);
    const distanceNum = distance ? parseFloat(distance) : undefined;

    onSave(selectedType, durationNum, distanceNum, notes.trim() || undefined);

    // Reset form
    setSelectedType('walk');
    setDuration('');
    setDistance('');
    setNotes('');
  };

  const handleClose = () => {
    setSelectedType('walk');
    setDuration('');
    setDistance('');
    setNotes('');
    onClose();
  };

  const isValid = duration && parseInt(duration) > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Cardio Activity</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}>

            {/* Activity Type Selector */}
            <Text style={styles.sectionLabel}>Activity Type</Text>
            <View style={styles.cardioTypeGrid}>
              {CARDIO_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.cardioTypeButton,
                    selectedType === option.type && styles.cardioTypeButtonActive,
                  ]}
                  onPress={() => setSelectedType(option.type)}>
                  <Text style={styles.cardioTypeEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.cardioTypeLabel,
                      selectedType === option.type && styles.cardioTypeLabelActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration Input */}
            <Text style={styles.sectionLabel}>Duration (minutes) *</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />

            {/* Distance Input (Optional) */}
            <Text style={styles.sectionLabel}>Distance (miles/km) - Optional</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="3.5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />

            {/* Notes Input (Optional) */}
            <Text style={styles.sectionLabel}>Notes - Optional</Text>
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
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleClose}
              style={styles.actionButton}
            />
            <Button
              title="Save Activity"
              variant="primary"
              onPress={handleSave}
              disabled={!isValid}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  cardioTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardioTypeButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  cardioTypeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  cardioTypeEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  cardioTypeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardioTypeLabelActive: {
    color: colors.primary,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});

export default AddCardioModal;
