import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLastStorageForGrocery, purchaseShoppingItem } from "../api";
import type { ShoppingItemDto, StorageDto } from "../types";

interface Props {
  cabinId: string;
  storages: StorageDto[];
  item: ShoppingItemDto;
  onPurchased: () => void;
  onCancel: () => void;
}

export function PurchaseDialog({
  cabinId,
  storages,
  item,
  onPurchased,
  onCancel,
}: Props) {
  const [storageId, setStorageId] = useState(storages[0]?.id ?? "");
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Smart default: ask the server where this grocery has lived before.
  useEffect(() => {
    let cancelled = false;
    getLastStorageForGrocery(cabinId, item.groceryItemId)
      .then((res) => {
        if (cancelled || !res.storageId) return;
        // Only use the suggestion if it's still a real storage in this cabin.
        if (storages.some((s) => s.id === res.storageId)) {
          setStorageId(res.storageId);
        }
      })
      .catch(() => {
        // Silent fallback to the first storage.
      });
    return () => {
      cancelled = true;
    };
  }, [cabinId, item.groceryItemId, storages]);

  const purchase = async (addToInventory: boolean) => {
    setSubmitting(true);
    try {
      await purchaseShoppingItem(
        cabinId,
        item.id,
        addToInventory && storageId
          ? { storageId, expiryDate: expiry || null }
          : null,
      );
      toast.success(
        addToInventory
          ? `«${item.groceryName}» er lagt på lager`
          : `«${item.groceryName}» merket som kjøpt`,
      );
      onPurchased();
    } catch {
      toast.error("Kunne ikke registrere kjøpet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Kjøpt «{item.groceryName}» ×{item.quantity}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Legg på lager?</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase-storage">Oppbevaring</Label>
            <select
              id="purchase-storage"
              value={storageId}
              onChange={(e) => setStorageId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {storages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase-expiry">Utløpsdato (valgfritt)</Label>
            <input
              id="purchase-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => purchase(false)}
              disabled={submitting}
            >
              Bare merk som kjøpt
            </Button>
            <Button
              type="button"
              onClick={() => purchase(true)}
              disabled={submitting || !storageId}
            >
              {submitting ? "Lagrer..." : "Legg på lager"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
