// Progress Service
// Handles weight tracking and progress monitoring

import api from './api';

export interface WeightEntry {
  _id?: string;
  userEmail: string;
  weight: number;
  date: string;
  createdAt?: string;
}

class ProgressService {
  /**
   * Get all weight entries for a user
   */
  async getWeightEntries(userEmail: string, token: string): Promise<WeightEntry[]> {
    try {
      const response = await api.get<WeightEntry[]>(
        `/weight?userEmail=${userEmail}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a weight entry
   */
  async addWeightEntry(entry: WeightEntry, token: string): Promise<WeightEntry> {
    try {
      const response = await api.post<WeightEntry>('/weight', entry, token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a weight entry
   */
  async deleteWeightEntry(id: string, token: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<{ message: string }>(
        `/weight?id=${id}`,
        token
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new ProgressService();
