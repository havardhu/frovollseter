import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { nb } from "date-fns/locale";

interface Props {
  // ISO date yyyy-mm-dd, or null when no expiry set.
  expiryDate: string | null;
  // Drives whether a "no date" placeholder is shown for cold storages.
  isTempControlled: boolean;
}

// Norwegian formatter — dd.MM.yyyy.
function formatNo(date: Date) {
  return format(date, "dd.MM.yyyy", { locale: nb });
}

// Compact one-line expiry display: just the date in a colour that signals state.
// Red = expired, amber = ≤3 days, muted = far out, em-dash = no date set.
export function ExpiryBadge({ expiryDate, isTempControlled }: Props) {
  if (!expiryDate) {
    return isTempControlled ? (
      <span className="text-xs text-muted-foreground tabular-nums">—</span>
    ) : null;
  }

  const date = parseISO(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(date, today);

  let className = "text-xs tabular-nums text-muted-foreground";
  if (days < 0) {
    className = "text-xs tabular-nums font-medium text-destructive";
  } else if (days <= 3) {
    className = "text-xs tabular-nums font-medium text-amber-600 dark:text-amber-400";
  }

  return <span className={className}>{formatNo(date)}</span>;
}
