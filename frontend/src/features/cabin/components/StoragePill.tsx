import {
  MapPin,
  Package,
  Refrigerator,
  Snowflake,
  Warehouse,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { StorageIcon } from "../types";

// Monochrome lucide icons — kept in sync with the app's overall icon style.
// Native <option> elements can't render React components, so dropdowns just
// use the storage name; the icon shows up wherever HTML allows it.
const ICONS: Record<StorageIcon, LucideIcon> = {
  Fridge: Refrigerator,
  Freezer: Snowflake,
  Pantry: Wheat,
  Cellar: Wine,
  Shed: Warehouse,
  Box: Package,
  Other: MapPin,
};

interface Props {
  icon: StorageIcon;
  name: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StoragePill({ icon, name, active, onClick, className }: Props) {
  const Icon = ICONS[icon];
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";
  const variant = active
    ? "bg-primary text-primary-foreground border-primary"
    : "bg-background text-foreground border-input hover:bg-accent";

  if (!onClick) {
    return (
      <span className={`${base} ${variant} ${className ?? ""}`}>
        <Icon className="h-4 w-4" aria-hidden />
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
      <Icon className="h-4 w-4" aria-hidden />
      <span>{name}</span>
    </button>
  );
}

export const STORAGE_ICONS = ICONS;
