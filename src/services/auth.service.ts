/**
 * Authentication Service
 * Handles user authentication and authorization
 */

import { apiClient, API_ENDPOINTS } from "@/lib/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isPremium?: boolean;
  subscriptionEndDate?: string;
}

export const authService = {
  /**
   * Register a new user
   */
  async register(
    data: RegisterData
  ): Promise<{ user: User; token: string } | null> {
    const response = await apiClient.post<{ user: User; token: string }>(
      API_ENDPOINTS.auth.register,
      data
    );

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      return response.data;
    }

    return null;
  },

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; token: string } | null> {
    const response = await apiClient.post<{ user: User; token: string }>(
      API_ENDPOINTS.auth.login,
      credentials
    );

    if (response.success && response.data) {
      apiClient.setAuthToken(response.data.token);
      return response.data;
    }

    return null;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.auth.logout);
    apiClient.clearAuthToken();
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await apiClient.get<User>(API_ENDPOINTS.auth.me);
    return response.data || null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("authToken");
  },

  /**
   * Get auth token
   */
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  },
};
