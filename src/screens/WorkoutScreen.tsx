import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Vibration,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { Button, Card, AddWorkoutModal, AddExerciseModal, IncompleteSetModal, ConfirmDialog, WorkoutCompletionModal, ManageCategoriesModal, AtlasCoachingBanner, PlateCalculatorModal, SimpleWorkoutDetailModal, VoiceMicButton, Icon } from '../components';
import AtlasChatScreen from './AtlasChatScreen';
import { colors, typography, spacing, radius, shadows } from '../theme';
import { checkForNewPR, savePR } from '../utils/prTracking';
import type { PRCelebration as PRCelebrationType } from '../types/pr';
import { shareWorkout, getMyInviteCode } from '../utils/friendSystem';
import { useAuthContext } from '../context/AuthContext';
import { showErrorAlert } from '../utils/errorHandler';
import { getDefaultRestTime, formatTime } from '../utils/restTimer';
import { displayRestTimerNotification, displayAtlasCoachingNotification, setupRestTimerNotificationHandlers } from '../services/notifications';
import { usePreferences } from '../hooks/usePreferences';
import { saveWorkoutSession, recordCompletedSet, updateCurrentExercise, clearWorkoutSession, getWorkoutSession, saveAtlasTip, dismissAtlasTip } from '../services/workoutSession';
import { buildCoachingContext, getExerciseHistory } from '../services/coachingContext';
import { generateFormCoaching } from '../services/openai';
import { generateWorkoutComparison } from '../utils/workoutComparison';
import { cloudSyncService } from '../services/cloudSync';
import { atlasVoice, VoiceLoggerResult } from '../services';
import { workoutNotification } from '../services/workoutNotification';

