import type { StorageIcon } from "../types";

const ICONS: Record<StorageIcon, string> = {
  Fridge: "🧊",
  Freezer: "❄️",
  Pantry: "🌾",
  Cellar: "🍷",
  Shed: "🏚️",
  Box: "📦",
  Other: "📍",
};

interface Props {
  icon: StorageIcon;
  name: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StoragePill({ icon, name, active, onClick, className }: Props) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";
  const variant = active
    ? "bg-primary text-primary-foreground border-primary"
    : "bg-background text-foreground border-input hover:bg-accent";

  if (!onClick) {
    return (
      <span className={`${base} ${variant} ${className ?? ""}`}>
        <span aria-hidden>{ICONS[icon]}</span>
        <span>{name}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variant} ${className ?? ""}`}
    >
      <span aria-hidden>{ICONS[icon]}</span>
      <span>{name}</span>
    </button>
  );
}

export const STORAGE_ICONS = ICONS;
