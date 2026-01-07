/**
 * API Endpoints
 * Centralized API endpoint definitions
 */

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    register: "/users/register",
    login: "/users/login",
    logout: "/users/logout",
    me: "/users/me",
  },

  // Expense endpoints
  expenses: {
    list: "/expenses",
    create: "/expenses",
    get: (id: string) => `/expenses/${id}`,
    update: (id: string) => `/expenses/${id}`,
    delete: (id: string) => `/expenses/${id}`,
    bulk: "/expenses/bulk",
  },

  // Category endpoints
  categories: {
    list: "/categories",
    create: "/categories",
    get: (id: string) => `/categories/${id}`,
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },

  // Reminder endpoints
  reminders: {
    list: "/reminders",
    create: "/reminders",
    get: (id: string) => `/reminders/${id}`,
    update: (id: string) => `/reminders/${id}`,
    delete: (id: string) => `/reminders/${id}`,
  },

  // Savings endpoints
  savings: {
    list: "/savings",
    create: "/savings",
    get: (id: string) => `/savings/${id}`,
    update: (id: string) => `/savings/${id}`,
    delete: (id: string) => `/savings/${id}`,
  },

  // Settings endpoints
  settings: {
    get: "/settings",
    update: "/settings",
  },

  // Premium/Subscription endpoints
  subscription: {
    status: "/subscription/status",
    create: "/subscription/create",
    verify: "/subscription/verify",
  },

  // Sync endpoints
  sync: {
    upload: "/sync/upload",
    download: "/sync/download",
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
