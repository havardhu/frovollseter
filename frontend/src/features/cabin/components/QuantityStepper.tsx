import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  disabled?: boolean;
  // "compact" is for inline use inside list rows; "default" for dialogs/forms.
  size?: "compact" | "default";
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  disabled,
  size = "compact",
}: Props) {
  const dec = () => {
    if (disabled || value <= min) return;
    onChange(value - 1);
  };
  const inc = () => {
    if (disabled) return;
    onChange(value + 1);
  };

  const btnClass =
    size === "compact"
      ? "h-7 w-7 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
      : "h-8 w-8 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none";
  const iconClass = size === "compact" ? "h-3 w-3" : "h-3.5 w-3.5";
  const numClass =
    size === "compact"
      ? "w-6 text-center tabular-nums text-sm font-medium"
      : "w-8 text-center tabular-nums text-sm font-medium";

  return (
    <div
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={btnClass}
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Reduser antall"
      >
        <Minus className={iconClass} />
      </button>
      <span className={numClass}>{value}</span>
      <button
        type="button"
        className={btnClass}
        onClick={inc}
        disabled={disabled}
        aria-label="Øk antall"
      >
        <Plus className={iconClass} />
      </button>
    </div>
  );
}
