// src/ui/components/Badge.jsx — rótulo colorido derivado dos tokens de cor.

const VARIANT_CLASSES = {
  default: "badge-default",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
};

export function Badge({ children, variant = "default", className }) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;
  const classes = className ? `${variantClass} ${className}` : variantClass;

  return <span className={classes}>{children}</span>;
}
