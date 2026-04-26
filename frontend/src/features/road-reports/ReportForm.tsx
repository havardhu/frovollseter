import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Droplets, Lock, Truck, XCircle, type LucideIcon } from "lucide-react";
import { api } from "@/api/client";
import type { RoadReport } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "RecentlyPlowed", label: "Nettopp brøytet", Icon: Truck },
  { value: "SummerTiresOk", label: "Sommerdekk OK", Icon: CheckCircle },
  { value: "FourWheelDriveRecommended", label: "4WD anbefalt", Icon: AlertTriangle },
  { value: "FloodDamage", label: "Flomskade", Icon: Droplets },
  { value: "UnsafeDangerous", label: "Farlig / usikker", Icon: XCircle },
  { value: "Closed", label: "Stengt", Icon: Lock },
];

interface Props {
  report?: RoadReport;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function ReportForm({ report, onSubmitted, onCancel }: Props) {
  const [status, setStatus] = useState(report?.status ?? "");
  const [description, setDescription] = useState(report?.description ?? "");
  const [roadSegment, setRoadSegment] = useState(report?.roadSegment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!report;

  useEffect(() => {
    setStatus(report?.status ?? "");
    setDescription(report?.description ?? "");
    setRoadSegment(report?.roadSegment ?? "");
  }, [report?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) { setError("Velg veiforhold."); return; }
    setError("");
    setLoading(true);
    try {
      const body = { status, description: description || null, roadSegment: roadSegment || null, validUntil: null };
      if (isEdit) {
        await api.put(`/road-reports/${report.id}`, body);
      } else {
        await api.post("/road-reports", body);
      }
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
        <CardTitle className="text-base">{isEdit ? "Rediger veiforhold" : "Rapporter veiforhold"}</CardTitle>
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
                  className={`flex items-center gap-2 rounded-md border p-2 text-sm text-left transition-colors ${
                    status === opt.value
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <opt.Icon className="h-3.5 w-3.5 shrink-0" />
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
              {loading ? "Lagrer…" : isEdit ? "Lagre endringer" : "Send rapport"}
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
