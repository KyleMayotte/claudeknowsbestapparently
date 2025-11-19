import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { calculatePlateLoadout } from '../services/plateCalculator';

interface PlateCalculatorModalProps {
  visible: boolean;
  currentWeight: string;
  unitSystem: 'lbs' | 'kg';
  onApply: (weight: string) => void;
  onClose: () => void;
}

// Plate colors based on standard olympic weightlifting colors
const PLATE_COLORS: Record<number, string> = {
  45: '#E74C3C',   // Red
  35: '#F39C12',   // Yellow
  25: '#3498DB',   // Blue
  20: '#3498DB',   // Blue (kg)
  15: '#F39C12',   // Yellow (kg)
  10: '#2ECC71',   // Green
  5: '#ECF0F1',    // White/Light gray
  2.5: '#E74C3C',  // Red (small)
  1.25: '#ECF0F1', // White (kg small)
};

const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  currentWeight,
  unitSystem,
  onApply,
  onClose,
}) => {
  const [weight, setWeight] = useState(currentWeight || '45');
  const numericWeight = parseFloat(weight) || 45;

  useEffect(() => {
    if (currentWeight) {
      setWeight(currentWeight);
    }
  }, [currentWeight, visible]);

  const loadout = calculatePlateLoadout(numericWeight, unitSystem);

  const handleApply = () => {
    onApply(weight);
    onClose();
  };

  const handleQuickAdjust = (plateWeight: number) => {
    // Double the amount since plates go on both sides
    // +2.5 button = add 2.5 per side = 5 lbs total
    const totalAmount = plateWeight * 2;
    const barWeight = unitSystem === 'kg' ? 20 : 45;
    const newWeight = Math.max(barWeight, numericWeight + totalAmount);
    setWeight(newWeight.toString());
  };

  // Render individual plates on one side
  const renderPlates = () => {
    if (loadout.plates.length === 0) {
      return null;
    }

    const plates: JSX.Element[] = [];
    loadout.plates.forEach((plate, plateIndex) => {
      for (let i = 0; i < plate.count; i++) {
        const plateColor = PLATE_COLORS[plate.weight] || colors.primary;
        // Calculate plate height - larger weights are taller
        const plateHeight = 40 + (plate.weight / 5) * 3;
        const plateWidth = Math.max(8, plate.weight / 3);

        plates.push(
          <View
            key={`${plateIndex}-${i}`}
            style={[
              styles.plate,
              {
                backgroundColor: plateColor,
                height: plateHeight,
                width: plateWidth,
              },
            ]}>
            <Text style={styles.plateText}>{plate.weight}</Text>
          </View>
        );
      }
    });

    return plates;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Plate Calculator</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Weight Display */}
            <Text style={styles.weightDisplay}>
              {numericWeight} {unitSystem}
            </Text>

            {/* Quick Adjust Buttons - Two Rows */}
            <View style={styles.quickAdjustContainer}>
              {/* Negative Row */}
              <View style={styles.quickAdjustRow}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(-45)}>
                  <Text style={styles.adjustButtonText}>-45</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(-10)}>
                  <Text style={styles.adjustButtonText}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(-5)}>
                  <Text style={styles.adjustButtonText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(-2.5)}>
                  <Text style={styles.adjustButtonText}>-2.5</Text>
                </TouchableOpacity>
              </View>

              {/* Positive Row */}
              <View style={styles.quickAdjustRow}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(45)}>
                  <Text style={styles.adjustButtonText}>+45</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(10)}>
                  <Text style={styles.adjustButtonText}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(5)}>
                  <Text style={styles.adjustButtonText}>+5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleQuickAdjust(2.5)}>
                  <Text style={styles.adjustButtonText}>+2.5</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Visual Barbell */}
            <View style={styles.barbellContainer}>
              {/* Left Collar */}
              <View style={styles.collar} />

              {/* Left Plates */}
              <View style={styles.platesContainer}>
                {renderPlates()}
              </View>

              {/* Barbell Center */}
              <View style={styles.barbellCenter}>
                <Text style={styles.barbellText}>
                  {unitSystem === 'kg' ? '20kg' : '45lbs'}
                </Text>
              </View>

              {/* Right Plates (mirrored) */}
              <View style={styles.platesContainer}>
                {renderPlates()}
              </View>

              {/* Right Collar */}
              <View style={styles.collar} />
            </View>

            {/* Warning if weight can't be loaded exactly */}
            {loadout.total !== numericWeight && (
              <Text style={styles.warningText}>
                ⚠️ Closest loadable: {loadout.total} {unitSystem}
              </Text>
            )}

            {/* Bar only message */}
            {loadout.plates.length === 0 && (
              <Text style={styles.barOnlyText}>
                Bar only ({unitSystem === 'kg' ? '20' : '45'} {unitSystem})
              </Text>
            )}
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Weight</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    zIndex: 10000,
    elevation: 10000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  weightDisplay: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  quickAdjustContainer: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  adjustButton: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
    fontSize: 11,
  },
  barbellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    minHeight: 120,
  },
  collar: {
    width: 6,
    height: 50,
    backgroundColor: '#95A5A6',
    borderRadius: 2,
  },
  platesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  plate: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  plateText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  barbellCenter: {
    backgroundColor: '#7F8C8D',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  barbellText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
  },
  barOnlyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  applyButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
    fontSize: 16,
  },
});

export default PlateCalculatorModal;
