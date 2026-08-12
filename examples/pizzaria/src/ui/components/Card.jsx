// src/ui/components/Card.jsx — contêiner visual com o estilo "glass-card".

export function Card({ children, className }) {
  const classes = className ? `glass-card ${className}` : "glass-card";

  return <div className={classes}>{children}</div>;
}
