// src/ui/components/Button.jsx — botão base com variantes de estilo.

const VARIANT_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

export function Button({
  children,
  variant = "primary",
  className,
  onClick,
  disabled,
  type,
  ...rest
}) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
  const classes = className ? `${variantClass} ${className}` : variantClass;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
