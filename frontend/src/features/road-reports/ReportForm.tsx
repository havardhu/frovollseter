import { useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
  { value: "RecentlyPlowed", label: "🚜 Nettopp brøytet" },
  { value: "SummerTiresOk", label: "✅ Sommerdekk OK" },
  { value: "FourWheelDriveRecommended", label: "⚠️ 4WD anbefalt" },
  { value: "FloodDamage", label: "🌊 Flomskade" },
  { value: "UnsafeDangerous", label: "🚫 Farlig / usikker" },
  { value: "Closed", label: "🔒 Stengt" },
];

interface Props {
  onSubmitted: () => void;
  onCancel: () => void;
}

export function ReportForm({ onSubmitted, onCancel }: Props) {
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [roadSegment, setRoadSegment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) { setError("Velg veiforhold."); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/road-reports", {
        status,
        description: description || null,
        roadSegment: roadSegment || null,
        validUntil: null,
      });
      onSubmitted();
    } catch {
      setError("Kunne ikke sende rapport. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rapporter veiforhold</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tilstand</Label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-md border p-2 text-sm text-left transition-colors ${
                    status === opt.value
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment">Vegstrekning (valgfritt)</Label>
            <Input
              id="segment"
              placeholder="f.eks. «Fra bommen til første sving»"
              value={roadSegment}
              onChange={(e) => setRoadSegment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Merknad (valgfritt)</Label>
            <Input
              id="desc"
              placeholder="Kort beskrivelse…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Sender…" : "Send rapport"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Avbryt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
