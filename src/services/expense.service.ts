/**
 * Expense Service
 * Handles all expense-related business logic and API calls
 */

import { apiClient, API_ENDPOINTS } from "@/lib/api";
import type { Expense } from "@/lib/types";

export const expenseService = {
  /**
   * Get all expenses
   */
  async getAll(): Promise<Expense[]> {
    const response = await apiClient.get<Expense[]>(
      API_ENDPOINTS.expenses.list
    );
    return response.data || [];
  },

  /**
   * Get a single expense by ID
   */
  async getById(id: string): Promise<Expense | null> {
    const response = await apiClient.get<Expense>(
      API_ENDPOINTS.expenses.get(id)
    );
    return response.data || null;
  },

  /**
   * Create a new expense
   */
  async create(expense: Omit<Expense, "id">): Promise<Expense | null> {
    const response = await apiClient.post<Expense>(
      API_ENDPOINTS.expenses.create,
      expense
    );
    return response.data || null;
  },

  /**
   * Update an existing expense
   */
  async update(id: string, expense: Partial<Expense>): Promise<Expense | null> {
    const response = await apiClient.put<Expense>(
      API_ENDPOINTS.expenses.update(id),
      expense
    );
    return response.data || null;
  },

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<boolean> {
    const response = await apiClient.delete(API_ENDPOINTS.expenses.delete(id));
    return response.success;
  },

  /**
   * Bulk create expenses
   */
  async bulkCreate(expenses: Omit<Expense, "id">[]): Promise<Expense[]> {
    const response = await apiClient.post<Expense[]>(
      API_ENDPOINTS.expenses.bulk,
      { expenses }
    );
    return response.data || [];
  },

  /**
   * Get expenses by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const response = await apiClient.get<Expense[]>(
      `${
        API_ENDPOINTS.expenses.list
      }?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    return response.data || [];
  },

  /**
   * Get expenses by category
   */
  async getByCategory(category: string): Promise<Expense[]> {
    const response = await apiClient.get<Expense[]>(
      `${API_ENDPOINTS.expenses.list}?category=${category}`
    );
    return response.data || [];
  },
};