interface WorkoutScreenProps {
  onBack?: () => void;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Set {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
  notes?: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  emoji: string;
  category?: string; // e.g., "Push Pull Legs", "5 Day Split", "10 Week Program"
  exercises: Exercise[];
  isActive?: boolean;
}

interface WorkoutHistory {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  date: string;
  duration: number;
  exercises: Exercise[];
}

const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ onBack }) => {
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const { preferences, loadPreferences } = usePreferences();

  // Workout completion state
  const [workoutPRs, setWorkoutPRs] = useState<PRCelebrationType[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    workoutName: string;
    emoji: string;
    duration: number;
    comparisonMessage?: string;
    totalSets: number;
    totalVolume: number;
  } | null>(null);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentCompletedWorkout, setCurrentCompletedWorkout] = useState<WorkoutHistory | null>(null);
  const [showUpdateTemplateModal, setShowUpdateTemplateModal] = useState(false);
  const [templateChanges, setTemplateChanges] = useState<string[]>([]);
  const [originalTemplate, setOriginalTemplate] = useState<WorkoutTemplate | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSetSelectModal, setShowSetSelectModal] = useState(false);
  const [currentNoteSetId, setCurrentNoteSetId] = useState<{ exerciseId: string; setId: string } | null>(null);
  const [currentNoteExerciseId, setCurrentNoteExerciseId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isViewingPreviousNote, setIsViewingPreviousNote] = useState(false);

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([
    {
      id: '1',
      name: 'Push',
      emoji: '🔥',
      exercises: [
        {
          id: '1-1',
          name: 'Bench Press',
          sets: [
            { id: '1-1-1', reps: '', weight: '', completed: false },
            { id: '1-1-2', reps: '', weight: '', completed: false },
            { id: '1-1-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '1-2',
          name: 'Overhead Press',
          sets: [
            { id: '1-2-1', reps: '', weight: '', completed: false },
            { id: '1-2-2', reps: '', weight: '', completed: false },
            { id: '1-2-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '1-3',
          name: 'Incline Dumbbell Press',
          sets: [
            { id: '1-3-1', reps: '', weight: '', completed: false },
            { id: '1-3-2', reps: '', weight: '', completed: false },
            { id: '1-3-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '1-4',
          name: 'Tricep Extensions',
          sets: [
            { id: '1-4-1', reps: '', weight: '', completed: false },
            { id: '1-4-2', reps: '', weight: '', completed: false },
            { id: '1-4-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '1-5',
          name: 'Weighted Dips',
          sets: [
            { id: '1-5-1', reps: '', weight: '', completed: false },
            { id: '1-5-2', reps: '', weight: '', completed: false },
            { id: '1-5-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '1-6',
          name: 'Lateral Raises',
          sets: [
            { id: '1-6-1', reps: '', weight: '', completed: false },
            { id: '1-6-2', reps: '', weight: '', completed: false },
            { id: '1-6-3', reps: '', weight: '', completed: false },
          ],
        },
      ],
    },
    {
      id: '2',
      name: 'Pull',
      emoji: '💪',
      exercises: [
        {
          id: '2-1',
          name: 'Weighted Pull-ups',
          sets: [
            { id: '2-1-1', reps: '', weight: '', completed: false },
            { id: '2-1-2', reps: '', weight: '', completed: false },
            { id: '2-1-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '2-2',
          name: 'Barbell Rows',
          sets: [
            { id: '2-2-1', reps: '', weight: '', completed: false },
            { id: '2-2-2', reps: '', weight: '', completed: false },
            { id: '2-2-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '2-3',
          name: 'Low Row Machine',
          sets: [
            { id: '2-3-1', reps: '', weight: '', completed: false },
            { id: '2-3-2', reps: '', weight: '', completed: false },
            { id: '2-3-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '2-4',
          name: 'Face Pulls',
          sets: [
            { id: '2-4-1', reps: '', weight: '', completed: false },
            { id: '2-4-2', reps: '', weight: '', completed: false },
            { id: '2-4-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '2-5',
          name: 'Hammer Curls',
          sets: [
            { id: '2-5-1', reps: '', weight: '', completed: false },
            { id: '2-5-2', reps: '', weight: '', completed: false },
            { id: '2-5-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '2-6',
          name: 'Preacher Curls',
          sets: [
            { id: '2-6-1', reps: '', weight: '', completed: false },
            { id: '2-6-2', reps: '', weight: '', completed: false },
            { id: '2-6-3', reps: '', weight: '', completed: false },
          ],
        },
      ],
    },
    {
      id: '3',
      name: 'Legs',
      emoji: '🦵',
      exercises: [
        {
          id: '3-1',
          name: 'Squats',
          sets: [
            { id: '3-1-1', reps: '', weight: '', completed: false },
            { id: '3-1-2', reps: '', weight: '', completed: false },
            { id: '3-1-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '3-2',
          name: 'Romanian Deadlift',
          sets: [
            { id: '3-2-1', reps: '', weight: '', completed: false },
            { id: '3-2-2', reps: '', weight: '', completed: false },
            { id: '3-2-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '3-3',
          name: 'Leg Extensions',
          sets: [
            { id: '3-3-1', reps: '', weight: '', completed: false },
            { id: '3-3-2', reps: '', weight: '', completed: false },
            { id: '3-3-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '3-4',
          name: 'Leg Curls',
          sets: [
            { id: '3-4-1', reps: '', weight: '', completed: false },
            { id: '3-4-2', reps: '', weight: '', completed: false },
            { id: '3-4-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '3-5',
          name: 'Hip Abductor Machine',
          sets: [
            { id: '3-5-1', reps: '', weight: '', completed: false },
            { id: '3-5-2', reps: '', weight: '', completed: false },
            { id: '3-5-3', reps: '', weight: '', completed: false },
          ],
        },
        {
          id: '3-6',
          name: 'Calf Raises Seated',
          sets: [
            { id: '3-6-1', reps: '', weight: '', completed: false },
            { id: '3-6-2', reps: '', weight: '', completed: false },
            { id: '3-6-3', reps: '', weight: '', completed: false },
          ],
        },
      ],
    },
  ]);

  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistory | null>(null);
  const [incompleteSetModalVisible, setIncompleteSetModalVisible] = useState(false);
  const [incompleteSetsCount, setIncompleteSetsCount] = useState(0);
  const [cancelWorkoutDialogVisible, setCancelWorkoutDialogVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Undo toast state for set deletion
  const [undoToast, setUndoToast] = useState<{
    visible: boolean;
    exerciseId: string;
    set: Set;
    setIndex: number;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rest timer state
  const [restTimer, setRestTimer] = useState<{
    exerciseId: string;
    exerciseName: string;
    secondsRemaining: number;
    totalSeconds: number;
  } | null>(null);
  const restTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isManageCategoriesVisible, setIsManageCategoriesVisible] = useState(false);
  const [isAddExerciseModalVisible, setIsAddExerciseModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

  // Rest timer state
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(120); // 2:00 minutes default
  const [restTimerDuration, setRestTimerDuration] = useState(120); // Adjustable duration
  const [showRestCompleteToast, setShowRestCompleteToast] = useState(false);
  const [currentRestExerciseName, setCurrentRestExerciseName] = useState<string>('');
  const [restTimerEnabled, setRestTimerEnabled] = useState(true); // User preference for auto-start
  const [customDefaultRestTime, setCustomDefaultRestTime] = useState(120); // User's custom default (2:00)
  const [showSetDefaultModal, setShowSetDefaultModal] = useState(false);
  const [tempDefaultTime, setTempDefaultTime] = useState('120');
  const [restTimerRestartKey, setRestTimerRestartKey] = useState(0); // Counter to force timer restarts
  const [activeMenuTemplate, setActiveMenuTemplate] = useState<string | null>(null);

  // Atlas coaching banner state
  const [atlasTipMessage, setAtlasTipMessage] = useState<string | null>(null);
  const [showAtlasBanner, setShowAtlasBanner] = useState(false);
  const [showAtlasModal, setShowAtlasModal] = useState(false);

  // Plate calculator state
  const [plateCalculatorVisible, setPlateCalculatorVisible] = useState(false);
  const [plateCalculatorSet, setPlateCalculatorSet] = useState<{exerciseId: string; setId: string; currentWeight: string} | null>(null);

  // User-specific storage keys
  const userEmail = user?.email || 'guest';
  const HISTORY_STORAGE_KEY = `@muscleup/workout_history_${userEmail}`;
  const TEMPLATES_STORAGE_KEY = `@muscleup/workout_templates_${userEmail}`;
  const CATEGORIES_STORAGE_KEY = `@muscleup/categories_${userEmail}`;
  const REST_TIMER_PREF_KEY = `@muscleup/rest_timer_enabled_${userEmail}`;
  const CUSTOM_REST_TIME_KEY = `@muscleup/custom_default_rest_time_${userEmail}`;

  // Refs for managing input focus
  const inputRefs = useRef<{[key: string]: TextInput | null}>({});

  // Load workout history, templates, and categories on mount
  useEffect(() => {
    loadWorkoutHistory();
    loadTemplates();
    loadCategories();
    loadRestTimerPreference();
    loadCustomDefaultRestTime();
  }, []);

  // Reload templates and preferences when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 WorkoutScreen focused - reloading templates and preferences');
      const reloadData = async () => {
        try {
          // Reload templates
          const storedTemplates = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
          if (storedTemplates) {
            const parsedTemplates = JSON.parse(storedTemplates);
            setTemplates(parsedTemplates);
          }

          // Reload categories (refreshes when AI programs auto-add categories)
          const storedCategories = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
          if (storedCategories) {
            setCategories(JSON.parse(storedCategories));
          }

          // Reload preferences (this will update the preferences hook)
          await loadPreferences();
        } catch (error) {
          console.error('Error reloading data on focus:', error);
        }
      };
      reloadData();
    }, [loadPreferences])
  );

  // Update time every second for timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for Atlas tips when workout starts
  useEffect(() => {
    if (!activeWorkout) {
      setShowAtlasBanner(false);
      setAtlasTipMessage(null);
      return;
    }

    // Check once when workout becomes active
    const checkForAtlasTips = async () => {
      const sessionContext = await getWorkoutSession();
      if (sessionContext.isActive && sessionContext.session?.latestAtlasTip) {
        const tip = sessionContext.session.latestAtlasTip;
        setAtlasTipMessage(tip.message);
        setShowAtlasBanner(true);
      }
    };

    checkForAtlasTips();
  }, [activeWorkout]);

  // Set up notification handlers when workout starts
  useEffect(() => {
    if (!activeWorkout) return;

    console.log('🔔 Setting up rest timer notification handlers');

    setupRestTimerNotificationHandlers({
      onVoiceLog: () => {
        console.log('🎤 Voice log triggered from lock screen notification');
        // Trigger voice logging
        setShowVoiceModal(true);
      },
      onNextSet: () => {
        console.log('✓ Next set triggered from lock screen notification');
        // Find current exercise and set, mark as complete
        // This would need access to current workout state
        // For now, just dismiss the notification
      },
      onSkipExercise: () => {
        console.log('⏭️ Skip exercise triggered from lock screen notification');
        // Skip to next exercise
        // This would need access to current workout state
      },
    });
  }, [activeWorkout]);

  // Store the rest timer end time
  const restEndTimeRef = useRef<number | null>(null);

  // Rest timer countdown - uses system time to work even when app is backgrounded
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (restTimerActive) {
      // Always set a fresh end time when restartKey changes (instant restart)
      restEndTimeRef.current = Date.now() + (restTimerDuration * 1000);
      console.log('⏱️ Rest timer started, will end at:', new Date(restEndTimeRef.current).toLocaleTimeString());

      interval = setInterval(() => {
        if (!restEndTimeRef.current) return;

        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((restEndTimeRef.current - now) / 1000));

        setRestTimeRemaining(timeLeft);

        if (timeLeft <= 0) {
          // Rest complete - notify user
          Vibration.vibrate([0, 200, 100, 200]); // Pattern: wait 0ms, vibrate 200ms, pause 100ms, vibrate 200ms

          // Show toast notification
          setShowRestCompleteToast(true);

          // Auto-hide toast after 2 seconds
          setTimeout(() => {
            setShowRestCompleteToast(false);
          }, 2000);

          // Always display notification with sound (works even when phone is locked)
          // Include workout context for lock screen controls
          const workoutContext = currentRestExerciseName ? {
            exerciseName: currentRestExerciseName,
            currentSet: 1, // TODO: Get actual current set number
            totalSets: 3, // TODO: Get actual total sets
          } : undefined;

          displayRestTimerNotification(restTimerDuration, workoutContext);

          // Send Atlas proactive coaching only if enabled
          if (preferences.enableRestTimerSound) {
            const atlasMessage = `Rest time's up! Ready for your next set of ${currentRestExerciseName}? Let's go! 🔥`;
            displayAtlasCoachingNotification(atlasMessage, '🤖 Atlas Coach');

            // Save tip for banner and show immediately
            saveAtlasTip(atlasMessage);
            showAtlasTipNow(atlasMessage);
          }

          setRestTimerActive(false);
          restEndTimeRef.current = null;
        }
      }, 1000);
    } else {
      // Timer stopped - clear end time
      restEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimerActive, restTimerDuration, restTimerRestartKey, preferences.enableRestTimerSound, currentRestExerciseName]);

  const loadWorkoutHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setWorkoutHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to load workout history:', error);
    }
  };

  const loadRestTimerPreference = async () => {
    try {
      const storedPref = await AsyncStorage.getItem(REST_TIMER_PREF_KEY);
      if (storedPref !== null) {
        setRestTimerEnabled(JSON.parse(storedPref));
      }
    } catch (error) {
      console.error('Failed to load rest timer preference:', error);
    }
  };

  const saveRestTimerPreference = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(REST_TIMER_PREF_KEY, JSON.stringify(enabled));
      setRestTimerEnabled(enabled);
    } catch (error) {
      console.error('Failed to save rest timer preference:', error);
    }
  };

  const loadCustomDefaultRestTime = async () => {
    try {
      const storedTime = await AsyncStorage.getItem(CUSTOM_REST_TIME_KEY);
      if (storedTime !== null) {
        setCustomDefaultRestTime(JSON.parse(storedTime));
      }
    } catch (error) {
      console.error('Failed to load custom default rest time:', error);
    }
  };

  const saveCustomDefaultRestTime = async (seconds: number) => {
    try {
      await AsyncStorage.setItem(CUSTOM_REST_TIME_KEY, JSON.stringify(seconds));
      setCustomDefaultRestTime(seconds);
    } catch (error) {
      console.error('Failed to save custom default rest time:', error);
    }
  };

  const saveWorkoutHistory = async (history: WorkoutHistory[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save workout history:', error);
      Alert.alert(
        'Save Failed',
        'Could not save workout locally. Your data is safe in memory but may be lost if you close the app.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadTemplates = async () => {
    try {
      const storedTemplates = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const saveTemplates = async (templatesData: WorkoutTemplate[]) => {
    try {
      await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templatesData));
    } catch (error) {
      console.error('Failed to save templates:', error);
      Alert.alert(
        'Save Failed',
        'Could not save workout template. Your changes may be lost if you close the app.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadCategories = async () => {
    try {
      const storedCategories = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const saveCategories = async (newCategories: string[], oldCategories?: string[]) => {
    try {
      // Detect category renames by comparing old and new categories
      const categoriesToUpdate: { old: string; new: string }[] = [];

      if (oldCategories) {
        // Check for renames: categories that were in old list but not in new list
        // and new categories that weren't in old list
        const addedCategories = newCategories.filter(cat => !oldCategories.includes(cat));
        const removedCategories = oldCategories.filter(cat => !newCategories.includes(cat));

        // If we have the same number of additions and removals, likely a rename
        // Match them up in order (assumes user is editing one at a time)
        if (addedCategories.length === 1 && removedCategories.length === 1) {
          categoriesToUpdate.push({
            old: removedCategories[0],
            new: addedCategories[0],
          });
        }
      }

      // Update templates if any categories were renamed
      if (categoriesToUpdate.length > 0) {
        const updatedTemplates = templates.map(template => {
          if (!template.category) return template;

          const rename = categoriesToUpdate.find(r => r.old === template.category);
          if (rename) {
            return { ...template, category: rename.new };
          }
          return template;
        });

        // Save updated templates
        const templatesKey = `@muscleup/workout_templates_${user?.email}`;
        await AsyncStorage.setItem(templatesKey, JSON.stringify(updatedTemplates));
        setTemplates(updatedTemplates);

        console.log(`✅ Updated ${categoriesToUpdate.length} category rename(s) in templates`);
      }

      // Save new categories list
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
      setCategories(newCategories);
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  };

  // Filter templates by selected category
  const getFilteredTemplates = (): WorkoutTemplate[] => {
    if (!selectedCategory) return templates;
    return templates.filter(t => t.category === selectedCategory);
  };

  // Group templates by category for "All" view
  const getGroupedTemplates = (): { category: string | null; templates: WorkoutTemplate[] }[] => {
    if (selectedCategory) {
      // If a specific category is selected, return single group
      return [{ category: selectedCategory, templates: getFilteredTemplates() }];
    }

    // Group templates by category
    const grouped = new Map<string | null, WorkoutTemplate[]>();

    templates.forEach(template => {
      const cat = template.category || null;
      if (!grouped.has(cat)) {
        grouped.set(cat, []);
      }
      grouped.get(cat)!.push(template);
    });

    // Convert to array and sort: uncategorized first, then alphabetically by category name
    const result: { category: string | null; templates: WorkoutTemplate[] }[] = [];

    // Add uncategorized templates first (no header)
    if (grouped.has(null)) {
      result.push({ category: null, templates: grouped.get(null)! });
      grouped.delete(null);
    }

    // Add categorized templates sorted alphabetically
    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return a.localeCompare(b);
    });

    sortedCategories.forEach(cat => {
      result.push({ category: cat, templates: grouped.get(cat)! });
    });

    return result;
  };

  const getWorkoutDuration = () => {
    if (!workoutStartTime) return 0;
    const diff = currentTime.getTime() - workoutStartTime.getTime();
    return Math.floor(diff / 60000);
  };

  const formatTimer = () => {
    if (!workoutStartTime) return '00:00';
    const diff = currentTime.getTime() - workoutStartTime.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getPreviousWorkoutData = (exerciseName: string) => {
    // Find the most recent workout in history that contains this exercise
    for (const workout of workoutHistory) {
      const exercise = workout.exercises.find(ex => ex.name === exerciseName);
      if (exercise) {
        return exercise.sets;
      }
    }
    return null;
  };

  const detectTemplateChanges = (original: WorkoutTemplate, completed: WorkoutHistory): string[] => {
    const changes: string[] = [];

    // Check for added exercises
    const addedExercises = completed.exercises.filter(
      ex => !original.exercises.find(origEx => origEx.name === ex.name)
    );
    if (addedExercises.length > 0) {
      changes.push(`Added ${addedExercises.length} exercise${addedExercises.length > 1 ? 's' : ''}`);
    }

    // Check for removed exercises
    const removedExercises = original.exercises.filter(
      origEx => !completed.exercises.find(ex => ex.name === origEx.name)
    );
    if (removedExercises.length > 0) {
      changes.push(`Removed ${removedExercises.length} exercise${removedExercises.length > 1 ? 's' : ''}`);
    }

    // Check for added sets
    completed.exercises.forEach(completedEx => {
      const originalEx = original.exercises.find(ex => ex.name === completedEx.name);
      if (originalEx && completedEx.sets.length > originalEx.sets.length) {
        const addedSets = completedEx.sets.length - originalEx.sets.length;
        changes.push(`Added ${addedSets} set${addedSets > 1 ? 's' : ''} to ${completedEx.name}`);
      }
    });

    // Check for removed sets
    completed.exercises.forEach(completedEx => {
      const originalEx = original.exercises.find(ex => ex.name === completedEx.name);
      if (originalEx && completedEx.sets.length < originalEx.sets.length) {
        const removedSets = originalEx.sets.length - completedEx.sets.length;
        changes.push(`Removed ${removedSets} set${removedSets > 1 ? 's' : ''} from ${completedEx.name}`);
      }
    });

    return changes;
  };

  // Helper to show Atlas tip immediately
  const showAtlasTipNow = (message: string) => {
    setAtlasTipMessage(message);
    setShowAtlasBanner(true);
  };

  const handleStartWorkout = async (template: WorkoutTemplate) => {
    // Normalize template structure (fix old templates with wrong format)
    const normalizedTemplate = {
      ...template,
      exercises: template.exercises.map((exercise, exIndex) => {
        // If exercise.sets is not an array, it's an old template - fix it
        if (!Array.isArray(exercise.sets)) {
          const numSets = typeof exercise.sets === 'number' ? exercise.sets : 3;
          return {
            ...exercise,
            id: exercise.id || `${Date.now()}-${exIndex}`,
            sets: Array.from({ length: numSets }, (_, setIndex) => ({
              id: `${Date.now()}-${exIndex}-${setIndex}`,
              reps: '',
              weight: '',
              completed: false,
            })),
          };
        }
        return exercise;
      }),
    };

    // Auto-fill with template weights (already updated by Weekly Check-in)
    // Templates are the source of truth - Weekly Check-in updates these strategically
    const workoutWithPreviousData = {
      ...normalizedTemplate,
      isActive: true,
      exercises: normalizedTemplate.exercises.map(exercise => {
        const previousSets = getPreviousWorkoutData(exercise.name);

        // Use template weights as baseline (these may have been updated by Weekly Check-in)
        // Only autofill reps from previous workout if available
        return {
          ...exercise,
          sets: exercise.sets.map((set, index) => {
            const previousSet = previousSets?.[index];

            // If template has a weight, use it (it may have been updated by Weekly Check-in)
            // Otherwise, use previous workout weight ONLY if progressive overload is enabled
            const templateWeight = set.weight || '';
            const previousWeight = preferences?.enableProgressiveOverload ? (previousSet?.weight || '') : '';
            const finalWeight = templateWeight || previousWeight;

            return {
              ...set,
              reps: previousSet?.reps?.toString() || set.reps || '', // Autofill reps from previous session
              weight: finalWeight,
              completed: false,
            };
          }),
        };
      }),
    };

    // If we normalized the template, save it back to fix it permanently
    if (template !== normalizedTemplate) {
      const updatedTemplates = templates.map(t =>
        t.id === normalizedTemplate.id ? normalizedTemplate : t
      );
      setTemplates(updatedTemplates);
      saveTemplates(updatedTemplates);
    }

    // Store original template for comparison later
    setOriginalTemplate(normalizedTemplate);

    setActiveWorkout(workoutWithPreviousData);
    const startTime = new Date();
    setWorkoutStartTime(startTime);
    // Reset PRs for new workout
    setWorkoutPRs([]);

    // Reset rest timer for new workout
    setRestTimerActive(false);
    setRestTimeRemaining(customDefaultRestTime);
    setRestTimerDuration(customDefaultRestTime);
    setShowRestCompleteToast(false);
    setCurrentRestExerciseName('');

    // Start workout notification for lock screen
    await workoutNotification.startWorkoutNotification(normalizedTemplate.name || 'Workout');

    // Initialize workout session for Atlas AI tracking
    await saveWorkoutSession({
      workoutId: template.id,
      workoutName: template.name,
      emoji: template.emoji,
      startTime: startTime.toISOString(),
      totalSetsCompleted: 0,
      totalVolume: 0,
      dismissedTips: [],
      exercisePerformance: {},
    });

    // Send welcome notification from Atlas
    const welcomeMessage = `Starting ${template.name}! I'll guide you through each set. Let's crush it! 💪`;
    if (preferences.enableRestTimerSound) {
      await displayAtlasCoachingNotification(welcomeMessage, '🤖 Atlas Coach');
    }
    // Always save tip for banner (visible even without notifications)
    await saveAtlasTip(welcomeMessage);
    showAtlasTipNow(welcomeMessage);
  };

  const handleCloseCompletionModal = async () => {
    // Share workout with friends
    if (currentCompletedWorkout && user?.id) {
      try {
        const userId = user.id;
        const userName = user?.name || 'User';

        console.log('📤 Sharing workout to feed...');
        const inviteCode = await getMyInviteCode(userId, userName);
        await shareWorkout(
          userId,
          currentCompletedWorkout.id,
          currentCompletedWorkout.templateName,
          currentCompletedWorkout.emoji,
          currentCompletedWorkout.date,
          currentCompletedWorkout.duration,
          currentCompletedWorkout.exercises,
          inviteCode.code,
          userName,
          undefined // No photo
        );
        console.log('✅ Workout shared to feed!');
      } catch (error: any) {
        console.error('❌ Error sharing workout:', error);
        showErrorAlert('Sharing Failed', error);
      }
    }

    // Template update already handled before completion modal was shown
    // Just clean up and close
    setShowCompletionModal(false);
    setCompletionData(null);
    setWorkoutPRs([]);
    setCurrentWorkoutId(null);
    setCurrentCompletedWorkout(null);
  };

  const handleEditWorkout = (template: WorkoutTemplate) => {
    setEditingWorkout({ ...template });
  };

  const handleSaveEdit = () => {
    if (!editingWorkout) return;

    const updatedTemplates = templates.map(t =>
      t.id === editingWorkout.id ? editingWorkout : t
    );

    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setEditingWorkout(null);
  };

  const handleCancelEdit = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => setEditingWorkout(null),
        },
      ]
    );
  };

  const handleUpdateTemplate = () => {
    if (!originalTemplate || !currentCompletedWorkout) return;

    // Update template with completed workout structure
    const updatedTemplate: WorkoutTemplate = {
      ...originalTemplate,
      exercises: currentCompletedWorkout.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(set => ({
          ...set,
          reps: '',
          weight: '',
          completed: false,
        })),
      })),
    };

    const updatedTemplates = templates.map(t =>
      t.id === originalTemplate.id ? updatedTemplate : t
    );

    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);

    // Close template modal
    setShowUpdateTemplateModal(false);
    setTemplateChanges([]);
    setOriginalTemplate(null);

    // NOW show completion modal (celebration after decision)
    setShowCompletionModal(true);
  };

  const handleKeepOriginalTemplate = () => {
    // Close template modal
    setShowUpdateTemplateModal(false);
    setTemplateChanges([]);
    setOriginalTemplate(null);

    // NOW show completion modal (celebration after decision)
    setShowCompletionModal(true);
  };

  const updateEditingExerciseName = (exerciseId: string, name: string) => {
    if (!editingWorkout) return;

    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, name } : ex
      ),
    });
  };

  const updateEditingSet = (
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight',
    value: string
  ) => {
    if (!editingWorkout) return;

    // Sanitize input: only allow numbers and decimal point, no negative
    const sanitized = value.replace(/[^0-9.]/g, '');

    // Validate parsed value
    if (sanitized) {
      const numValue = parseFloat(sanitized);
      // Prevent values over reasonable limits
      if (!isNaN(numValue)) {
        if (field === 'weight' && numValue > 9999) return; // Max weight 9999 lbs
        if (field === 'reps' && numValue > 999) return; // Max reps 999
      }
    }

    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId ? { ...set, [field]: sanitized } : set
              ),
            }
          : exercise
      ),
    });
  };

  const addEditingSet = (exerciseId: string) => {
    if (!editingWorkout) return;

    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          // Get the last set to copy reps and weight from
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const copyReps = lastSet?.reps || '';
          const copyWeight = lastSet?.weight || '';

          return {
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: `${exerciseId}-${exercise.sets.length + 1}`,
                reps: copyReps,
                weight: copyWeight,
                completed: false,
              },
            ],
          };
        }
        return exercise;
      }),
    });
  };

  const removeEditingSet = (exerciseId: string, setId: string) => {
    if (!editingWorkout) return;

    // Find the set being deleted and its index for potential undo
    const exercise = editingWorkout.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const setIndex = exercise.sets.findIndex(s => s.id === setId);
    const setToDelete = exercise.sets[setIndex];
    if (!setToDelete || setIndex === -1) return;

    // Clear any existing undo timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Immediately remove the set from UI
    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.map(ex =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.filter(s => s.id !== setId),
            }
          : ex
      ),
    });

    // Show undo toast
    setUndoToast({
      visible: true,
      exerciseId,
      set: setToDelete,
      setIndex,
    });

    // Auto-dismiss toast after 4 seconds
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 4000);
  };

  const undoDeleteSet = () => {
    if (!undoToast || !editingWorkout) return;

    // Clear the timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Restore the set at its original position
    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.map(ex =>
        ex.id === undoToast.exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets.slice(0, undoToast.setIndex),
                undoToast.set,
                ...ex.sets.slice(undoToast.setIndex),
              ],
            }
          : ex
      ),
    });

    // Hide toast
    setUndoToast(null);
  };

  const addEditingExercise = () => {
    setIsAddExerciseModalVisible(true);
  };

  const handleSelectExercise = (exerciseName: string) => {
    // Capitalize each word in the exercise name
    console.log('🔥 BEFORE CAPITALIZE:', exerciseName);
    const capitalizedName = exerciseName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    console.log('🔥 AFTER CAPITALIZE:', capitalizedName);

    const newExercise: Exercise = {
      id: `${Date.now()}`,
      name: capitalizedName,
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: '',
          weight: '',
          completed: false,
        },
      ],
    };

    // Add to active workout if in workout mode
    if (activeWorkout) {
      setActiveWorkout({
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, newExercise],
      });
    }

    // Add to editing workout if in edit mode
    if (editingWorkout) {
      setEditingWorkout({
        ...editingWorkout,
        exercises: [...editingWorkout.exercises, newExercise],
      });
    }
  };

  // Get uncompleted sets that have data entered
  const getUncompletedSets = () => {
    if (!activeWorkout) return [];

    const uncompleted: { exerciseName: string; setNumber: number }[] = [];

    activeWorkout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set, index) => {
        // Check if set has data but is not completed
        if (!set.completed && set.reps.trim() && set.weight.trim()) {
          uncompleted.push({
            exerciseName: exercise.name,
            setNumber: index + 1,
          });
        }
      });
    });

    return uncompleted;
  };

  // Complete all unfinished sets that have data and return the updated workout
  const completeUnfinishedSets = () => {
    if (!activeWorkout) return null;

    const updatedWorkout = {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          !set.completed && set.reps.trim() && set.weight.trim()
            ? { ...set, completed: true }
            : set
        ),
      })),
    };

    setActiveWorkout(updatedWorkout);
    return updatedWorkout;
  };

  // Auto-update template weights with progressive overload logic
  const updateTemplateWithProgressiveOverload = async (
    originalTemplate: WorkoutTemplate,
    completedWorkout: WorkoutHistory
  ) => {
    console.log('🔄 Auto-updating template weights with progressive overload...');

    // Find the template to update
    const templateToUpdate = templates.find(t => t.id === originalTemplate.id);
    if (!templateToUpdate) {
      console.log('❌ Template not found, skipping auto-update');
      return;
    }

    // Update each exercise in the template
    const updatedTemplate: WorkoutTemplate = {
      ...templateToUpdate,
      exercises: templateToUpdate.exercises.map(templateExercise => {
        // Find matching exercise in completed workout
        const completedExercise = completedWorkout.exercises.find(
          ex => ex.name === templateExercise.name
        );

        if (!completedExercise) {
          console.log(`  ℹ️ ${templateExercise.name}: Not in completed workout, keeping current weights`);
          return templateExercise;
        }

        // Get completed sets (only the ones that were actually completed)
        const completedSets = completedExercise.sets.filter(s => s.completed);
        if (completedSets.length === 0) {
          console.log(`  ℹ️ ${templateExercise.name}: No completed sets, keeping current weights`);
          return templateExercise;
        }

        // Find the best set (highest weight, then highest reps)
        const bestSet = completedSets.reduce((best, set) => {
          const reps = parseInt(set.reps) || 0;
          const weight = parseFloat(set.weight) || 0;
          const bestReps = parseInt(best.reps) || 0;
          const bestWeight = parseFloat(best.weight) || 0;

          if (weight > bestWeight || (weight === bestWeight && reps > bestReps)) {
            return set;
          }
          return best;
        }, completedSets[0]);

        const bestReps = parseInt(bestSet.reps) || 0;
        const bestWeight = parseFloat(bestSet.weight) || 0;

        // Check if progressive overload threshold was hit
        const increaseAtReps = preferences?.progressiveOverloadConfig?.increaseAtReps ?? 12;
        const weightIncrement = preferences?.progressiveOverloadConfig?.weightIncrement ?? 5;

        console.log(`  🔍 Progressive Overload Config for ${templateExercise.name}:`, {
          increaseAtReps,
          weightIncrement,
          bestReps,
          bestWeight,
          fullConfig: preferences?.progressiveOverloadConfig
        });

        let newWeight = bestWeight;
        if (bestReps >= increaseAtReps) {
          // HIT THRESHOLD! Increase weight
          newWeight = bestWeight + weightIncrement;
          console.log(`  ✅ ${templateExercise.name}: Hit ${bestReps} reps (threshold: ${increaseAtReps}) - INCREASING ${bestWeight} → ${newWeight} ${preferences?.unitSystem || 'lbs'} (increment: ${weightIncrement})`);
        } else {
          // Didn't hit threshold - copy exact weight from workout
          console.log(`  📋 ${templateExercise.name}: ${bestReps} reps (need ${increaseAtReps}) - keeping at ${newWeight} ${preferences?.unitSystem || 'lbs'}`);
        }

        // Update all sets in template with the new weight
        return {
          ...templateExercise,
          sets: templateExercise.sets.map(set => ({
            ...set,
            weight: newWeight.toString(),
          })),
        };
      }),
    };

    // Save updated template
    const updatedTemplates = templates.map(t =>
      t.id === originalTemplate.id ? updatedTemplate : t
    );
    setTemplates(updatedTemplates);
    await saveTemplates(updatedTemplates);

    console.log('✅ Template auto-updated successfully');
  };

  // Save and finish the workout
  const saveAndFinishWorkout = async (workoutToSave?: WorkoutTemplate) => {
    const workout = workoutToSave || activeWorkout;
    if (!workout || !workoutStartTime) return;

    const duration = getWorkoutDuration();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const completedWorkout: WorkoutHistory = {
      id: `${Date.now()}`,
      templateId: workout.id,
      templateName: workout.name,
      emoji: workout.emoji,
      date: dateStr,
      duration: duration,
      exercises: workout.exercises,
    };

    console.log('📝 Completed workout data:');
    console.log('  - ID:', completedWorkout.id);
    console.log('  - Name:', completedWorkout.templateName);
    console.log('  - Duration:', completedWorkout.duration, 'minutes');
    console.log('  - Exercises:', completedWorkout.exercises.length);
    console.log('  - Date:', completedWorkout.date);
    console.log('  - Full workout:', JSON.stringify(completedWorkout, null, 2));

    // Save to history
    const updatedHistory = [completedWorkout, ...workoutHistory];
    setWorkoutHistory(updatedHistory);
    await saveWorkoutHistory(updatedHistory);

    // ✅ Sync to cloud immediately after saving locally
    if (user?.id) {
      cloudSyncService.syncSingleWorkout(user.id, completedWorkout)
        .catch(err => console.error('Background sync failed:', err));
      // Note: We don't await this - let it sync in background
    }

    // AUTO-UPDATE TEMPLATE WEIGHTS with progressive overload logic
    await updateTemplateWithProgressiveOverload(workout, completedWorkout);

    // Don't share workout here - it will be shared in handleCloseCompletionModal
    // with or without photo

    // Calculate workout stats
    const totalCompletedSets = completedWorkout.exercises.reduce(
      (total, ex) => total + ex.sets.filter(s => s.completed).length,
      0
    );
    const totalVolume = completedWorkout.exercises.reduce(
      (total, ex) =>
        total +
        ex.sets
          .filter(s => s.completed)
          .reduce((sum, set) => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            return sum + weight * reps;
          }, 0),
      0
    );

    // Store workout data for potential photo upload
    setCurrentWorkoutId(completedWorkout.id);
    setCurrentCompletedWorkout(completedWorkout);

    // Prepare completion data (will be shown after template decision or immediately)
    const comparisonMessage = generateWorkoutComparison(
      completedWorkout,
      workoutHistory,
      preferences.unitSystem
    );

    const completionDataToShow = {
      workoutName: workout.name,
      emoji: workout.emoji,
      duration: duration,
      totalSets: totalCompletedSets,
      totalVolume: Math.round(totalVolume),
      ...(comparisonMessage && { comparisonMessage }),
    };
    setCompletionData(completionDataToShow);

    // Haptic feedback if PRs were achieved
    if (workoutPRs.length > 0) {
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
    }

    // Workout completed successfully - clear active workout
    setActiveWorkout(null);
    setWorkoutStartTime(null);

    // Stop workout notification
    await workoutNotification.stopNotification();

    // Clear workout session for Atlas AI tracking
    await clearWorkoutSession();

    // Check if workout structure differs from original template BEFORE showing completion modal
    if (originalTemplate && completedWorkout) {
      const changes = detectTemplateChanges(originalTemplate, completedWorkout);
      if (changes.length > 0) {
        // Show update template prompt FIRST (decision before celebration)
        setTemplateChanges(changes);
        setShowUpdateTemplateModal(true);
        // Completion modal will be shown after template decision
        return;
      }
    }

    // No template changes - show completion modal immediately
    setShowCompletionModal(true);
  };

  const handleFinishWorkout = () => {
    console.log('🏁 Finish button pressed');
    const uncompletedSets = getUncompletedSets();
    console.log('Uncompleted sets:', uncompletedSets.length);

    // If there are uncompleted sets with data, show confirmation dialog
    if (uncompletedSets.length > 0) {
      setIncompleteSetsCount(uncompletedSets.length);
      setIncompleteSetModalVisible(true);
    } else {
      // No uncompleted sets, finish directly
      saveAndFinishWorkout();
    }
  };

  const handleShareWorkout = async () => {
    if (!completionData) return;

    // Format PRs text
    let prsText = '';
    if (workoutPRs.length > 0) {
      prsText = '\n\n🎉 New PRs:\n' + workoutPRs.map(pr =>
        `• ${pr.exerciseName}: ${pr.newWeight} ${preferences.unitSystem} × ${pr.newReps} reps (${pr.improvement})`
      ).join('\n');
    }

    // Build the share message
    const message = `💪 Workout Complete!

${completionData.emoji} ${completionData.workoutName}
⏱️ ${completionData.duration} minutes
📊 ${completionData.totalSets} sets | ${(completionData.totalVolume / 1000).toFixed(1)}k ${preferences.unitSystem} total volume${prsText}

Tracked with MuscleUp`;

    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing workout:', error);
    }
  };

  const handleCompleteAndFinish = async () => {
    setIncompleteSetModalVisible(false);
    const updatedWorkout = completeUnfinishedSets();
    if (updatedWorkout) {
      // Check for PRs in all sets that were just auto-completed
      const prsToAdd: PRCelebrationType[] = [];

      for (const exercise of updatedWorkout.exercises) {
        for (const set of exercise.sets) {
          // Only check sets that were just completed (have data and are marked completed)
          if (set.completed && set.reps.trim() && set.weight.trim()) {
            const weight = parseFloat(set.weight);
            const reps = parseInt(set.reps, 10);

            if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
              const result = await checkForNewPR(
                exercise.name,
                weight,
                reps,
                updatedWorkout.id,
                new Date().toISOString()
              );

              if (result.isNewPR && result.celebration && result.newPR) {
                // Save the PR
                await savePR(result.newPR);
                // Collect for celebration
                prsToAdd.push(result.celebration);
              }
            }
          }
        }
      }

      // Add all newly detected PRs
      if (prsToAdd.length > 0) {
        setWorkoutPRs(prev => [...prev, ...prsToAdd]);
      }

      saveAndFinishWorkout(updatedWorkout);
    }
  };

  const handleCancelWorkoutFromModal = () => {
    setIncompleteSetModalVisible(false);
    setCancelWorkoutDialogVisible(true);
  };

  const handleConfirmCancelWorkout = async () => {
    setCancelWorkoutDialogVisible(false);
    setActiveWorkout(null);
    setWorkoutStartTime(null);

    // Stop workout notification
    await workoutNotification.stopNotification();

    // Clear workout session for Atlas AI tracking
    await clearWorkoutSession();
  };

  const handleCancelWorkout = () => {
    console.log('❌ Cancel button pressed');
    setCancelWorkoutDialogVisible(true);
  };

  const toggleSetComplete = async (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    // Find the exercise and set
    const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);

    if (!exercise || !set) return;

    const isCompleting = !set.completed;

    // Update the workout state
    const updatedWorkout = {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, completed: !s.completed } : s
              ),
            }
          : ex
      ),
    };

    setActiveWorkout(updatedWorkout);

    // Check for PR when completing a set
    if (isCompleting) {
      const weight = parseFloat(set.weight);
      const reps = parseInt(set.reps, 10);

      if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
        const result = await checkForNewPR(
          exercise.name,
          weight,
          reps,
          activeWorkout.id,
          new Date().toISOString()
        );

        if (result.isNewPR && result.celebration && result.newPR) {
          // Save the PR
          await savePR(result.newPR);

          // Collect PRs for workout completion modal
          setWorkoutPRs(prev => [...prev, result.celebration!]);
        }
      }

      // Record completed set for Atlas AI tracking
      await recordCompletedSet(exercise.name, set.weight, set.reps);

      // Progressive overload trigger - check after completing a set
      const completedSets = exercise.sets.filter(s => s.completed || s.id === setId);
      const currentSetNumber = completedSets.length;
      const totalSets = exercise.sets.length;

      // Only provide progressive overload tips if enabled
      if (!preferences?.enableProgressiveOverload) {
        console.log('🎯 Progressive overload disabled, skipping tips');
      } else {
        // Use user's target rep range minimum for coaching trigger (e.g., 8 for hypertrophy, 5 for strength)
        const minRepsForCoaching = preferences?.progressiveOverloadConfig?.targetRepRange?.min ?? 8;
        const weightIncrement = preferences?.progressiveOverloadConfig?.weightIncrement ?? 5;

        console.log('🎯 Progressive Overload Check:', {
          currentSetNumber,
          totalSets,
          reps,
          minRepsForCoaching,
          meetsRepRequirement: reps >= minRepsForCoaching,
        });

        // Trigger after 3rd set with consistent performance
        if (currentSetNumber === 3 && reps >= minRepsForCoaching) {
        const lastThreeSets = completedSets.slice(-3);
        console.log('🎯 Last 3 sets:', lastThreeSets.map(s => ({ weight: s.weight, reps: s.reps })));

        const allSameWeight = lastThreeSets.every(s => parseFloat(s.weight) === parseFloat(lastThreeSets[0].weight));
        const allSameReps = lastThreeSets.every(s => parseInt(s.reps) === parseInt(lastThreeSets[0].reps));

        console.log('🎯 Consistency check:', { allSameWeight, allSameReps });

        if (allSameWeight && allSameReps) {
          const currentWeight = parseFloat(set.weight);
          const suggestedWeight = currentWeight + weightIncrement;
          const unitSystem = preferences?.unitSystem ?? 'lbs';

          if (totalSets === 3) {
            // Scenario 1: 3-set workout complete - encourage next workout
            const tipMsg = `Crushed all 3 sets at ${currentWeight}${unitSystem}! Next workout, try ${suggestedWeight}${unitSystem} 💪`;
            await saveAtlasTip(tipMsg);
            showAtlasTipNow(tipMsg);
          } else if (totalSets >= 4) {
            // Scenario 2: 4+ sets - challenge them NOW
            const tipMsg = `3 strong sets at ${currentWeight}${unitSystem}! Challenge yourself - try ${suggestedWeight}${unitSystem} for set 4? 🔥`;
            await saveAtlasTip(tipMsg);
            showAtlasTipNow(tipMsg);
          }
        }
        }
      }

      // AI Form Coaching - trigger after 2nd+ set or when performance declines
      const sessionContext = await getWorkoutSession();
      if (sessionContext.isActive && sessionContext.session) {
        const exercisePerf = sessionContext.session.exercisePerformance[exercise.name];

        // Trigger form coaching if:
        // 1. Performance is declining (reps dropped significantly)
        // 2. OR completed 2+ sets (provide encouragement/form reminder)
        if (exercisePerf && exercisePerf.sets.length >= 2) {
          const shouldShowCoaching =
            exercisePerf.performanceTrend === 'declining' ||
            (exercisePerf.sets.length === 2 && currentSetNumber === 2);

          if (shouldShowCoaching) {
            // Build personalized coaching context
            const coachingContext = await buildCoachingContext(
              exercise.name,
              set.weight,
              set.reps,
              {
                sets: exercisePerf.sets,
                trend: exercisePerf.performanceTrend,
              }
            );

            // Generate AI-powered form cue
            const formCue = await generateFormCoaching(
              exercise.name,
              coachingContext,
              exercisePerf.performanceTrend
            );

            // Save tip with unique ID based on exercise + set number and show immediately
            const tipId = `form_${exercise.name}_${currentSetNumber}`;
            await saveAtlasTip(formCue, tipId);
            showAtlasTipNow(formCue);
          }
        }
      }

      // Start rest timer when completing a set with smart defaults (only if enabled)
      if (restTimerEnabled) {
        const smartRestTime = getDefaultRestTime(exercise.name, customDefaultRestTime);

        setRestTimerDuration(smartRestTime);
        setCurrentRestExerciseName(exercise.name);
        setRestTimerActive(true);
        setRestTimerRestartKey(prev => prev + 1); // Increment to force instant restart
      }

      // Auto-advance to next set after completing current set
      const nextKey = getNextInputKey(exerciseId, setId, 'weight');
      if (nextKey && inputRefs.current[nextKey]) {
        setTimeout(() => {
          inputRefs.current[nextKey]?.focus();
        }, 300); // Small delay to let completion animation finish
      }
    }
  };

  // Handle voice logging results
  const handleVoiceResult = async (result: VoiceLoggerResult) => {
    console.log('🎯 handleVoiceResult received:', result);

    if (!activeWorkout || !result.success) {
      if (result.error) {
        await atlasVoice.speak(atlasVoice.getErrorResponse());
      }
      return;
    }

    // Find the first incomplete set in the current exercise
    let targetExercise: Exercise | undefined;
    let targetSet: Set | undefined;

    for (const exercise of activeWorkout.exercises) {
      const incompleteSet = exercise.sets.find(s => !s.completed);
      if (incompleteSet) {
        targetExercise = exercise;
        targetSet = incompleteSet;
        break;
      }
    }

    if (!targetExercise || !targetSet) {
      await atlasVoice.speak("No incomplete sets found");
      return;
    }

    console.log('🎯 Target set:', { exercise: targetExercise.name, setId: targetSet.id, currentWeight: targetSet.weight, currentReps: targetSet.reps });
    console.log('🎯 Will update to:', { weight: result.weight, reps: result.reps });

    // Update the set with voice data
    const updatedExercises = activeWorkout.exercises.map((ex) =>
      ex.id === targetExercise!.id
        ? {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === targetSet!.id
                ? {
                    ...s,
                    weight: result.weight?.toString() || s.weight,
                    reps: result.reps?.toString() || s.reps,
                  }
                : s
            ),
          }
        : ex
    );

    const updatedWorkout = {
      ...activeWorkout,
      exercises: updatedExercises,
    };

    setActiveWorkout(updatedWorkout);

    // Auto-complete the set if both weight and reps were provided
    if (result.weight && result.reps) {
      // Complete the set with the updated workout to ensure voice data persists
      setTimeout(async () => {
        // Find the updated set with the voice data
        const updatedExercise = updatedWorkout.exercises.find(ex => ex.id === targetExercise!.id);
        const updatedSet = updatedExercise?.sets.find(s => s.id === targetSet!.id);

        if (!updatedExercise || !updatedSet) return;

        const isCompleting = !updatedSet.completed;

        // Complete the set using the updated workout
        const finalWorkout = {
          ...updatedWorkout,
          exercises: updatedWorkout.exercises.map((ex) =>
            ex.id === targetExercise!.id
              ? {
                  ...ex,
                  sets: ex.sets.map((s) =>
                    s.id === targetSet!.id ? { ...s, completed: true } : s
                  ),
                }
              : ex
          ),
        };

        setActiveWorkout(finalWorkout);

        // Check for PR when completing a set
        if (isCompleting) {
          const weight = parseFloat(updatedSet.weight);
          const reps = parseInt(updatedSet.reps, 10);

          if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
            const prResult = await checkForNewPR(
              updatedExercise.name,
              weight,
              reps,
              updatedWorkout.id,
              new Date().toISOString()
            );

            if (prResult.isNewPR && prResult.celebration && prResult.newPR) {
              await savePR(prResult.newPR);
              setWorkoutPRs(prev => [...prev, prResult.celebration!]);
            }
          }

          // Record completed set for Atlas AI tracking
          await recordCompletedSet(updatedExercise.name, updatedSet.weight, updatedSet.reps);

          // Start rest timer if enabled
          if (restTimerEnabled) {
            const smartRestTime = getDefaultRestTime(updatedExercise.name, customDefaultRestTime);

            setRestTimerDuration(smartRestTime);
            setCurrentRestExerciseName(updatedExercise.name);
            setRestTimerActive(true);
            setRestTimerRestartKey(prev => prev + 1); // Increment to force instant restart
          }
        }

        // Get previous performance for context
        const previousWeight = targetExercise!.sets[0]?.weight;
        const previousReps = targetExercise!.sets[0]?.reps;

        // Speak Atlas response
        const response = atlasVoice.getSetLoggedResponse({
          exerciseName: targetExercise!.name,
          weight: result.weight,
          reps: result.reps,
          previousWeight: previousWeight ? parseFloat(previousWeight) : undefined,
          previousReps: previousReps ? parseInt(previousReps) : undefined,
        });

        await atlasVoice.speak(response);
      }, 100);
    } else {
      // Only weight or reps provided, don't auto-complete
      await atlasVoice.speak("Got it");
    }
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight',
    value: string
  ) => {
    if (!activeWorkout) return;

    // Sanitize input: only allow numbers and decimal point, no negative
    const sanitized = value.replace(/[^0-9.]/g, '');

    // Validate parsed value
    if (sanitized) {
      const numValue = parseFloat(sanitized);
      // Prevent values over reasonable limits
      if (!isNaN(numValue)) {
        if (field === 'weight' && numValue > 9999) return; // Max weight 9999 lbs
        if (field === 'reps' && numValue > 999) return; // Max reps 999
      }
    }

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: sanitized } : set
              ),
            }
          : exercise
      ),
    });
  };

  // Smart autofill: Copy from last completed set when user focuses on empty field
  const handleSetInputFocus = (
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight'
  ) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    const currentSetIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (currentSetIndex === -1) return;

    const currentSet = exercise.sets[currentSetIndex];

    // Only autofill if current field is empty
    if (currentSet[field] && currentSet[field].trim() !== '') return;

    // Find the last completed set (search backwards from current set)
    let lastCompletedSet = null;
    for (let i = currentSetIndex - 1; i >= 0; i--) {
      const prevSet = exercise.sets[i];
      if (prevSet.weight && prevSet.weight.trim() !== '' && prevSet.reps && prevSet.reps.trim() !== '') {
        lastCompletedSet = prevSet;
        break;
      }
    }

    // If found, autofill the current field with value from last completed set
    if (lastCompletedSet) {
      const autofillValue = lastCompletedSet[field];
      if (autofillValue && autofillValue.trim() !== '') {
        updateSet(exerciseId, setId, field, autofillValue);
      }
    }
  };

  // Handle voice input for a set
  // Handle plate calculator
  const openPlateCalculator = (exerciseId: string, setId: string, currentWeight: string) => {
    setPlateCalculatorSet({ exerciseId, setId, currentWeight });
    setPlateCalculatorVisible(true);
  };

  const closePlateCalculator = () => {
    setPlateCalculatorVisible(false);
    setPlateCalculatorSet(null);
  };

  const applyCalculatorWeight = (weight: string) => {
    if (plateCalculatorSet) {
      updateSet(plateCalculatorSet.exerciseId, plateCalculatorSet.setId, 'weight', weight);
    }
  };

  // Move exercise up or down in the list
  const moveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    if (!activeWorkout) return;

    const currentIndex = activeWorkout.exercises.findIndex(ex => ex.id === exerciseId);
    if (currentIndex === -1) return;

    // Can't move first exercise up or last exercise down
    if ((direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === activeWorkout.exercises.length - 1)) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const exercises = [...activeWorkout.exercises];

    // Swap exercises
    [exercises[currentIndex], exercises[newIndex]] = [exercises[newIndex], exercises[currentIndex]];

    setActiveWorkout({
      ...activeWorkout,
      exercises,
    });
  };

  // Show exercise menu (reorder and note options)
  const showExerciseMenu = (exerciseId: string, exerciseName: string) => {
    if (!activeWorkout) return;

    const currentIndex = activeWorkout.exercises.findIndex(ex => ex.id === exerciseId);
    if (currentIndex === -1) return;

    const isFirst = currentIndex === 0;
    const isLast = currentIndex === activeWorkout.exercises.length - 1;

    // Build menu options
    const buttons: any[] = [];

    if (!isFirst) {
      buttons.push({
        text: 'Move Up ↑',
        onPress: () => moveExercise(exerciseId, 'up'),
      });
    }

    if (!isLast) {
      buttons.push({
        text: 'Move Down ↓',
        onPress: () => moveExercise(exerciseId, 'down'),
      });
    }

    buttons.push({
      text: 'Add Set Note 📝',
      onPress: () => {
        // Use setTimeout to ensure the Alert dismisses before showing the modal
        setTimeout(() => {
          setCurrentNoteExerciseId(exerciseId);
          setShowSetSelectModal(true);
        }, 100);
      },
    });

    buttons.push({
      text: 'Remove Exercise',
      onPress: () => removeExercise(exerciseId),
      style: 'destructive',
    });

    buttons.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(exerciseName, 'Choose an option', buttons);
  };

  // Render swipe delete action
  const renderRightActions = (exerciseId: string) => (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.swipeDeleteContainer,
          {
            transform: [{ translateX: trans }],
          },
        ]}>
        <TouchableOpacity
          style={styles.swipeDeleteButton}
          onPress={() => removeExercise(exerciseId)}>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Quick increment/decrement weight
  const adjustWeight = (exerciseId: string, setId: string, delta: number) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);

    if (!set) return;

    const currentWeight = parseFloat(set.weight) || 0;
    // Clamp between 0 and 9999
    const newWeight = Math.min(Math.max(0, currentWeight + delta), 9999);

    updateSet(exerciseId, setId, 'weight', newWeight.toString());
  };

  // Open note modal for a specific set
  const openNoteModal = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);

    if (!set) return;

    setCurrentNoteSetId({ exerciseId, setId });
    setNoteText(set.notes || '');
    setIsViewingPreviousNote(false); // This is a current workout note
    setShowSetSelectModal(false);
    setShowNoteModal(true);
  };

  // Save note for a set
  const saveNote = () => {
    if (!activeWorkout || !currentNoteSetId) return;

    const { exerciseId, setId } = currentNoteSetId;

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, notes: noteText.trim() || undefined } : s
              ),
            }
          : ex
      ),
    });

    setShowNoteModal(false);
    setCurrentNoteSetId(null);
    setNoteText('');
    setIsViewingPreviousNote(false);
  };

  // Delete note for a set
  const deleteNote = () => {
    if (!activeWorkout || !currentNoteSetId) return;

    const { exerciseId, setId } = currentNoteSetId;

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, notes: undefined } : s
              ),
            }
          : ex
      ),
    });

    setShowNoteModal(false);
    setCurrentNoteSetId(null);
    setNoteText('');
    setIsViewingPreviousNote(false);
  };

  // Copy from previous set
  const copyFromPrevious = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const setIndex = exercise.sets.findIndex(s => s.id === setId);
    if (setIndex <= 0) return; // No previous set

    const prevSet = exercise.sets[setIndex - 1];

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId
                  ? { ...s, reps: prevSet.reps, weight: prevSet.weight }
                  : s
              ),
            }
          : ex
      ),
    });
  };

  const addSet = (exerciseId: string) => {
    if (!activeWorkout) return;

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          // Get the last set to copy reps and weight from
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const copyReps = lastSet?.reps || '';
          const copyWeight = lastSet?.weight || '';

          return {
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: `${exerciseId}-${exercise.sets.length + 1}`,
                reps: copyReps,
                weight: copyWeight,
                completed: false,
              },
            ],
          };
        }
        return exercise;
      }),
    });
  };

  const removeSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    // Find the set being deleted and its index for potential undo
    const exercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const setIndex = exercise.sets.findIndex(s => s.id === setId);
    const setToDelete = exercise.sets[setIndex];
    if (!setToDelete || setIndex === -1) return;

    // Check if this is the last set - if so, delete the entire exercise
    if (exercise.sets.length === 1) {
      removeExercise(exerciseId);
      return;
    }

    // Clear any existing undo timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Immediately remove the set from UI
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.filter((s) => s.id !== setId),
            }
          : ex
      ),
    });

    // Show undo toast
    setUndoToast({
      visible: true,
      exerciseId,
      set: setToDelete,
      setIndex,
    });

    // Auto-dismiss toast after 4 seconds
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 4000);
  };

  const undoDeleteSetActive = () => {
    if (!undoToast || !activeWorkout) return;

    // Clear the timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Restore the set at its original position
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(ex =>
        ex.id === undoToast.exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets.slice(0, undoToast.setIndex),
                undoToast.set,
                ...ex.sets.slice(undoToast.setIndex),
              ],
            }
          : ex
      ),
    });

    // Hide toast
    setUndoToast(null);
  };

  const addExercise = () => {
    setIsAddExerciseModalVisible(true);
  };

  const removeExercise = (exerciseId: string) => {
    if (!activeWorkout) return;

    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setActiveWorkout({
              ...activeWorkout,
              exercises: activeWorkout.exercises.filter((ex) => ex.id !== exerciseId),
            });
          },
        },
      ]
    );
  };

  const updateExerciseName = (exerciseId: string, name: string) => {
    if (!activeWorkout) return;

    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, name } : ex
      ),
    });
  };

  const handleAddWorkout = (workoutName: string, exercises: Exercise[]) => {
    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name: workoutName,
      emoji: '💪',
      category: selectedCategory || undefined,
      exercises: exercises,
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const handleSaveCardio = async (cardioData: {
    activityType: string;
    emoji: string;
    distance: string;
    duration: string;
    calories: string;
    notes: string;
  }) => {
    // Create a cardio "workout" that fits the existing structure
    const cardioExercise: Exercise = {
      id: Date.now().toString(),
      name: cardioData.activityType,
      sets: [
        {
          id: `${Date.now()}-1`,
          reps: cardioData.distance ? `${cardioData.distance} mi` : cardioData.duration,
          weight: cardioData.duration,
          completed: true,
        },
      ],
    };

    const cardioWorkout: WorkoutHistory = {
      id: Date.now().toString(),
      templateId: 'cardio',
      templateName: 'Cardio',
      emoji: cardioData.emoji,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: parseInt(cardioData.duration) || 0,
      exercises: [cardioExercise],
    };

    const updatedHistory = [cardioWorkout, ...workoutHistory];
    setWorkoutHistory(updatedHistory);
    await saveWorkoutHistory(updatedHistory);

    // Sync to cloud
    if (user?.id) {
      cloudSyncService.syncSingleWorkout(user.id, cardioWorkout)
        .catch(err => console.error('Background sync failed:', err));
    }

    Alert.alert('Success', `${cardioData.activityType} session logged!`);
  };

  const handleDeleteHistory = async (historyId: string) => {
    const updatedHistory = workoutHistory.filter(h => h.id !== historyId);
    setWorkoutHistory(updatedHistory);
    await saveWorkoutHistory(updatedHistory);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            setTemplates(updatedTemplates);
            saveTemplates(updatedTemplates);
          },
        },
      ]
    );
  };

  const formatHistoryDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get the next input field in the workout
  const getNextInputKey = (exerciseId: string, setId: string, field: 'reps' | 'weight'): string | null => {
    if (!activeWorkout) return null;

    const exerciseIndex = activeWorkout.exercises.findIndex(ex => ex.id === exerciseId);
    const exercise = activeWorkout.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex(s => s.id === setId);

    // If we're on reps, move to weight
    if (field === 'reps') {
      return `${exerciseId}-${setId}-weight`;
    }

    // If we're on weight, move to next set's reps or next exercise's first set
    if (field === 'weight') {
      // Check if there's a next set in this exercise
      if (setIndex < exercise.sets.length - 1) {
        const nextSet = exercise.sets[setIndex + 1];
        return `${exerciseId}-${nextSet.id}-reps`;
      }

      // Check if there's a next exercise
      if (exerciseIndex < activeWorkout.exercises.length - 1) {
        const nextExercise = activeWorkout.exercises[exerciseIndex + 1];
        const firstSet = nextExercise.sets[0];
        return `${nextExercise.id}-${firstSet.id}-reps`;
      }
    }

    return null;
  };

  // Handle moving to next field
  const handleMoveToNextField = (exerciseId: string, setId: string, field: 'reps' | 'weight') => {
    const nextKey = getNextInputKey(exerciseId, setId, field);

    // If we just finished the weight field, auto-check the set
    if (field === 'weight') {
      const exercise = activeWorkout?.exercises.find(ex => ex.id === exerciseId);
      const set = exercise?.sets.find(s => s.id === setId);

      // Only auto-check if both fields are filled and not already completed
      if (set && set.reps.trim() !== '' && set.weight.trim() !== '' && !set.completed) {
        toggleSetComplete(exerciseId, setId);
      }
    }

    // Move to next field if it exists
    if (nextKey && inputRefs.current[nextKey]) {
      setTimeout(() => {
        inputRefs.current[nextKey]?.focus();
      }, 100);
    }
  };

  // Active Workout View
  if (activeWorkout) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelWorkout} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {activeWorkout.emoji} {activeWorkout.name}
            </Text>
            <Text style={styles.headerSubtitle}>{formatTimer()}</Text>
          </View>
          <TouchableOpacity onPress={handleFinishWorkout} style={styles.finishButton}>
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Atlas Coaching Banner */}
        {showAtlasBanner && atlasTipMessage && (
          <AtlasCoachingBanner
            message={atlasTipMessage}
            onPress={() => {
              console.log('🤖 Banner pressed, opening Atlas modal');
              setShowAtlasModal(true);
            }}
            onDismiss={async () => {
              console.log('🤖 Banner dismissed - marking tip as dismissed');
              await dismissAtlasTip();
              setShowAtlasBanner(false);
              setAtlasTipMessage(null);
            }}
          />
        )}

        {/* Rest Timer Disabled Indicator */}
        {!restTimerEnabled && (
          <TouchableOpacity
            style={styles.timerDisabledBanner}
            onPress={() => {
              Alert.alert(
                'Enable Rest Timer',
                'Auto-start rest timer after completing sets?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Enable',
                    onPress: () => saveRestTimerPreference(true),
                  },
                ]
              );
            }}>
            <Text style={styles.timerDisabledText}>⏱️ Rest timer disabled</Text>
            <Text style={styles.timerDisabledSubtext}>Tap to enable</Text>
          </TouchableOpacity>
        )}

        {/* Rest Timer Banner */}
        {restTimerActive && (
          <View style={styles.restTimerBanner}>
            <View style={styles.restTimerHeader}>
              <View style={styles.restTimerContent}>
                <Text style={styles.restTimerLabel}>
                  {currentRestExerciseName ? `Rest - ${currentRestExerciseName}` : 'Rest Time'}
                </Text>
                <Text style={styles.restTimerTime}>
                  {formatTime(restTimeRemaining)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.disableTimerButton}
                onPress={() => {
                  Alert.alert(
                    'Rest Timer Options',
                    'Adjust rest timer settings',
                    [
                      {
                        text: `Set Default (${formatTime(customDefaultRestTime)})`,
                        onPress: () => {
                          setTempDefaultTime(customDefaultRestTime.toString());
                          setShowSetDefaultModal(true);
                        },
                      },
                      {
                        text: 'Disable Timer',
                        style: 'destructive',
                        onPress: () => {
                          saveRestTimerPreference(false);
                          setRestTimerActive(false);
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}>
                <Text style={styles.disableTimerText}>⋯</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.restTimerButtons}>
              <TouchableOpacity
                style={styles.restTimerAdjustButton}
                onPress={() => {
                  const newTimeRemaining = Math.max(0, restTimeRemaining - 15);
                  setRestTimeRemaining(newTimeRemaining);
                  if (restTimerActive) {
                    // Update the end time reference so timer continues from adjusted time
                    restEndTimeRef.current = Date.now() + (newTimeRemaining * 1000);
                    // If reduced to 0, trigger rest complete notification
                    if (newTimeRemaining === 0) {
                      Vibration.vibrate([0, 200, 100, 200]);
                      setShowRestCompleteToast(true);
                      setTimeout(() => {
                        setShowRestCompleteToast(false);
                      }, 2000);
                      setRestTimerActive(false);
                      restEndTimeRef.current = null;
                    }
                  }
                }}>
                <Text style={styles.restTimerAdjustText}>-15s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restTimerSkipButton}
                onPress={() => {
                  setRestTimerActive(false);
                  restEndTimeRef.current = null;
                }}>
                <Text style={styles.restTimerSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restTimerAdjustButton}
                onPress={() => {
                  const newTimeRemaining = Math.min(600, restTimeRemaining + 15);
                  setRestTimeRemaining(newTimeRemaining);
                  if (restTimerActive) {
                    // Update the end time reference so timer continues from adjusted time
                    restEndTimeRef.current = Date.now() + (newTimeRemaining * 1000);
                  }
                }}>
                <Text style={styles.restTimerAdjustText}>+15s</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Rest Complete Toast */}
        {showRestCompleteToast && (
          <View style={styles.restCompleteToast}>
            <Text style={styles.restCompleteTitle}>🎉 Rest Complete!</Text>
            <Text style={styles.restCompleteMessage}>Time to start your next set</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Exercises */}
          {activeWorkout.exercises.map((exercise) => {
            const previousSets = getPreviousWorkoutData(exercise.name);
            return (
              <Card key={exercise.id} style={styles.exerciseCard} shadow="small">
                  <View style={styles.exerciseHeader}>
                    <TouchableOpacity
                      onPress={() => showExerciseMenu(exercise.id, exercise.name)}
                      style={styles.dragHandle}
                      activeOpacity={0.7}>
                      <Text style={styles.dragHandleIcon}>☰</Text>
                    </TouchableOpacity>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>

              {/* Column Headers */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.setNumberColumn]}>Set</Text>
                <Text style={[styles.headerText, styles.previousColumn]}>Previous</Text>
                <Text style={[styles.headerText, styles.repsInputColumn]}>Reps</Text>
                <Text style={[styles.headerText, styles.weightInputColumn]}>Weight ({preferences.unitSystem})</Text>
                <View style={styles.strongCheckButton} />
              </View>

              {/* Sets */}
              {exercise.sets.map((set, index) => {
                const prevSet = previousSets && previousSets[index];
                const isSetValid = set.reps.trim() !== '' && set.weight.trim() !== '';
                return (
                  <View key={set.id}>
                    <Swipeable
                      renderRightActions={() => (
                        <View style={styles.swipeDeleteContainer}>
                          <Text style={styles.swipeDeleteText}>Delete</Text>
                        </View>
                      )}
                      onSwipeableOpen={() => removeSet(exercise.id, set.id)}
                      overshootRight={false}
                      friction={2}
                      rightThreshold={40}>
                      <View
                        style={[
                          styles.setRow,
                          set.completed && styles.setRowCompleted,
                        ]}>
                      {/* Set Number */}
                      <View style={styles.setNumberColumn}>
                        <Text style={styles.setNumber}>{index + 1}</Text>
                      </View>

                      {/* Previous Set Data */}
                      <TouchableOpacity
                        style={styles.previousColumn}
                        onPress={() => {
                          if (prevSet?.notes) {
                            setNoteText(prevSet.notes);
                            setIsViewingPreviousNote(true);
                            setShowNoteModal(true);
                          }
                        }}
                        disabled={!prevSet?.notes}
                        activeOpacity={prevSet?.notes ? 0.7 : 1}>
                        {prevSet && (
                          <View style={styles.previousDataContainer}>
                            <Text style={styles.previousData}>
                              {prevSet.reps} × {prevSet.weight}
                            </Text>
                            {prevSet.notes && <Text style={styles.previousNoteIcon}>📝</Text>}
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Reps Input */}
                      <View style={styles.repsInputColumn}>
                        <TextInput
                          ref={(ref) => {
                            inputRefs.current[`${exercise.id}-${set.id}-reps`] = ref;
                          }}
                          style={styles.strongInput}
                          value={set.reps}
                          onChangeText={(value) =>
                            updateSet(exercise.id, set.id, 'reps', value)
                          }
                          onFocus={() => handleSetInputFocus(exercise.id, set.id, 'reps')}
                          keyboardType="number-pad"
                          placeholder="10"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => handleMoveToNextField(exercise.id, set.id, 'reps')}
                          editable={!set.completed}
                        />
                      </View>

                      {/* Weight Input with +5 button only */}
                      <View style={styles.weightInputColumn}>
                        <TextInput
                          ref={(ref) => {
                            inputRefs.current[`${exercise.id}-${set.id}-weight`] = ref;
                          }}
                          style={styles.strongInput}
                          value={set.weight}
                          onChangeText={(value) =>
                            updateSet(exercise.id, set.id, 'weight', value)
                          }
                          onFocus={() => handleSetInputFocus(exercise.id, set.id, 'weight')}
                          keyboardType="number-pad"
                          placeholder="35"
                          placeholderTextColor={colors.textTertiary}
                          returnKeyType="done"
                          blurOnSubmit={false}
                          onSubmitEditing={() => {
                            if (isSetValid) {
                              toggleSetComplete(exercise.id, set.id);
                            }
                          }}
                          editable={!set.completed}
                        />

                        <TouchableOpacity
                          style={styles.strongAdjustButton}
                          onPress={() => openPlateCalculator(exercise.id, set.id, set.weight)}
                          disabled={set.completed}>
                          <Icon name="barbell-plates" size={20} color={set.completed ? colors.textTertiary : colors.primary} />
                        </TouchableOpacity>
                      </View>

                      {/* Checkmark */}
                      <TouchableOpacity
                        style={styles.strongCheckButton}
                        onPress={() => toggleSetComplete(exercise.id, set.id)}
                        disabled={!isSetValid && !set.completed}>
                        <View
                          style={[
                            styles.strongCheckbox,
                            set.completed && styles.strongCheckboxChecked,
                            !isSetValid && !set.completed && styles.strongCheckboxDisabled,
                          ]}>
                          {set.completed && <Text style={styles.strongCheckmark}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </Swipeable>

                  {/* Note Display - Outside Swipeable */}
                  {set.notes && (
                    <TouchableOpacity
                      style={styles.setNoteContainer}
                      onPress={() => openNoteModal(exercise.id, set.id)}
                      activeOpacity={0.7}>
                      <Text style={styles.setNoteIcon}>📝</Text>
                      <Text style={styles.setNoteText} numberOfLines={1}>
                        {set.notes}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSet(exercise.id)}>
                <Text style={styles.addSetButtonText}>+ Add Set</Text>
              </TouchableOpacity>
                </Card>
            );
          })}

          {/* Add Exercise Button */}
          <Button
            title="+ Add Exercise"
            variant="primary"
            onPress={addExercise}
            fullWidth
            style={styles.addExerciseButtonBottom}
          />
        </ScrollView>

        {/* Incomplete Set Modal */}
        <IncompleteSetModal
          visible={incompleteSetModalVisible}
          setCount={incompleteSetsCount}
          onComplete={handleCompleteAndFinish}
          onGoBack={() => setIncompleteSetModalVisible(false)}
          onCancel={handleCancelWorkoutFromModal}
        />

        {/* Cancel Workout Confirmation Dialog */}
        <ConfirmDialog
          visible={cancelWorkoutDialogVisible}
          title="Cancel Workout"
          message="Discard this workout? All progress will be lost."
          confirmText="Discard"
          cancelText="Go Back"
          onConfirm={handleConfirmCancelWorkout}
          onCancel={() => setCancelWorkoutDialogVisible(false)}
          confirmColor="error"
        />

        {/* Add Exercise Modal */}
        <AddExerciseModal
          visible={isAddExerciseModalVisible}
          onClose={() => setIsAddExerciseModalVisible(false)}
          onSelectExercise={handleSelectExercise}
        />

        {/* Set Default Rest Time Modal */}
        <Modal
          visible={showSetDefaultModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSetDefaultModal(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSetDefaultModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}>
              <View style={styles.setDefaultModal}>
                <Text style={styles.setDefaultTitle}>Set Default Rest Time</Text>
                <Text style={styles.setDefaultSubtitle}>
                  Enter time in seconds (e.g., 120 for 2:00)
                </Text>

                <TextInput
                  style={styles.setDefaultInput}
                  value={tempDefaultTime}
                  onChangeText={setTempDefaultTime}
                  keyboardType="number-pad"
                  placeholder="120"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  selectTextOnFocus
                />

                <Text style={styles.setDefaultPreview}>
                  Preview: {formatTime(parseInt(tempDefaultTime) || 0)}
                </Text>

                <View style={styles.quickTimeButtons}>
                  <TouchableOpacity
                    style={styles.quickTimeButton}
                    onPress={() => setTempDefaultTime('60')}>
                    <Text style={styles.quickTimeText}>1:00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickTimeButton}
                    onPress={() => setTempDefaultTime('90')}>
                    <Text style={styles.quickTimeText}>1:30</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickTimeButton}
                    onPress={() => setTempDefaultTime('120')}>
                    <Text style={styles.quickTimeText}>2:00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickTimeButton}
                    onPress={() => setTempDefaultTime('180')}>
                    <Text style={styles.quickTimeText}>3:00</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.setDefaultButtons}>
                  <TouchableOpacity
                    style={styles.cancelDefaultButton}
                    onPress={() => setShowSetDefaultModal(false)}>
                    <Text style={styles.cancelDefaultText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveDefaultButton}
                    onPress={() => {
                      const newDefault = parseInt(tempDefaultTime) || 120;
                      if (newDefault >= 10 && newDefault <= 600) {
                        saveCustomDefaultRestTime(newDefault);

                        // Update the active timer to use the new default
                        if (restTimerActive) {
                          setRestTimerDuration(newDefault);
                          setRestTimeRemaining(newDefault);
                        }

                        setShowSetDefaultModal(false);
                        Alert.alert(
                          'Default Updated',
                          `Rest timer default set to ${formatTime(newDefault)}`
                        );
                      } else {
                        Alert.alert(
                          'Invalid Time',
                          'Please enter a time between 10 and 600 seconds (10 minutes)'
                        );
                      }
                    }}>
                    <Text style={styles.saveDefaultText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Set Selection Modal */}
        <Modal
          visible={showSetSelectModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSetSelectModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.setSelectModal}>
              <Text style={styles.setSelectTitle}>Select a Set</Text>
              <Text style={styles.setSelectSubtitle}>
                Choose which set you want to add a note to
              </Text>

              <ScrollView style={styles.setSelectList}>
                {(() => {
                  if (!activeWorkout || !currentNoteExerciseId) {
                    return null;
                  }

                  const exercise = activeWorkout.exercises.find(ex => ex.id === currentNoteExerciseId);

                  if (!exercise) return null;

                  return exercise.sets.map((set, index) => (
                    <TouchableOpacity
                      key={set.id}
                      style={styles.setSelectItem}
                      onPress={() => openNoteModal(currentNoteExerciseId, set.id)}>
                      <View style={styles.setSelectInfo}>
                        <Text style={styles.setSelectNumber}>Set {index + 1}</Text>
                        {set.reps && set.weight && (
                          <Text style={styles.setSelectDetails}>
                            {set.reps} reps × {set.weight} {preferences.unitSystem}
                          </Text>
                        )}
                      </View>
                      {set.notes && <Text style={styles.setHasNote}>📝</Text>}
                    </TouchableOpacity>
                  ));
                })()}
              </ScrollView>

              <TouchableOpacity
                style={styles.setSelectCancelButton}
                onPress={() => {
                  setShowSetSelectModal(false);
                  setCurrentNoteExerciseId(null);
                }}>
                <Text style={styles.setSelectCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Note Modal */}
        <Modal
          visible={showNoteModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowNoteModal(false);
            setIsViewingPreviousNote(false);
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.noteModal}>
              <Text style={styles.noteModalTitle}>
                {isViewingPreviousNote ? 'Previous Note' : 'Set Note'}
              </Text>
              <Text style={styles.noteModalSubtitle}>
                {isViewingPreviousNote
                  ? 'Note from your last workout (read-only)'
                  : 'Add notes about how this set felt, any adjustments, or reminders for next time'}
              </Text>

              {isViewingPreviousNote ? (
                <View style={styles.noteReadOnlyContainer}>
                  <Text style={styles.noteReadOnlyText}>{noteText}</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="e.g., 'Felt easy, increase weight next time' or 'Right shoulder tight'"
                    placeholderTextColor={colors.textTertiary}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    autoFocus
                  />
                  <Text style={styles.noteCharCount}>{noteText.length}/200</Text>
                </>
              )}

              <View style={styles.noteModalButtons}>
                {isViewingPreviousNote ? (
                  <TouchableOpacity
                    style={[styles.noteSaveButton, { flex: 1 }]}
                    onPress={() => {
                      setShowNoteModal(false);
                      setIsViewingPreviousNote(false);
                      setNoteText('');
                    }}>
                    <Text style={styles.noteSaveText}>Close</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.noteCancelButton}
                      onPress={() => {
                        setShowNoteModal(false);
                        setNoteText('');
                        setCurrentNoteSetId(null);
                      }}>
                      <Text style={styles.noteCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    {noteText.trim() && (
                      <TouchableOpacity
                        style={styles.noteDeleteButton}
                        onPress={deleteNote}>
                        <Text style={styles.noteDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.noteSaveButton}
                      onPress={saveNote}>
                      <Text style={styles.noteSaveText}>Save</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Undo Toast */}
        {undoToast?.visible && (
          <Animated.View style={styles.undoToast}>
            <Text style={styles.undoToastText}>Set deleted</Text>
            <TouchableOpacity
              onPress={undoDeleteSetActive}
              style={styles.undoButton}>
              <Text style={styles.undoButtonText}>UNDO</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Voice Mic Button */}
        <VoiceMicButton
          onResult={handleVoiceResult}
          onError={(error) => console.error('Voice error:', error)}
        />
      </SafeAreaView>

      {/* Atlas Chat Modal - During Active Workout */}
      <Modal
        visible={showAtlasModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAtlasModal(false)}>
        <AtlasChatScreen
          onBack={() => setShowAtlasModal(false)}
          userEmail={userEmail}
        />
      </Modal>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={plateCalculatorVisible}
        currentWeight={plateCalculatorSet?.currentWeight || ''}
        unitSystem={preferences.unitSystem}
        onApply={applyCalculatorWeight}
        onClose={closePlateCalculator}
      />
      </>
    );
  }

  // Edit Workout View
  if (editingWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Workout</Text>
          </View>
          <TouchableOpacity onPress={handleSaveEdit} style={styles.finishButton}>
            <Text style={styles.finishButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Workout Name Input */}
          <View style={styles.workoutNameSection}>
            <Text style={styles.workoutNameLabel}>Workout Name</Text>
            <TextInput
              style={styles.workoutNameInput}
              value={editingWorkout.name}
              onChangeText={(value) => setEditingWorkout({ ...editingWorkout, name: value })}
              placeholder="Enter workout name"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Exercises */}
          {editingWorkout.exercises.map((exercise) => (
            <Card key={exercise.id} style={styles.exerciseCard} shadow="small">
              <TextInput
                style={styles.exerciseNameInput}
                value={exercise.name}
                onChangeText={(value) => updateEditingExerciseName(exercise.id, value)}
                placeholder="Exercise name"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Sets Table Header */}
              <View style={styles.setsHeader}>
                <Text style={[styles.setHeaderText, styles.setColumn]}>Set</Text>
                <Text style={[styles.setHeaderText, styles.repsColumn]}>Reps</Text>
                <Text style={[styles.setHeaderText, styles.weightColumn]}>Weight</Text>
                <View style={styles.checkColumn} />
              </View>

              {/* Sets */}
              {exercise.sets.map((set, index) => (
                <Swipeable
                  key={set.id}
                  renderRightActions={() => (
                    <View style={styles.swipeDeleteContainer}>
                      <Text style={styles.swipeDeleteText}>Delete</Text>
                    </View>
                  )}
                  onSwipeableOpen={() => removeEditingSet(exercise.id, set.id)}
                  overshootRight={false}
                  friction={2}
                  rightThreshold={40}>
                  <View style={styles.setRow}>
                    <Text style={[styles.setNumber, styles.setColumn]}>{index + 1}</Text>

                    <TextInput
                      style={[styles.setInput, styles.repsColumn]}
                      value={set.reps}
                      onChangeText={(value) =>
                        updateEditingSet(exercise.id, set.id, 'reps', value)
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />

                    <TextInput
                      style={[styles.setInput, styles.weightColumn]}
                      value={set.weight}
                      onChangeText={(value) =>
                        updateEditingSet(exercise.id, set.id, 'weight', value)
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />

                    <View style={styles.checkColumn} />
                  </View>
                </Swipeable>
              ))}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addEditingSet(exercise.id)}>
                <Text style={styles.addSetButtonText}>+ Add Set</Text>
              </TouchableOpacity>
            </Card>
          ))}

          {/* Add Exercise Button */}
          <Button
            title="+ Add Exercise"
            variant="primary"
            onPress={addEditingExercise}
            fullWidth
            style={styles.addExerciseButtonBottom}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Template List View
  return (
    <>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBack ? onBack() : navigation.navigate('Home' as never)} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workouts</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Strength Training Section */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="dumbbell" size={18} color={colors.textPrimary} />
            <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Strength Training</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <Button
            title="+ Add Workout"
            variant="primary"
            size="small"
            onPress={() => setIsAddModalVisible(true)}
            style={styles.addWorkoutButton}
          />
          <Button
            title="History"
            variant="outline"
            size="small"
            onPress={() => setIsHistoryModalVisible(true)}
            style={styles.historyButton}
            icon={<Icon name="clipboard" size={16} color={colors.primary} />}
          />
          <Button
            title="Categories"
            variant="outline"
            size="small"
            onPress={() => setIsManageCategoriesVisible(true)}
            style={styles.manageCategoriesButton}
          />
        </View>

        {/* Category Filter */}
        {categories.length > 0 && (
          <View style={styles.categoryFilter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilterContent}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.categoryChipTextActive,
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category: string) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category && styles.categoryChipTextActive,
                    ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Workout Templates - Grouped by Category */}
        <View style={styles.templatesContainer}>
          {getGroupedTemplates().map((group, groupIndex) => (
            <View key={group.category || 'uncategorized'} style={styles.templateGroup}>
              {/* Category Header (only show if category exists) */}
              {group.category && (
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLine} />
                  <Text style={styles.categoryHeaderText}>{group.category}</Text>
                  <View style={styles.categoryHeaderLine} />
                </View>
              )}

              {/* 2 Column Grid for Templates in this Category */}
              <View style={styles.templatesGrid}>
                {group.templates.map((template, index) => (
                  <TouchableOpacity
                    key={template.id}
                    activeOpacity={0.7}
                    style={index % 2 === 0 ? styles.templateCardLeft : styles.templateCardRight}
                    onPress={() => handleStartWorkout(template)}>
                    <Card shadow="small" style={styles.templateCardInner}>
                      <View style={styles.templateHeader}>
                        <Text style={styles.templateName} numberOfLines={1} ellipsizeMode="tail">{template.name}</Text>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setActiveMenuTemplate(activeMenuTemplate === template.id ? null : template.id);
                          }}
                          style={styles.menuButton}>
                          <Text style={styles.menuIcon}>⋯</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.templateExercises} numberOfLines={1} ellipsizeMode="tail">
                        {template.exercises.map(ex => ex.name).join(', ')}
                      </Text>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStartWorkout(template);
                        }}>
                        <Text style={styles.playButtonText}>▶</Text>
                      </TouchableOpacity>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Workout History */}
        {workoutHistory.length > 0 && (
          <Card style={styles.historyCard} shadow="small">
            <TouchableOpacity
              onPress={() => setHistoryExpanded(!historyExpanded)}
              activeOpacity={0.7}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Workout History</Text>
                <Text style={styles.expandIcon}>
                  {historyExpanded ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {historyExpanded && (
              <View style={styles.historyList}>
                {workoutHistory.map((workout) => (
                  <View key={workout.id} style={styles.historyItem}>
                    <TouchableOpacity
                      style={styles.historyItemLeft}
                      onPress={() => setSelectedWorkout(workout)}
                      activeOpacity={0.7}>
                      <Text style={styles.historyEmoji}>{workout.emoji}</Text>
                      <View style={styles.historyItemInfo}>
                        <Text style={styles.historyWorkoutName}>
                          {workout.templateName}
                        </Text>
                        <Text style={styles.historyDetails}>
                          {formatHistoryDate(workout.date)} • {workout.duration} min • {workout.exercises.length} exercises
                        </Text>
                      </View>
                      <Text style={styles.chevronIcon}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteHistory(workout.id)}
                      style={styles.deleteHistoryButton}>
                      <Text style={styles.deleteHistoryText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Add Workout Modal */}
      <AddWorkoutModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSave={handleAddWorkout}
        onSaveCardio={handleSaveCardio}
      />

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        visible={isManageCategoriesVisible}
        onClose={() => setIsManageCategoriesVisible(false)}
        categories={categories}
        onSaveCategories={saveCategories}
      />

      {/* Workout History Modal */}
      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsHistoryModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Workout History</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
            {workoutHistory.length > 0 ? (
              workoutHistory.map((history) => (
                <Card key={history.id} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Text style={{ fontSize: 24 }}>{history.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={{ ...typography.h4, color: colors.textPrimary }}>{history.templateName}</Text>
                      <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                        {history.date} • {history.duration} min
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      setSelectedWorkout(history);
                      setIsHistoryModalVisible(false);
                    }}>
                      <Text style={{ ...typography.body, color: colors.primary }}>View</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    {history.exercises.length} exercises • {history.exercises.reduce((total, ex) => total + ex.sets.filter(s => s.completed).length, 0)} sets completed
                  </Text>
                </Card>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Icon name="dumbbell" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.sm }} />
                <Text style={{ ...typography.body, color: colors.textSecondary }}>No workouts yet</Text>
                <Text style={{ ...typography.bodySmall, color: colors.textTertiary }}>Complete your first workout to see it here!</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={isAddExerciseModalVisible}
        onClose={() => setIsAddExerciseModalVisible(false)}
        onSelectExercise={handleSelectExercise}
      />

      {/* Workout Completion Modal */}
      <WorkoutCompletionModal
        visible={showCompletionModal && !!completionData}
        workoutName={completionData?.workoutName || ''}
        emoji={completionData?.emoji || ''}
        duration={completionData?.duration || 0}
        totalSets={completionData?.totalSets || 0}
        totalVolume={completionData?.totalVolume || 0}
        prs={workoutPRs}
        comparisonMessage={completionData?.comparisonMessage}
        unitSystem={preferences.unitSystem}
        onClose={handleCloseCompletionModal}
        onShare={handleShareWorkout}
      />

      {/* Update Template Modal */}
      <Modal
        visible={showUpdateTemplateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleKeepOriginalTemplate}>
        <View style={styles.modalOverlay}>
          <View style={styles.updateTemplateModal}>
            <Text style={styles.updateTemplateTitle}>Save Changes to Template?</Text>
            <Text style={styles.updateTemplateSubtitle}>
              You made changes during your workout:
            </Text>

            {templateChanges.map((change, index) => (
              <View key={index} style={styles.changeItem}>
                <Text style={styles.changeBullet}>•</Text>
                <Text style={styles.changeText}>{change}</Text>
              </View>
            ))}

            <View style={styles.updateTemplateButtons}>
              <TouchableOpacity
                style={styles.keepOriginalButton}
                onPress={handleKeepOriginalTemplate}>
                <Text style={styles.keepOriginalText}>Keep Original</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleUpdateTemplate}>
                <Text style={styles.updateButtonText}>Update Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Menu Modal */}
      <Modal
        visible={activeMenuTemplate !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveMenuTemplate(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveMenuTemplate(null)}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              onPress={() => {
                const template = templates.find(t => t.id === activeMenuTemplate);
                if (template) {
                  setActiveMenuTemplate(null);
                  handleStartWorkout(template);
                }
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>Start Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const template = templates.find(t => t.id === activeMenuTemplate);
                if (template) {
                  setActiveMenuTemplate(null);
                  handleEditWorkout(template);
                }
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (activeMenuTemplate) {
                  setActiveMenuTemplate(null);
                  handleDeleteTemplate(activeMenuTemplate);
                }
              }}
              style={[styles.menuItem, styles.menuItemDanger]}>
              <Text style={styles.menuItemTextDanger}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Undo Toast */}
      {undoToast?.visible && (
        <Animated.View style={styles.undoToast}>
          <Text style={styles.undoToastText}>Set deleted</Text>
          <TouchableOpacity
            onPress={undoDeleteSet}
            style={styles.undoButton}>
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
        </SafeAreaView>

        {/* Atlas Chat Modal - Rendered at root level to overlay all views */}
        <Modal
          visible={showAtlasModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowAtlasModal(false);
          }}>
          <AtlasChatScreen
            onBack={() => {
              setShowAtlasModal(false);
            }}
            userEmail={userEmail}
          />
        </Modal>

        {/* Simple Workout Detail Modal */}
        <SimpleWorkoutDetailModal
          visible={selectedWorkout !== null}
          workout={selectedWorkout}
          unitSystem={preferences.unitSystem}
          allWorkouts={workoutHistory}
          onClose={() => setSelectedWorkout(null)}
        />
      </>
    );
  }

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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.primary,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  finishButton: {
    padding: spacing.sm,
  },
  finishButtonText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  templatesContainer: {
    marginBottom: spacing.lg,
  },
  templateGroup: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  categoryHeaderText: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  categoryHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  templateCard: {
    width: '100%',
    padding: spacing.lg,
    position: 'relative',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  templateCardLeft: {
    width: '48%',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  templateCardRight: {
    width: '48%',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  templateCardInner: {
    paddingBottom: spacing.xl * 2,
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonText: {
    fontSize: 16,
    color: colors.textInverse,
    marginLeft: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  templateName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.xs,
    fontSize: 16,
    lineHeight: 20,
  },
  templateExercises: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  menuButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  menuIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  menuDropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 140,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  menuItemTextDanger: {
    ...typography.body,
    fontSize: 14,
    color: colors.error,
    fontWeight: '400',
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontSize: 15,
  },
  actionButtonTextSecondary: {
    ...typography.button,
    color: colors.textPrimary,
    fontSize: 15,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.xl * 1.5,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addWorkoutButtonTop: {
    marginBottom: spacing.md,
  },
  addExerciseButtonBottom: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  exerciseCard: {
    marginBottom: spacing.md,
    marginHorizontal: 0,
    borderRadius: 0,
  },
  exerciseNameInput: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    textTransform: 'capitalize',
  },
  exerciseName: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
    flex: 1,
    textAlign: 'center',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dragHandle: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  dragHandleIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    opacity: 0.6,
  },
  swipeDeleteContainer: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: spacing.md,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  swipeDeleteButton: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteExerciseButton: {
    padding: spacing.xs,
  },
  deleteExerciseText: {
    fontSize: 32,
    color: colors.error,
    fontWeight: '300',
  },
  setsHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  setHeaderText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  setRowCompleted: {
    opacity: 0.5,
    backgroundColor: colors.success + '10',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  copyButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  copyButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weightInput: {
    flex: 1,
  },
  adjustButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minWidth: 40,
  },
  adjustButtonText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  previousSetHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 48,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  setColumn: {
    width: 40,
  },
  prevColumn: {
    width: 70,
  },
  repsColumn: {
    width: 70,
  },
  weightColumn: {
    width: 70,
  },
  checkColumn: {
    width: 40,
    alignItems: 'center',
  },
  deleteColumn: {
    width: 40,
    alignItems: 'center',
  },
  previousDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  previousData: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  previousNoteIcon: {
    fontSize: 10,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  setInput: {
    ...typography.body,
    fontSize: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    color: colors.textPrimary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkButton: {
    padding: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxDisabled: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.border,
    opacity: 0.3,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  addSetButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addSetButtonText: {
    ...typography.label,
    color: colors.primary,
  },
  historyCard: {
    marginTop: spacing.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  historyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  historyList: {
    marginTop: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceDark,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyWorkoutName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  historyDetails: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chevronIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  deleteHistoryButton: {
    padding: spacing.sm,
  },
  deleteHistoryText: {
    fontSize: 28,
    color: colors.error,
    fontWeight: '300',
  },
  deleteTemplateButton: {
    padding: spacing.sm,
  },
  deleteTemplateText: {
    fontSize: 32,
    color: colors.error,
    fontWeight: '300',
  },
  // Strong-style table layout
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  headerText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setNumberColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repsInputColumn: {
    width: 80,
    alignItems: 'center',
  },
  weightInputColumn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  strongInput: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    minWidth: 60,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  strongAdjustButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  strongAdjustButtonText: {
    ...typography.bodySmall,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  strongCheckButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  setNoteIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  setNoteText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  noteButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: {
    fontSize: 18,
    opacity: 0.4,
  },
  noteIconActive: {
    opacity: 1,
  },
  strongCheckbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  strongCheckboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  strongCheckboxDisabled: {
    borderColor: colors.textTertiary + '40',
  },
  strongCheckmark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  setNumber: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // Rest Timer styles
  restTimerBanner: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  restTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  restTimerContent: {
    alignItems: 'center',
    flex: 1,
  },
  disableTimerButton: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  disableTimerText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  timerDisabledBanner: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  timerDisabledText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timerDisabledSubtext: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  restTimerLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
  },
  restTimerTime: {
    ...typography.h1,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  restTimerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  restTimerAdjustButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minWidth: 50,
    alignItems: 'center',
  },
  restTimerAdjustText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  restTimerSkipButton: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  restTimerSkipText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  // Rest Complete Toast styles
  restCompleteToast: {
    position: 'absolute',
    top: '40%',
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.success,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
    zIndex: 1000,
  },
  restCompleteTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  restCompleteMessage: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryFilter: {
    marginBottom: spacing.md,
  },
  categoryFilterContent: {
    paddingVertical: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.label,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.textInverse,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  addWorkoutButton: {
    flex: 1,
    maxHeight: 44,
  },
  historyButton: {
    flex: 0.7,
    maxHeight: 44,
  },
  manageCategoriesButton: {
    flex: 0.85,
    maxHeight: 44,
  },
  workoutNameSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  workoutNameLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
  },
  workoutNameInput: {
    ...typography.h4,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Update Template Modal styles
  updateTemplateModal: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    maxWidth: 400,
    alignSelf: 'center',
    ...shadows.large,
  },
  updateTemplateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  updateTemplateSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  changeItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  changeBullet: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  changeText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  updateTemplateButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  keepOriginalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  keepOriginalText: {
    ...typography.button,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  updateButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  setSelectModal: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    maxWidth: 400,
    maxHeight: '70%',
    alignSelf: 'center',
    ...shadows.large,
    zIndex: 10000,
    elevation: 10,
  },
  setSelectTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  setSelectSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  setSelectList: {
    maxHeight: 300,
  },
  setSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setSelectInfo: {
    flex: 1,
  },
  setSelectNumber: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  setSelectDetails: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  setHasNote: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  setSelectCancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  setSelectCancelText: {
    ...typography.button,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  noteModal: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    maxWidth: 400,
    alignSelf: 'center',
    ...shadows.large,
    zIndex: 10000,
    elevation: 10,
  },
  noteModalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noteModalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteCharCount: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  noteModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  noteCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  noteCancelText: {
    ...typography.button,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  noteSaveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  noteSaveText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noteDeleteButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  noteDeleteText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noteReadOnlyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 100,
  },
  noteReadOnlyText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  // Undo toast styles
  undoToast: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.medium,
  },
  undoToastText: {
    ...typography.body,
    color: '#FFFFFF',
    flex: 1,
  },
  undoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  undoButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  // Set Default Rest Time Modal styles
  setDefaultModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    ...shadows.large,
  },
  setDefaultTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  setDefaultSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  setDefaultInput: {
    ...typography.h2,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  setDefaultPreview: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  quickTimeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickTimeButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  quickTimeText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  setDefaultButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelDefaultButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelDefaultText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveDefaultButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveDefaultText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // History Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    fontSize: 24,
    color: colors.textPrimary,
    width: 40,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});

export default WorkoutScreen;