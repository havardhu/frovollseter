import { useState } from "react";
import { ApiError } from "@/api/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createStorage, deleteStorage, updateStorage } from "../api";
import { useCabinData } from "../CabinDataContext";
import type { StorageDto, StorageIcon as StorageIconType } from "../types";
import { STORAGE_ICONS } from "./StoragePill";

const ICON_OPTIONS: { value: StorageIconType; label: string }[] = [
  { value: "Fridge", label: "🧊 Kjøleskap" },
  { value: "Freezer", label: "❄️ Fryser" },
  { value: "Pantry", label: "🌾 Tørrvarer" },
  { value: "Cellar", label: "🍷 Kjeller" },
  { value: "Shed", label: "🏚️ Bod" },
  { value: "Box", label: "📦 Eske" },
  { value: "Other", label: "📍 Annet" },
];

export function StorageManagementSection() {
  const { cabinId, storages, refreshStorages } = useCabinData();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<StorageIconType>("Other");
  const [newTempControlled, setNewTempControlled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await createStorage(cabinId, newName.trim(), newIcon, newTempControlled);
      toast.success("Oppbevaring lagt til");
      setNewName("");
      setNewIcon("Other");
      setNewTempControlled(false);
      setCreating(false);
      await refreshStorages();
    } catch {
      toast.error("Kunne ikke legge til oppbevaring");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: StorageDto) => {
    if (!confirm(`Slette oppbevaringen «${s.name}»?`)) return;
    try {
      await deleteStorage(cabinId, s.id, false);
      toast.success("Oppbevaring slettet");
      await refreshStorages();
    } catch (err) {
      // 409 = non-empty storage; offer the force path with explicit consent.
      if (err instanceof ApiError && err.status === 409) {
        if (
          confirm(
            `«${s.name}» inneholder varer. Vil du slette oppbevaringen og alle varene i den?`,
          )
        ) {
          try {
            await deleteStorage(cabinId, s.id, true);
            toast.success("Oppbevaring og varer slettet");
            await refreshStorages();
          } catch {
            toast.error("Kunne ikke slette oppbevaring");
          }
        }
      } else {
        toast.error("Kunne ikke slette oppbevaring");
      }
    }
  };

  const move = async (s: StorageDto, dir: -1 | 1) => {
    const sorted = [...storages].sort((a, b) => a.sortOrder - b.sortOrder);
    const i = sorted.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    // Swap sort orders. Simpler than a reorder endpoint roundtrip and the user
    // sees the change immediately on refresh.
    const a = sorted[i];
    const b = sorted[j];
    try {
      await Promise.all([
        updateStorage(cabinId, a.id, { sortOrder: b.sortOrder }),
        updateStorage(cabinId, b.id, { sortOrder: a.sortOrder }),
      ]);
      await refreshStorages();
    } catch {
      toast.error("Kunne ikke endre rekkefølge");
    }
  };

  const handleRename = async (s: StorageDto, name: string) => {
    if (!name.trim() || name.trim() === s.name) return;
    try {
      await updateStorage(cabinId, s.id, { name: name.trim() });
      await refreshStorages();
    } catch {
      toast.error("Kunne ikke endre navn");
    }
  };

  const sorted = [...storages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Oppbevaringer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {sorted.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-md border border-input p-2"
            >
              <span aria-hidden className="text-lg">
                {STORAGE_ICONS[s.icon]}
              </span>
              <input
                defaultValue={s.name}
                onBlur={(e) => handleRename(s, e.target.value)}
                className="flex-1 bg-transparent text-sm focus-visible:outline-none"
              />
              <span className="text-xs text-muted-foreground">
                {s.isTempControlled ? "Kjølt" : "Tørt"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(s, -1)}
                disabled={i === 0}
                aria-label="Flytt opp"
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(s, 1)}
                disabled={i === sorted.length - 1}
                aria-label="Flytt ned"
              >
                ↓
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(s)}
                aria-label={`Slett ${s.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>

        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-md border border-input p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-storage-name">Navn</Label>
              <Input
                id="new-storage-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tørrvarer, Bod..."
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-storage-icon">Ikon</Label>
              <select
                id="new-storage-icon"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value as StorageIconType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newTempControlled}
                onChange={(e) => setNewTempControlled(e.target.checked)}
              />
              Kjølt eller frosset (gir utløpsvarsler)
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={submitting}>
                Avbryt
              </Button>
              <Button type="submit" disabled={submitting || !newName.trim()}>
                {submitting ? "Lagrer..." : "Legg til"}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setCreating(true)} className="self-start">
            <Plus className="h-4 w-4 mr-1" /> Ny oppbevaring
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
