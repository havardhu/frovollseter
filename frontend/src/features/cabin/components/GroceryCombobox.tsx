import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchGroceries } from "../api";
import type { GrocerySuggestion } from "../types";

interface Props {
  cabinId: string;
  // Current text in the input (controlled).
  value: string;
  onChange: (value: string) => void;
  // Fired when the user picks an existing dictionary entry.
  onPick?: (suggestion: GrocerySuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}

// Searchable combobox bound to the per-cabin grocery dictionary.
// Built with raw absolute positioning + click-outside detection rather than
// Radix Popover (the codebase doesn't pull in the Popover package and this
// keeps the bundle lean).
export function GroceryCombobox({
  cabinId,
  value,
  onChange,
  onPick,
  placeholder,
  autoFocus,
  disabled,
  id,
}: Props) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GrocerySuggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [searching, setSearching] = useState(false);

  // Debounced server search. ~150 ms is the sweet spot — feels instant,
  // doesn't hammer the API on every keystroke.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      searchGroceries(cabinId, value)
        .then((items) => {
          if (cancelled) return;
          setResults(items);
          setHighlight(0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [cabinId, value, open]);

  // Click outside closes the popover.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const trimmed = value.trim();
  const exactMatch = results.find(
    (r) => r.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showAddTail = trimmed.length > 0 && !exactMatch;
  const totalRows = results.length + (showAddTail ? 1 : 0);

  const pickResult = (i: number) => {
    if (i < results.length) {
      const picked = results[i];
      onChange(picked.name);
      onPick?.(picked);
    } else {
      // "Legg til «...»" — keep the typed value as-is.
    }
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (totalRows > 0) setHighlight((h) => (h + 1) % totalRows);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalRows > 0) setHighlight((h) => (h - 1 + totalRows) % totalRows);
    } else if (e.key === "Enter") {
      if (open && totalRows > 0) {
        e.preventDefault();
        pickResult(highlight);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={inputId}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder ?? "Søk eller skriv inn varenavn..."}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-input bg-popover shadow-md">
          {searching && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Søker...
            </div>
          )}
          {!searching && results.length === 0 && !showAddTail && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Ingen treff. Begynn å skrive for å legge til.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pickResult(i)}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                highlight === i ? "bg-accent" : ""
              }`}
            >
              <span>{r.name}</span>
              {r.useCount > 1 && (
                <span className="text-xs text-muted-foreground">
                  brukt {r.useCount}×
                </span>
              )}
            </button>
          ))}
          {showAddTail && (
            <button
              type="button"
              onClick={() => pickResult(results.length)}
              onMouseEnter={() => setHighlight(results.length)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors border-t border-input ${
                highlight === results.length ? "bg-accent" : ""
              }`}
            >
              <span className="text-primary">+</span>
              <span className="ml-2">
                Legg til <span className="font-medium">«{trimmed}»</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
