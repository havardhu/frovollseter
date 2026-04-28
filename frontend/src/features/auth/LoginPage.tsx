import { useState } from "react";
import { Mail } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Step = "email" | "otp" | "link-sent";

export function LoginPage() {
  const { requestMagicLink, requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<"link" | "otp">("link");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "link") {
        await requestMagicLink(email, rememberMe);
        setStep("link-sent");
      } else {
        await requestOtp(email);
        setStep("otp");
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await verifyOtp(email, otp);
      if (ok) {
        navigate(returnTo, { replace: true });
      } else {
        setError("Ugyldig eller utløpt kode. Prøv igjen.");
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">🏔️</div>
          <CardTitle>Frovollseter</CardTitle>
          <CardDescription>Logg inn for å se hytte- og veiinformasjon</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-postadresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="deg@example.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("link")}
                  className={`flex-1 rounded-md border p-2 text-center transition-colors ${
                    mode === "link"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Lenke på e-post
                </button>
                <button
                  type="button"
                  onClick={() => setMode("otp")}
                  className={`flex-1 rounded-md border p-2 text-center transition-colors ${
                    mode === "otp"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Engangskode
                </button>
              </div>

              {mode === "link" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Hold meg innlogget i 30 dager
                </label>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sender…" : mode === "link" ? "Send innloggingslenke" : "Send engangskode"}
              </Button>
            </form>
          )}

          {step === "link-sent" && (
            <div className="text-center space-y-3">
              <Mail className="h-9 w-9 mx-auto text-muted-foreground" />
              <p className="font-medium">Sjekk innboksen din</p>
              <p className="text-sm text-muted-foreground">
                Vi har sendt en innloggingslenke til <strong>{email}</strong>. Lenken er gyldig i 15 minutter.
                {rememberMe && " Du forblir innlogget i 30 dager etter at du har klikket lenken."}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("email")}>
                Prøv igjen
              </Button>
            </div>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vi sendte en 6-sifret kode til <strong>{email}</strong>.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">Engangskode</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                {loading ? "Sjekker…" : "Logg inn"}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep("email")}>
                Tilbake
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
