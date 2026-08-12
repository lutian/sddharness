// src/ui/components/ThemeToggle.jsx — botão que alterna o tema claro/escuro.
import { useTheme } from "../theme/useTheme.js";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme} aria-label="Alternar tema claro/escuro">
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
