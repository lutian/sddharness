// src/ui/components/Navbar.jsx — barra de navegação base.

export function Navbar({ children, className }) {
  const classes = className ? `navbar ${className}` : "navbar";

  return <nav className={classes}>{children}</nav>;
}
