import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addLowStockToShoppingList,
  adjustShoppingQuantity,
  deleteShoppingItem,
  listShoppingList,
  restoreShoppingItem,
} from "../api";
import { useCabinData } from "../CabinDataContext";
import type { ShoppingItemDto } from "../types";
import { AddShoppingItemDialog } from "../components/AddShoppingItemDialog";
import { PurchaseDialog } from "../components/PurchaseDialog";
import { QuantityStepper } from "../components/QuantityStepper";

interface Props {
  cabinId: string;
}

export function ShoppingListTab({ cabinId }: Props) {
  const { storages } = useCabinData();
  const [items, setItems] = useState<ShoppingItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<ShoppingItemDto | null>(null);
  const [showPurchased, setShowPurchased] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listShoppingList(cabinId, true);
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setShowAdd(false);
    setPurchaseTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinId]);

  const { active, purchased } = useMemo(() => {
    const a: ShoppingItemDto[] = [];
    const p: ShoppingItemDto[] = [];
    for (const it of items) {
      if (it.purchasedAt) p.push(it);
      else a.push(it);
    }
    a.sort(
      (x, y) =>
        x.groceryName.localeCompare(y.groceryName, "no") ||
        x.addedAt.localeCompare(y.addedAt),
    );
    p.sort((x, y) => (y.purchasedAt ?? "").localeCompare(x.purchasedAt ?? ""));
    return { active: a, purchased: p };
  }, [items]);

  const handleAdjust = async (item: ShoppingItemDto, delta: number) => {
    const prev = item.quantity;
    setItems((curr) =>
      curr.map((i) => (i.id === item.id ? { ...i, quantity: prev + delta } : i)),
    );
    try {
      const res = await adjustShoppingQuantity(cabinId, item.id, delta);
      setItems((curr) =>
        curr.map((i) => (i.id === item.id ? { ...i, quantity: res.quantity } : i)),
      );
    } catch {
      setItems((curr) =>
        curr.map((i) => (i.id === item.id ? { ...i, quantity: prev } : i)),
      );
      toast.error("Kunne ikke endre antall");
    }
  };

  const handleDelete = async (item: ShoppingItemDto) => {
    if (!confirm(`Fjerne «${item.groceryName}» fra handlelisten?`)) return;
    try {
      await deleteShoppingItem(cabinId, item.id);
      setItems((curr) => curr.filter((i) => i.id !== item.id));
    } catch {
      toast.error("Kunne ikke fjerne vare");
    }
  };

  const handleRestore = async (item: ShoppingItemDto) => {
    try {
      await restoreShoppingItem(cabinId, item.id);
      await load();
    } catch {
      toast.error("Kunne ikke angre");
    }
  };

  const handleSuggestLow = async () => {
    try {
      const res = await addLowStockToShoppingList(cabinId);
      if (res.added.length === 0) {
        toast.info("Ingen lavt-lager varer å foreslå.");
      } else {
        toast.success(`Lagt til ${res.added.length} varer fra lavt lager`);
        await load();
      }
    } catch {
      toast.error("Kunne ikke foreslå varer");
    }
  };

  if (showAdd) {
    return (
      <AddShoppingItemDialog
        cabinId={cabinId}
        onAdded={() => {
          setShowAdd(false);
          load();
        }}
        onCancel={() => setShowAdd(false)}
      />
    );
  }

  if (purchaseTarget) {
    return (
      <PurchaseDialog
        cabinId={cabinId}
        storages={storages}
        item={purchaseTarget}
        onPurchased={() => {
          setPurchaseTarget(null);
          load();
        }}
        onCancel={() => setPurchaseTarget(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Legg til vare
        </Button>
        <Button variant="outline" onClick={handleSuggestLow}>
          <Sparkles className="h-4 w-4 mr-1" /> Foreslå fra lavt lager
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Laster...</p>}

      {!loading && active.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Handlelisten er tom. Legg til ting du trenger neste gang.
        </p>
      )}

      {active.length > 0 && (
        <ul className="divide-y divide-input border border-input rounded-md overflow-hidden">
          {active.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer flex-shrink-0"
                checked={false}
                onChange={() => setPurchaseTarget(item)}
                aria-label={`Marker «${item.groceryName}» som kjøpt`}
              />
              <span className="flex-1 truncate text-sm">
                <span className="font-medium">{item.groceryName}</span>
                {item.note && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    «{item.note}»
                  </span>
                )}
              </span>
              <QuantityStepper
                value={item.quantity}
                onChange={(next) => handleAdjust(item, next - item.quantity)}
                min={1}
              />
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 flex-shrink-0"
                aria-label={`Fjern ${item.groceryName}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {purchased.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-input pt-4">
          <button
            type="button"
            onClick={() => setShowPurchased((s) => !s)}
            className="text-sm text-muted-foreground hover:text-foreground self-start"
          >
            Sist kjøpt (siste 7 dager) {showPurchased ? "v" : ">"}
          </button>
          {showPurchased && (
            <ul className="divide-y divide-input border border-input rounded-md overflow-hidden">
              {purchased.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 bg-background opacity-70"
                >
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="h-4 w-4 flex-shrink-0"
                  />
                  <span className="flex-1 truncate text-sm line-through">
                    {item.groceryName}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    ×{item.quantity}
                    {item.purchasedAt &&
                      ` · ${format(parseISO(item.purchasedAt), "dd.MM", { locale: nb })}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    className="text-xs text-primary hover:underline flex-shrink-0"
                  >
                    Angre
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
