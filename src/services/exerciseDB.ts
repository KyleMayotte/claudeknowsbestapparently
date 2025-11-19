import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// ExerciseDB API Configuration
const RAPIDAPI_KEY = Config.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_KEY_PREFIX = '@muscleup/exercisedb_';

export type ExerciseType = 'compound' | 'isolation' | 'cardio' | 'custom';

export interface ExerciseDBExercise {
  id: string;
  name: string;
  gifUrl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  instructions?: string[];
  exerciseType?: ExerciseType; // Auto-classified based on bodyPart and equipment
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Get data from cache
 */
async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cachedString = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cachedString) return null;

    const cached: CachedData<T> = JSON.parse(cachedString);
    if (isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Cache expired, remove it
    await AsyncStorage.removeItem(CACHE_KEY_PREFIX + key);
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Save data to cache
 */
async function saveToCache<T>(key: string, data: T): Promise<void> {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cached));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

/**
 * Classify exercise type based on bodyPart, target, and equipment
 */
function classifyExerciseType(exercise: ExerciseDBExercise): ExerciseType {
  const { bodyPart, equipment, target, name } = exercise;
  const nameLower = name.toLowerCase();

  // Cardio equipment or cardio body part
  const cardioEquipment = ['elliptical machine', 'stationary bike', 'treadmill', 'rowing machine', 'ski erg machine', 'air bike'];
  const cardioKeywords = ['run', 'jog', 'walk', 'bike', 'cycle', 'row', 'jump rope', 'burpee', 'mountain climber'];

  if (bodyPart === 'cardio' || cardioEquipment.includes(equipment) || cardioKeywords.some(kw => nameLower.includes(kw))) {
    return 'cardio';
  }

  // Compound exercises - multi-joint movements
  const compoundPatterns = [
    // Specific exercise names
    'squat', 'deadlift', 'bench press', 'overhead press', 'military press',
    'pull up', 'pull-up', 'chin up', 'chin-up', 'dip', 'row', 'lunge',
    'clean', 'snatch', 'thruster', 'push press',

    // Body parts that typically indicate compound movements
  ];

  // Check if it's a compound exercise by name
  if (compoundPatterns.some(pattern => nameLower.includes(pattern))) {
    return 'compound';
  }

  // Multi-joint movements based on body part combinations
  const compoundBodyParts = ['back', 'upper legs', 'lower legs'];
  const compoundTargets = ['glutes', 'hamstrings', 'quads', 'lats', 'traps'];

  if (compoundBodyParts.includes(bodyPart) || compoundTargets.includes(target)) {
    // Most back and leg exercises are compound
    return 'compound';
  }

  // Chest exercises with barbell or body weight are typically compound
  if (bodyPart === 'chest' && (equipment === 'barbell' || equipment === 'body weight')) {
    return 'compound';
  }

  // Shoulder exercises with barbell or multi-target are compound
  if (bodyPart === 'shoulders' && equipment === 'barbell') {
    return 'compound';
  }

  // Everything else is isolation (arms, shoulders with dumbbells, cable exercises, etc.)
  return 'isolation';
}

/**
 * Make API request to ExerciseDB
 */
async function makeRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Search exercises by name
 * @param query - Search query
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of exercises matching the query
 */
export async function searchExercises(
  query: string,
  limit: number = 10
): Promise<ExerciseDBExercise[]> {
  if (!query.trim()) return [];

  const cacheKey = `search_${query.toLowerCase()}_${limit}`;

  // Try to get from cache first
  const cached = await getFromCache<ExerciseDBExercise[]>(cacheKey);
  if (cached) {
    console.log('Using cached exercise search results');
    return cached;
  }

  try {
    // Fetch all exercises and filter by name (ExerciseDB doesn't have direct search)
    const allExercises = await makeRequest<ExerciseDBExercise[]>('/exercises');

    // Filter by name (case insensitive) and add exerciseType classification
    const filtered = allExercises
      .filter(ex => ex.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map(ex => ({
        ...ex,
        exerciseType: classifyExerciseType(ex),
      }));

    // Cache the results
    await saveToCache(cacheKey, filtered);

    return filtered;
  } catch (error) {
    console.error('Error searching exercises:', error);
    return [];
  }
}

/**
 * Get exercise by ID
 * @param id - Exercise ID
 * @returns Exercise details with instructions
 */
export async function getExerciseById(id: string): Promise<ExerciseDBExercise | null> {
  const cacheKey = `exercise_${id}`;

  // Try to get from cache first
  const cached = await getFromCache<ExerciseDBExercise>(cacheKey);
  if (cached) {
    console.log('Using cached exercise details');
    return cached;
  }

  try {
    const exercise = await makeRequest<ExerciseDBExercise>(`/exercises/exercise/${id}`);

    // Add exerciseType classification
    const classified = {
      ...exercise,
      exerciseType: classifyExerciseType(exercise),
    };

    // Cache the result
    await saveToCache(cacheKey, classified);

    return classified;
  } catch (error) {
    console.error('Error fetching exercise details:', error);
    return null;
  }
}

/**
 * Get exercises by body part
 * @param bodyPart - Body part (e.g., 'chest', 'back', 'legs')
 * @returns Array of exercises for the specified body part
 */
export async function getExercisesByBodyPart(bodyPart: string): Promise<ExerciseDBExercise[]> {
  const cacheKey = `bodypart_${bodyPart.toLowerCase()}`;

  // Try to get from cache first
  const cached = await getFromCache<ExerciseDBExercise[]>(cacheKey);
  if (cached) {
    console.log('Using cached body part exercises');
    return cached;
  }

  try {
    const exercises = await makeRequest<ExerciseDBExercise[]>(`/exercises/bodyPart/${bodyPart}`);

    // Add exerciseType classification
    const classified = exercises.map(ex => ({
      ...ex,
      exerciseType: classifyExerciseType(ex),
    }));

    // Cache the results
    await saveToCache(cacheKey, classified);

    return classified;
  } catch (error) {
    console.error('Error fetching exercises by body part:', error);
    return [];
  }
}

/**
 * Get list of all available body parts
 * @returns Array of body part names
 */
export async function getBodyPartList(): Promise<string[]> {
  const cacheKey = 'bodypart_list';

  // Try to get from cache first
  const cached = await getFromCache<string[]>(cacheKey);
  if (cached) {
    console.log('Using cached body part list');
    return cached;
  }

  try {
    const bodyParts = await makeRequest<string[]>('/exercises/bodyPartList');

    // Cache the results
    await saveToCache(cacheKey, bodyParts);

    return bodyParts;
  } catch (error) {
    console.error('Error fetching body part list:', error);
    return [];
  }
}

/**
 * Clear all cached exercise data
 */
export async function clearExerciseCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const exerciseKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(exerciseKeys);
    console.log('Exercise cache cleared');
  } catch (error) {
    console.error('Error clearing exercise cache:', error);
  }
}
