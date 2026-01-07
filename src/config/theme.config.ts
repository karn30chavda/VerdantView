/**
 * Theme Configuration
 * Contains theme-related settings and color schemes
 */

export const themeConfig = {
  // Available themes
  themes: ["light", "dark", "system"] as const,

  // Default theme
  defaultTheme: "system" as const,

  // Color schemes
  colors: {
    primary: {
      light: "hsl(142, 76%, 36%)",
      dark: "hsl(142, 76%, 36%)",
    },
    background: {
      light: "hsl(0, 0%, 100%)",
      dark: "hsl(222.2, 84%, 4.9%)",
    },
  },
} as const;

export type ThemeConfig = typeof themeConfig;
export type Theme = (typeof themeConfig.themes)[number];
