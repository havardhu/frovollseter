import { useState } from "react";
import { ApiError } from "@/api/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createStorage, deleteStorage, updateStorage } from "../api";
import { useCabinData } from "../CabinDataContext";
import type { StorageDto, StorageIcon as StorageIconType } from "../types";
import { STORAGE_ICONS } from "./StoragePill";

// Labels are used for aria-label and tooltips on the icon buttons.
const ICON_OPTIONS: { value: StorageIconType; label: string }[] = [
  { value: "Fridge", label: "Kjøleskap" },
  { value: "Freezer", label: "Fryser" },
  { value: "Pantry", label: "Tørrvarer" },
  { value: "Cellar", label: "Kjeller" },
  { value: "Shed", label: "Bod" },
  { value: "Box", label: "Eske" },
  { value: "Other", label: "Annet" },
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
          {sorted.map((s, i) => {
            const Icon = STORAGE_ICONS[s.icon];
            return (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-input p-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  defaultValue={s.name}
                  onBlur={(e) => handleRename(s, e.target.value)}
                  className="flex-1 bg-transparent text-sm focus-visible:outline-none"
                />
                <span className="text-xs text-muted-foreground">
                  {s.isTempControlled ? "Kjølt" : "Tørt"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => move(s, -1)}
                  disabled={i === 0}
                  aria-label="Flytt opp"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => move(s, 1)}
                  disabled={i === sorted.length - 1}
                  aria-label="Flytt ned"
                >
                  <ChevronDown className="h-4 w-4" />
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
            );
          })}
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
              <Label id="new-storage-icon-label">Ikon</Label>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="new-storage-icon-label"
              >
                {ICON_OPTIONS.map((o) => {
                  const Icon = STORAGE_ICONS[o.value];
                  const selected = newIcon === o.value;
                  return (
                    <Button
                      key={o.value}
                      type="button"
                      size="icon"
                      variant={selected ? "default" : "outline"}
                      onClick={() => setNewIcon(o.value)}
                      role="radio"
                      aria-checked={selected}
                      aria-label={o.label}
                      title={o.label}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
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
