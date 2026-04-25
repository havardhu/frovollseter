// Frovollseter — Shared UI Primitives
// Exports: Card, CardHeader, CardContent, Badge, Button, Input, Label

const { useState } = React;

// ─── Card ─────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }) {
  return (
    <div className={"frv-card " + className} style={style}>
      {children}
    </div>
  );
}
function CardHeader({ children, className = "" }) {
  return <div className={"frv-card-header " + className}>{children}</div>;
}
function CardContent({ children, className = "" }) {
  return <div className={"frv-card-content " + className}>{children}</div>;
}

// ─── Badge ────────────────────────────────────────────────────
const BADGE_CLASSES = {
  default:     "frv-badge-default",
  secondary:   "frv-badge-secondary",
  outline:     "frv-badge-outline",
  destructive: "frv-badge-destructive",
  safe:        "frv-badge-safe",
  caution:     "frv-badge-caution",
  danger:      "frv-badge-danger",
  closed:      "frv-badge-closed",
};
function Badge({ variant = "default", children, className = "" }) {
  return (
    <span className={"frv-badge " + (BADGE_CLASSES[variant] || BADGE_CLASSES.default) + " " + className}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────
function Button({ variant = "default", size = "default", children, className = "", disabled, onClick, type = "button", asChild, href }) {
  const variantClass = {
    default:     "frv-btn-default",
    secondary:   "frv-btn-secondary",
    outline:     "frv-btn-outline",
    ghost:       "frv-btn-ghost",
    destructive: "frv-btn-destructive",
    link:        "frv-btn-link",
  }[variant] || "frv-btn-default";
  const sizeClass = { default: "", sm: "frv-btn-sm", lg: "frv-btn-lg", icon: "frv-btn-icon" }[size] || "";
  const cls = `frv-btn ${variantClass} ${sizeClass} ${className}`;
  if (asChild && href) return <a href={href} className={cls}>{children}</a>;
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────
function Input({ type = "text", placeholder, value, onChange, className = "", id, required, autoComplete, maxLength, inputMode, pattern }) {
  return (
    <input
      id={id} type={type} placeholder={placeholder} value={value}
      onChange={onChange} className={"frv-input " + className}
      required={required} autoComplete={autoComplete}
      maxLength={maxLength} inputMode={inputMode} pattern={pattern}
    />
  );
}

// ─── Label ────────────────────────────────────────────────────
function Label({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="frv-label">{children}</label>;
}

// Export to window
Object.assign(window, { Card, CardHeader, CardContent, Badge, Button, Input, Label });
