// Workout Service
// Handles workout templates, sessions, and exercise search

import api from './api';

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  recommendedSets?: number;
  recommendedReps?: string;
  weight?: number;
}

export interface WorkoutTemplate {
  _id?: string;
  userEmail: string;
  name: string;
  category?: string; // e.g., "Push Pull Legs", "5 Day Split", "10 Week Program"
  exercises: Exercise[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutSession {
  _id?: string;
  userEmail: string;
  templateId: string;
  templateName: string;
  exercises: Exercise[];
  date: string;
  duration?: number;
}

export interface ExerciseSearchResult {
  name: string;
  muscle: string;
  equipment: string;
  difficulty: string;
}

export interface AIWorkoutPlanInput {
  goal: string;
  experience: string;
  daysPerWeek: number;
  equipment: string;
  limitations?: string;
  preferences?: string;
  currentPlan?: WorkoutTemplate[];
  userFeedback?: string;
}

class WorkoutService {
  /**
   * Get all workout templates for the user
   */
  async getTemplates(userEmail: string, token: string): Promise<WorkoutTemplate[]> {
    try {
      const response = await api.get<WorkoutTemplate[]>(
        `/templates?userEmail=${userEmail}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single workout template by ID
   */
  async getTemplate(id: string, token: string): Promise<WorkoutTemplate> {
    try {
      const response = await api.get<WorkoutTemplate>(`/templates?id=${id}`, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new workout template
   */
  async createTemplate(template: WorkoutTemplate, token: string): Promise<WorkoutTemplate> {
    try {
      const response = await api.post<WorkoutTemplate>('/templates', template, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing workout template
   */
  async updateTemplate(id: string, template: Partial<WorkoutTemplate>, token: string): Promise<WorkoutTemplate> {
    try {
      const response = await api.put<WorkoutTemplate>(
        `/templates?id=${id}`,
        template,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a workout template
   */
  async deleteTemplate(id: string, token: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<{ message: string }>(
        `/templates?id=${id}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workout sessions
   */
  async getSessions(userEmail: string, templateId?: string, token?: string): Promise<WorkoutSession[]> {
    try {
      let url = `/sessions?userEmail=${userEmail}`;
      if (templateId) {
        url += `&templateId=${templateId}`;
      }
      const response = await api.get<WorkoutSession[]>(url, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new workout session (log completed workout)
   */
  async createSession(session: WorkoutSession, token: string): Promise<WorkoutSession> {
    try {
      const response = await api.post<WorkoutSession>('/sessions', session, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search exercises by name
   */
  async searchExercises(query: string, token?: string): Promise<ExerciseSearchResult[]> {
    try {
      const response = await api.get<ExerciseSearchResult[]>(
        `/exercise-search?name=${encodeURIComponent(query)}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get AI-generated workout name suggestions
   */
  async getWorkoutNameSuggestions(query: string, token?: string): Promise<string[]> {
    try {
      const response = await api.get<string[]>(
        `/workout-name-suggestions?query=${encodeURIComponent(query)}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate AI workout plan
   */
  async generateWorkoutPlan(input: AIWorkoutPlanInput, token: string): Promise<WorkoutTemplate[]> {
    try {
      const response = await api.post<WorkoutTemplate[]>(
        '/generate-workout-plan',
        input,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log a custom workout (type, name, value)
   */
  async logWorkout(data: {
    userEmail: string;
    type: string;
    name: string;
    value?: number;
    date?: string;
  }, token: string): Promise<any> {
    try {
      const response = await api.post('/workouts', data, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get logged workouts
   */
  async getWorkouts(userEmail: string, token: string): Promise<any[]> {
    try {
      const response = await api.get<any[]>(
        `/workouts?userEmail=${userEmail}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new WorkoutService();
