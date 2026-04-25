import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { api } from "@/api/client";
import type { RoadReport, RoadStatus } from "@/api/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";
import { ReportForm } from "./ReportForm";

const STATUS_CONFIG: Record<
  RoadStatus,
  { label: string; variant: BadgeProps["variant"]; icon: string }
> = {
  Unknown: { label: "Ukjent", variant: "outline", icon: "❓" },
  RecentlyPlowed: { label: "Nettopp brøytet", variant: "safe", icon: "🚜" },
  SummerTiresOk: { label: "Sommerdekk OK", variant: "safe", icon: "✅" },
  FourWheelDriveRecommended: { label: "4WD anbefalt", variant: "caution", icon: "⚠️" },
  FloodDamage: { label: "Flomskade", variant: "danger", icon: "🌊" },
  UnsafeDangerous: { label: "Farlig", variant: "danger", icon: "🚫" },
  Closed: { label: "Stengt", variant: "closed", icon: "🔒" },
};

export function RoadReportPage() {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<RoadReport[]>("/road-reports");
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReported = () => {
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veiforhold</h1>
          <p className="text-sm text-muted-foreground">Siste rapporter fra veien opp til hyttene</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isAuthenticated && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Rapporter
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <ReportForm onSubmitted={handleReported} onCancel={() => setShowForm(false)} />
      )}

      {loading && reports.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">🛣️</p>
            <p>Ingen rapporter ennå. Vær den første til å rapportere veiforhold!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <RoadReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoadReportCard({ report }: { report: RoadReport }) {
  const config = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.Unknown;
  const timeAgo = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: nb });

  return (
    <Card className={report.isStale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{config.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                {report.isStale && (
                  <Badge variant="outline" className="text-xs">Utdatert</Badge>
                )}
              </div>
              {report.roadSegment && (
                <p className="text-sm font-medium mt-0.5">{report.roadSegment}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
        </div>
      </CardHeader>
      {report.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </CardContent>
      )}
      <div className="px-6 pb-3">
        <p className="text-xs text-muted-foreground">Rapportert av {report.reportedBy.displayName}</p>
      </div>
    </Card>
  );
}
