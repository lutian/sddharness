// src/ui/theme/useTheme.js — hook de consumo do contexto de tema.
import { useContext } from "react";

import { ThemeContext } from "./ThemeProvider.jsx";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
}
