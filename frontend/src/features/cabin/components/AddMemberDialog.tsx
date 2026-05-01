import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/api/client";
import { addMember } from "../api";
import type { CabinMemberDto } from "../types";

interface Props {
  cabinId: string;
  onAdded: (member: CabinMemberDto) => void;
  onCancel: () => void;
}

export function AddMemberDialog({ cabinId, onAdded, onCancel }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const member = await addMember(cabinId, email.trim());
      toast.success(`${member.displayName} er lagt til`);
      onAdded(member);
    } catch (err) {
      // Backend returns precise error messages — show them inline.
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError(
            "Vi finner ingen bruker med den e-posten. Be dem registrere seg på Frovollseter først.",
          );
        } else if (err.status === 409) {
          setError("Brukeren er allerede medlem.");
        } else {
          setError("Kunne ikke legge til medlem.");
        }
      } else {
        setError("Kunne ikke legge til medlem.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Legg til medlem</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-email">E-post</Label>
            <Input
              id="member-email"
              type="email"
              required
              autoFocus
              placeholder="navn@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Personen må ha en Frovollseter-konto fra før.
            </p>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Avbryt
            </Button>
            <Button type="submit" disabled={submitting || !email.trim()}>
              {submitting ? "Legger til..." : "Legg til"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
