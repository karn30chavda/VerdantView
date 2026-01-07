/**
 * Site Configuration
 * Contains site metadata, navigation, and general app settings
 */

export const siteConfig = {
  name: "VerdantView",
  description: "Your personal expense tracking companion",
  version: "1.0.0",

  // Navigation items
  navigation: {
    main: [
      { name: "Dashboard", href: "/", icon: "LayoutDashboard" },
      { name: "Expenses", href: "/expenses", icon: "Receipt" },
      { name: "Statistics", href: "/statistics", icon: "BarChart3" },
      { name: "Reminders", href: "/reminders", icon: "Bell" },
      { name: "Savings", href: "/savings", icon: "PiggyBank" },
      { name: "Scan", href: "/scan", icon: "ScanLine" },
      { name: "Settings", href: "/settings", icon: "Settings" },
    ],
  },

  // Default settings
  defaults: {
    currency: "₹",
    dateFormat: "dd/MM/yyyy",
    theme: "system",
  },

  // Feature flags
  features: {
    aiCategoryPrediction: true,
    expenseScanning: true,
    cloudSync: false, // Premium feature
    bulkImport: true,
  },
} as const;

export type SiteConfig = typeof siteConfig;
