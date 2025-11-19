// Goals Service
// Handles user fitness goals and AI recommendations

import api from './api';

export type WeightGoalType = 'lose' | 'gain' | 'maintain';

export interface UserGoals {
  _id?: string;
  userEmail: string;
  weeklyWorkouts?: number;
  currentWeight?: number;
  targetWeight?: number;
  weightGoalType?: WeightGoalType;
  deadline?: string;
  updatedAt?: string;
}

export interface GoalRecommendation {
  deadline: string;
  reasoning: string;
}

export interface GoalRecommendationInput {
  currentWeight: number;
  targetWeight: number;
  weightGoalType: WeightGoalType;
  weeklyWorkouts: number;
}

class GoalsService {
  /**
   * Get user's goals
   */
  async getGoals(userEmail: string, token: string): Promise<UserGoals> {
    try {
      const response = await api.get<UserGoals>(
        `/goals?userEmail=${userEmail}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save or update user's goals
   */
  async saveGoals(goals: UserGoals, token: string): Promise<UserGoals> {
    try {
      const response = await api.post<UserGoals>('/goals', goals, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get AI-generated goal recommendations
   */
  async getRecommendations(
    input: GoalRecommendationInput,
    token: string
  ): Promise<GoalRecommendation> {
    try {
      const response = await api.post<GoalRecommendation>(
        '/recommend-goals',
        input,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new GoalsService();
