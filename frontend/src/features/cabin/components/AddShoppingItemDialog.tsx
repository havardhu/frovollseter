import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addShoppingItem } from "../api";
import type { ShoppingItemDto } from "../types";
import { GroceryCombobox } from "./GroceryCombobox";
import { QuantityStepper } from "./QuantityStepper";

interface Props {
  cabinId: string;
  onAdded: (item: ShoppingItemDto) => void;
  onCancel: () => void;
}

export function AddShoppingItemDialog({ cabinId, onAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const item = await addShoppingItem(cabinId, {
        groceryName: name.trim(),
        quantity,
        note: note.trim() || null,
      });
      toast.success(`«${item.groceryName}» lagt til på handlelisten`);
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
        <CardTitle className="text-base">Legg til på handlelisten</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shop-name">Vare</Label>
            <GroceryCombobox
              cabinId={cabinId}
              id="shop-name"
              value={name}
              onChange={setName}
              autoFocus
              placeholder="Smør, Egg..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Antall</Label>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shop-note">Notat (valgfritt)</Label>
            <Input
              id="shop-note"
              type="text"
              maxLength={200}
              placeholder="Helst Tine"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
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
