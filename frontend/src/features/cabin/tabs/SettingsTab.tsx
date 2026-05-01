import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCabin, updateCabin } from "../api";
import { StorageManagementSection } from "../components/StorageManagementSection";

interface Props {
  cabinId: string;
  cabinName: string;
  onRenamed: (newName: string) => void;
  onDeleted: () => void;
}

export function SettingsTab({ cabinId, cabinName, onRenamed, onDeleted }: Props) {
  const [name, setName] = useState(cabinName);
  const [savingName, setSavingName] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === cabinName) return;
    setSavingName(true);
    try {
      const res = await updateCabin(cabinId, name.trim());
      toast.success("Hytta er oppdatert");
      onRenamed(res.name);
    } catch {
      toast.error("Kunne ikke oppdatere hytta");
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Slette hytta «${cabinName}»? Alle varer, handlelister og medlemmer vil forsvinne.`)) return;
    try {
      await deleteCabin(cabinId);
      toast.success("Hytta er slettet");
      onDeleted();
    } catch {
      toast.error("Kunne ikke slette hytta");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hyttenavn</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cabin-rename">Navn</Label>
              <Input
                id="cabin-rename"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={savingName}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingName || !name.trim() || name.trim() === cabinName}
              >
                {savingName ? "Lagrer..." : "Lagre"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <StorageManagementSection />

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">Faresone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Sletter hytta permanent. Alle medlemmer mister tilgangen.
          </p>
          <Button variant="destructive" onClick={handleDelete}>
            Slett hytte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
