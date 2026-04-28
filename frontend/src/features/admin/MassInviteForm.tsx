import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminAssociation, MassInvite, MassInviteCreated } from "@/api/types";
import { adminApi } from "./adminApi";

interface Props {
  currentUserRole: string;
  associations: AdminAssociation[];
}

const DURATION_OPTIONS: { label: string; days: number }[] = [
  { label: "7 dager", days: 7 },
  { label: "14 dager", days: 14 },
  { label: "30 dager", days: 30 },
  { label: "90 dager", days: 90 },
];

function buildPublicUrl(token: string) {
  // Backend returns absolute URL too, but we prefer the current origin so admins testing locally
  // get a link they can actually click on the same domain they're on.
  return `${window.location.origin}/auth/join/${encodeURIComponent(token)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Lenken er kopiert");
  } catch {
    toast.error("Kunne ikke kopiere lenken");
  }
}

export function MassInviteForm({ currentUserRole, associations }: Props) {
  const [associationId, setAssociationId] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [note, setNote] = useState("");
  const [invites, setInvites] = useState<MassInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  // Surface the freshly-created link separately so the admin can copy it before it
  // disappears into the (long) historical list.
  const [latest, setLatest] = useState<MassInviteCreated | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .listMassInvites()
      .then((data) => {
        if (!cancelled) setInvites(data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Kunne ikke laste masse-invitasjoner");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Slette denne masse-invitasjonen? Lenken vil slutte å fungere umiddelbart.")) {
      return;
    }
    try {
      await adminApi.deleteMassInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      setLatest((current) => (current?.id === id ? null : current));
      toast.success("Masse-invitasjon slettet");
    } catch {
      toast.error("Kunne ikke slette masse-invitasjon");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const created = await adminApi.createMassInvite({
        associationId: currentUserRole === "SystemAdmin" ? associationId || undefined : undefined,
        expiresAt,
        note: note.trim() || undefined,
      });
      if (created) {
        setLatest(created);
        // Strip the token-bearing fields so the historical list keeps the same shape as listMassInvites.
        const { token: _t, url: _u, ...invite } = created;
        void _t;
        void _u;
        setInvites((prev) => [invite, ...prev]);
        setNote("");
        toast.success("Masse-invitasjon opprettet");
      }
    } catch {
      toast.error("Kunne ikke opprette masse-invitasjon");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masse-invitasjon</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lag én lenke som flere personer kan bruke for å registrere seg selv.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mass-duration">Gyldig i</Label>
              <select
                id="mass-duration"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {currentUserRole === "SystemAdmin" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mass-assoc">Forening</Label>
                <select
                  id="mass-assoc"
                  required
                  value={associationId}
                  onChange={(e) => setAssociationId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Velg forening...</option>
                  {associations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mass-note">Merknad (valgfritt)</Label>
            <Input
              id="mass-note"
              type="text"
              maxLength={200}
              placeholder="F.eks. 'Sommertreff 2026'"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={creating}>
              {creating ? "Oppretter..." : "Opprett lenke"}
            </Button>
          </div>
        </form>

        {latest && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 flex flex-col gap-2">
            <p className="text-sm font-medium">Ny lenke klar til deling</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={buildPublicUrl(latest.token)} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(buildPublicUrl(latest.token))}
              >
                Kopier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Gyldig til {formatDate(latest.expiresAt)}. Alle som åpner lenken kan registrere seg
              selv med eget navn og e-post.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Aktive og tidligere lenker</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laster...</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen lenker opprettet enda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {inv.note ?? inv.association.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.note ? `${inv.association.name} · ` : ""}
                      Opprettet {formatDate(inv.createdAt)} · Utløper {formatDate(inv.expiresAt)} ·{" "}
                      {inv.redemptionCount}{" "}
                      {inv.redemptionCount === 1 ? "registrering" : "registreringer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.isExpired ? "danger" : "safe"}>
                      {inv.isExpired ? "Utløpt" : "Aktiv"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(inv.id)}
                    >
                      Slett
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
