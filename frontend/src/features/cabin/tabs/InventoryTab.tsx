import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  adjustInventoryQuantity,
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
} from "../api";
import { useCabinData } from "../CabinDataContext";
import type { InventoryItemDto, StorageDto } from "../types";
import { AddInventoryItemDialog } from "../components/AddInventoryItemDialog";
import { ExpiryBadge } from "../components/ExpiryBadge";
import { QuantityStepper } from "../components/QuantityStepper";
import { STORAGE_ICONS, StoragePill } from "../components/StoragePill";

interface Props {
  cabinId: string;
}

export function InventoryTab({ cabinId }: Props) {
  const { storages } = useCabinData();
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  // null = "Alle"; otherwise a storage id.
  const [filter, setFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listInventory(cabinId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setFilter(null);
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinId]);

  // Filter + sort by expiry-soonest, then name.
  const visibleItems = useMemo(() => {
    const filtered = filter
      ? items.filter((i) => i.storageId === filter)
      : items;
    return [...filtered].sort((a, b) => {
      const ax = a.expiryDate ?? "9999-12-31";
      const bx = b.expiryDate ?? "9999-12-31";
      if (ax !== bx) return ax < bx ? -1 : 1;
      return a.groceryName.localeCompare(b.groceryName, "no");
    });
  }, [items, filter]);

  // For "Alle" view, group by storage so the user sees where things live.
  const grouped = useMemo(() => {
    if (filter) return null;
    const byStorage = new Map<string, InventoryItemDto[]>();
    for (const item of visibleItems) {
      const arr = byStorage.get(item.storageId) ?? [];
      arr.push(item);
      byStorage.set(item.storageId, arr);
    }
    const sortedStorages = [...storages].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedStorages
      .map((s) => ({ storage: s, items: byStorage.get(s.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [filter, visibleItems, storages]);

  const handleAdjust = async (item: InventoryItemDto, delta: number) => {
    // Optimistic update — roll back on failure.
    const prevQty = item.quantity;
    setItems((curr) =>
      curr.map((i) => (i.id === item.id ? { ...i, quantity: prevQty + delta } : i)),
    );
    try {
      const res = await adjustInventoryQuantity(cabinId, item.id, delta);
      setItems((curr) =>
        curr.map((i) => (i.id === item.id ? { ...i, quantity: res.quantity } : i)),
      );
    } catch {
      setItems((curr) =>
        curr.map((i) => (i.id === item.id ? { ...i, quantity: prevQty } : i)),
      );
      toast.error("Kunne ikke endre antall");
    }
  };

  const handleDelete = async (item: InventoryItemDto) => {
    if (!confirm(`Fjerne «${item.groceryName}» fra beholdningen?`)) return;
    try {
      await deleteInventoryItem(cabinId, item.id);
      setItems((curr) => curr.filter((i) => i.id !== item.id));
    } catch {
      toast.error("Kunne ikke fjerne vare");
    }
  };

  const handleMove = async (item: InventoryItemDto, newStorageId: string) => {
    try {
      await updateInventoryItem(cabinId, item.id, { storageId: newStorageId });
      await load();
    } catch {
      toast.error("Kunne ikke flytte vare");
    }
  };

  const handleExpiryChange = async (item: InventoryItemDto, value: string) => {
    try {
      if (!value) {
        await updateInventoryItem(cabinId, item.id, { clearExpiryDate: true });
      } else {
        await updateInventoryItem(cabinId, item.id, { expiryDate: value });
      }
      await load();
    } catch {
      toast.error("Kunne ikke endre utløpsdato");
    }
  };

  if (showAdd) {
    return (
      <AddInventoryItemDialog
        cabinId={cabinId}
        storages={storages}
        defaultStorageId={filter ?? storages[0]?.id ?? ""}
        onAdded={() => {
          setShowAdd(false);
          load();
        }}
        onCancel={() => setShowAdd(false)}
      />
    );
  }

  const renderRow = (item: InventoryItemDto, showStorageIcon: boolean) => (
    <ItemRow
      key={item.id}
      item={item}
      showStorageIcon={showStorageIcon}
      expanded={expandedId === item.id}
      onToggle={() =>
        setExpandedId((curr) => (curr === item.id ? null : item.id))
      }
      storages={storages}
      onAdjust={(d) => handleAdjust(item, d)}
      onDelete={() => handleDelete(item)}
      onMove={(sid) => handleMove(item, sid)}
      onExpiryChange={(v) => handleExpiryChange(item, v)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Storage filter pills */}
      <div className="flex flex-wrap gap-2">
        <StoragePill
          icon="Other"
          name="Alle"
          active={filter === null}
          onClick={() => setFilter(null)}
        />
        {[...storages]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => (
            <StoragePill
              key={s.id}
              icon={s.icon}
              name={s.name}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
            />
          ))}
      </div>

      <Button onClick={() => setShowAdd(true)} className="self-start">
        <Plus className="h-4 w-4 mr-1" /> Legg til vare
      </Button>

      {loading && <p className="text-sm text-muted-foreground">Laster...</p>}

      {!loading && visibleItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Ingen varer her ennå. Legg til den første!
        </p>
      )}

      {!loading && grouped && grouped.length > 0 && (
        <div className="flex flex-col gap-4">
          {grouped.map(({ storage, items: groupItems }) => (
            <div key={storage.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span aria-hidden>{STORAGE_ICONS[storage.icon]}</span>
                <span>{storage.name}</span>
                <span className="text-xs">({groupItems.length})</span>
              </div>
              <ul className="divide-y divide-input border border-input rounded-md overflow-hidden">
                {groupItems.map((item) => renderRow(item, false))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!loading && !grouped && visibleItems.length > 0 && (
        <ul className="divide-y divide-input border border-input rounded-md overflow-hidden">
          {visibleItems.map((item) => renderRow(item, true))}
        </ul>
      )}
    </div>
  );
}

interface RowProps {
  item: InventoryItemDto;
  // Whether to show the storage emoji at the start of the row (used in
  // filtered/non-grouped view; in grouped view the storage header above
  // already conveys this).
  showStorageIcon: boolean;
  expanded: boolean;
  onToggle: () => void;
  storages: StorageDto[];
  onAdjust: (delta: number) => void;
  onDelete: () => void;
  onMove: (storageId: string) => void;
  onExpiryChange: (value: string) => void;
}

function ItemRow({
  item,
  showStorageIcon,
  expanded,
  onToggle,
  storages,
  onAdjust,
  onDelete,
  onMove,
  onExpiryChange,
}: RowProps) {
  return (
    <li className="bg-background">
      {/* Single-line summary row. Click to expand for edit options. */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
      >
        {showStorageIcon && (
          <span aria-hidden className="flex-shrink-0">
            {STORAGE_ICONS[item.storageIcon]}
          </span>
        )}
        <span className="flex-1 truncate text-sm font-medium">
          {item.groceryName}
        </span>
        <ExpiryBadge
          expiryDate={item.expiryDate}
          isTempControlled={item.isTempControlled}
        />
        <QuantityStepper
          value={item.quantity}
          onChange={(next) => onAdjust(next - item.quantity)}
          min={0}
        />
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-3 pb-3 pt-1 bg-muted/30">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`move-${item.id}`} className="text-xs">
              Flytt til
            </Label>
            <select
              id={`move-${item.id}`}
              value={item.storageId}
              onChange={(e) => onMove(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {storages.map((s) => (
                <option key={s.id} value={s.id}>
                  {STORAGE_ICONS[s.icon]} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`exp-${item.id}`} className="text-xs">
              Utløpsdato
            </Label>
            <div className="flex items-center gap-2">
              <input
                id={`exp-${item.id}`}
                type="date"
                value={item.expiryDate ?? ""}
                onChange={(e) => onExpiryChange(e.target.value)}
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {item.expiryDate && (
                <Button size="sm" variant="outline" onClick={() => onExpiryChange("")}>
                  Fjern
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onDelete} className="text-destructive h-8">
              <Trash2 className="h-4 w-4 mr-1" /> Fjern fra beholdning
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
