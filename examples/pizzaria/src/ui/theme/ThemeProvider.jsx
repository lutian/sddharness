// src/ui/theme/ThemeProvider.jsx — contexto React de tema claro/escuro.
import { createContext, useEffect, useState } from "react";

import { getStoredTheme, setStoredTheme } from "./theme-storage.js";

export const ThemeContext = createContext(undefined);

export function ThemeProvider({ children, defaultTheme = "dark" }) {
  const [theme, setThemeState] = useState(() => getStoredTheme() ?? defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    const oppositeTheme = theme === "dark" ? "light" : "dark";
    root.classList.remove(oppositeTheme);
    root.classList.add(theme);
  }, [theme]);

  function setTheme(novoTema) {
    setThemeState(novoTema);
    setStoredTheme(novoTema);
  }

  function toggleTheme() {
    const novoTema = theme === "dark" ? "light" : "dark";
    setTheme(novoTema);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
