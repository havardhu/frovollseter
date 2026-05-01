import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCabin } from "./api";
import type { CabinSummary } from "./types";

interface Props {
  onCreated: (cabin: CabinSummary) => void;
  onCancel: () => void;
}

export function CreateCabinDialog({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const cabin = await createCabin(name.trim());
      toast.success(`Hytta «${cabin.name}» opprettet`);
      onCreated(cabin);
    } catch {
      toast.error("Kunne ikke opprette hytte");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Opprett hytte</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cabin-name">Navn</Label>
            <Input
              id="cabin-name"
              type="text"
              required
              autoFocus
              placeholder="Hytta på Frovoll"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Avbryt
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Oppretter..." : "Opprett hytte"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
