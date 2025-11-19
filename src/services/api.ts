// API Base Configuration
// This service is kept for potential future backend integration
// Currently unused - app uses AsyncStorage for all data storage

const API_BASE_URL = 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, headers, ...restOptions } = options;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    };

    try {
      // Add timeout to prevent hanging forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      // Handle timeout and network errors - fallback to local storage
      if (
        error.name === 'AbortError' ||
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('timeout')
      ) {
        // Silent fail for network errors - hooks will use cached data
        throw new Error('Network unavailable');
      }

      // Silent fail - app works offline with Firebase
      // Error still thrown for proper error handling, just no console spam
      throw error;
    }
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  async post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async put<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }

  async postFormData<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    try {
      // Add timeout to prevent hanging forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const config: RequestInit = {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      // Handle timeout and network errors - fallback to local storage
      if (
        error.name === 'AbortError' ||
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('timeout')
      ) {
        // Silent fail for network errors - hooks will use cached data
        throw new Error('Network unavailable');
      }

      // Silent fail - app works offline with Firebase
      // Error still thrown for proper error handling, just no console spam
      throw error;
    }
  }
}

export default new ApiService();
export const API_URL = API_BASE_URL;
