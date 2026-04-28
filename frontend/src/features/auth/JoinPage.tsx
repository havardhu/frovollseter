import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MassInviteLookup } from "@/api/types";
import { useAuth } from "./AuthContext";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; invite: MassInviteLookup }
  | { status: "error"; message: string };

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed?.error) return parsed.error;
    } catch {
      /* not JSON — fall through */
    }
  }
  return fallback;
}

export function JoinPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { redeemMassInvite, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      // Already logged in — redeeming would just collide with the existing account, so send them home.
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ status: "error", message: "Mangler invitasjons-token." });
      return;
    }
    api
      .get<MassInviteLookup>(`/auth/mass-invite/${encodeURIComponent(token)}`)
      .then((invite) => {
        if (!cancelled) setState({ status: "ready", invite });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: parseErrorMessage(err, "Invitasjonen er ugyldig eller utløpt."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await redeemMassInvite(token, email, displayName);
      toast.success("Velkommen!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(parseErrorMessage(err, "Kunne ikke fullføre registreringen"));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Henter invitasjon…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-medium">Kunne ikke åpne invitasjonen</p>
          <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
          <a href="/login" className="text-sm text-primary underline mt-3 block">
            Gå til innlogging
          </a>
        </div>
      </div>
    );
  }

  const expires = new Date(state.invite.expiresAt).toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bli med i {state.invite.association.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Du har fått en invitasjon til Frovollseter-portalen. Fyll inn navn og e-post for å
            opprette din egen konto. Lenken er gyldig til {expires}.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-name">Navn</Label>
              <Input
                id="join-name"
                type="text"
                required
                placeholder="Ola Nordmann"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-email">E-post</Label>
              <Input
                id="join-email"
                type="email"
                required
                placeholder="navn@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                E-postadressen blir brukt for å logge inn senere. Den må være unik.
              </p>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registrerer..." : "Opprett konto og logg inn"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
