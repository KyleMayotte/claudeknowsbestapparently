import React, { useState, useEffect } from 'react';
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

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  onSaveCategories: (newCategories: string[], oldCategories?: string[]) => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  visible,
  onClose,
  categories,
  onSaveCategories,
}) => {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Auto-refresh when categories prop changes (e.g., from saveWorkoutTemplate)
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (localCategories.includes(newCategoryName.trim())) {
      Alert.alert('Error', 'This category already exists');
      return;
    }

    setLocalCategories([...localCategories, newCategoryName.trim()]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (category: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category}"? Workouts in this category will not be deleted, but will have no category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLocalCategories(localCategories.filter(c => c !== category));
          },
        },
      ]
    );
  };

  const handleEditCategory = (index: number) => {
    setEditingIndex(index);
    setEditingValue(localCategories[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    if (!editingValue.trim()) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }

    // Check if new name already exists (excluding current category)
    const trimmedValue = editingValue.trim();
    if (localCategories.some((cat, idx) => idx !== editingIndex && cat === trimmedValue)) {
      Alert.alert('Error', 'This category name already exists');
      return;
    }

    const updatedCategories = [...localCategories];
    updatedCategories[editingIndex] = trimmedValue;
    setLocalCategories(updatedCategories);
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleSave = () => {
    onSaveCategories(localCategories, categories);
    onClose();
  };

  const handleCancel = () => {
    setLocalCategories(categories);
    setNewCategoryName('');
    onClose();
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
          <Text style={styles.headerTitle}>Manage Categories</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Add New Category Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add New Category</Text>
            <View style={styles.addCategoryRow}>
              <TextInput
                style={styles.input}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g., Push Pull Legs, 5 Day Split"
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleAddCategory}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCategory}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories List */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Categories ({localCategories.length})
            </Text>
            {localCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No categories yet. Add your first category above.
                </Text>
              </View>
            ) : (
              localCategories.map((category, index) => (
                <View key={index} style={styles.categoryItem}>
                  {editingIndex === index ? (
                    <>
                      <TextInput
                        style={styles.editInput}
                        value={editingValue}
                        onChangeText={setEditingValue}
                        autoFocus
                        onSubmitEditing={handleSaveEdit}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        onPress={handleSaveEdit}
                        style={styles.saveEditButton}>
                        <Text style={styles.saveEditButtonText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={styles.cancelEditButton}>
                        <Text style={styles.cancelEditButtonText}>×</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.categoryNameContainer}
                        onPress={() => handleEditCategory(index)}>
                        <Text style={styles.categoryName}>{category}</Text>
                        <Text style={styles.editHint}>Tap to edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCategory(category)}
                        style={styles.deleteButton}>
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <Button
            title="Save Categories"
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
  addCategoryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryNameContainer: {
    flex: 1,
  },
  categoryName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editHint: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  editInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  saveEditButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  saveEditButtonText: {
    fontSize: 24,
    color: colors.secondary,
    fontWeight: '600',
  },
  cancelEditButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  cancelEditButtonText: {
    fontSize: 28,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
  deleteButtonText: {
    fontSize: 32,
    color: colors.error,
    fontWeight: '300',
  },
  emptyState: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomAction: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default ManageCategoriesModal;
