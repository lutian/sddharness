// src/ui/theme/theme-storage.js — leitura/escrita da preferência de tema
// em localStorage.

export const THEME_STORAGE_KEY = "pizzaria-theme";

export function getStoredTheme() {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function setStoredTheme(theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
