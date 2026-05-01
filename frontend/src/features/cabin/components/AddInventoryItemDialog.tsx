import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addInventoryItem } from "../api";
import type { InventoryItemDto, StorageDto } from "../types";
import { GroceryCombobox } from "./GroceryCombobox";
import { QuantityStepper } from "./QuantityStepper";
import { STORAGE_ICONS } from "./StoragePill";

interface Props {
  cabinId: string;
  storages: StorageDto[];
  defaultStorageId: string;
  onAdded: (item: InventoryItemDto) => void;
  onCancel: () => void;
}

export function AddInventoryItemDialog({
  cabinId,
  storages,
  defaultStorageId,
  onAdded,
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [storageId, setStorageId] = useState(defaultStorageId);
  const [quantity, setQuantity] = useState(1);
  const [expiry, setExpiry] = useState<string>("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const item = await addInventoryItem(cabinId, {
        groceryName: name.trim(),
        storageId,
        quantity,
        expiryDate: hasExpiry && expiry ? expiry : null,
      });
      toast.success(`«${item.groceryName}» lagt til`);
      onAdded(item);
    } catch {
      toast.error("Kunne ikke legge til vare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Legg til vare</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-name">Vare</Label>
            <GroceryCombobox
              cabinId={cabinId}
              id="inv-name"
              value={name}
              onChange={setName}
              autoFocus
              placeholder="Smør, Egg, 1/2 liter øl..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-storage">Oppbevaring</Label>
            <select
              id="inv-storage"
              value={storageId}
              onChange={(e) => setStorageId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {storages.map((s) => (
                <option key={s.id} value={s.id}>
                  {STORAGE_ICONS[s.icon]} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Antall</Label>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-expiry">Utløpsdato</Label>
            <div className="flex items-center gap-2">
              <input
                id="inv-expiry"
                type="date"
                value={expiry}
                onChange={(e) => {
                  setExpiry(e.target.value);
                  setHasExpiry(!!e.target.value);
                }}
                disabled={!hasExpiry && !expiry}
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={hasExpiry}
                  onChange={(e) => {
                    setHasExpiry(e.target.checked);
                    if (!e.target.checked) setExpiry("");
                  }}
                />
                Har dato
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              La være tom for varer uten utløp (f.eks. øl).
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Avbryt
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Legger til..." : "Legg til"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
