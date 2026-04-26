import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Droplets, HelpCircle, Lock, Pencil, Plus, RefreshCw, ThumbsUp, Trash2, Truck, XCircle, type LucideIcon } from "lucide-react";
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
  { label: string; variant: BadgeProps["variant"]; Icon: LucideIcon; iconColor: string }
> = {
  Unknown: { label: "Ukjent", variant: "outline", Icon: HelpCircle, iconColor: "hsl(215 16% 47%)" },
  RecentlyPlowed: { label: "Nettopp brøytet", variant: "safe", Icon: Truck, iconColor: "hsl(142 76% 36%)" },
  SummerTiresOk: { label: "Sommerdekk OK", variant: "safe", Icon: CheckCircle, iconColor: "hsl(142 76% 36%)" },
  FourWheelDriveRecommended: { label: "4WD anbefalt", variant: "caution", Icon: AlertTriangle, iconColor: "hsl(38 92% 50%)" },
  FloodDamage: { label: "Flomskade", variant: "danger", Icon: Droplets, iconColor: "hsl(0 84% 60%)" },
  UnsafeDangerous: { label: "Farlig", variant: "danger", Icon: XCircle, iconColor: "hsl(0 84% 60%)" },
  Closed: { label: "Stengt", variant: "closed", Icon: Lock, iconColor: "hsl(215 16% 47%)" },
};

export function RoadReportPage() {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<RoadReport[]>("/road-reports");
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          {isAuthenticated && !showForm && !editingId && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Rapporter
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <ReportForm onSubmitted={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
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
            <RoadReportCard
              key={report.id}
              report={report}
              isEditing={editingId === report.id}
              onEditStart={() => { setShowForm(false); setEditingId(report.id); }}
              onEditEnd={() => setEditingId(null)}
              onChanged={() => { setEditingId(null); load(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoadReportCard({
  report,
  isEditing,
  onEditStart,
  onEditEnd,
  onChanged,
}: {
  report: RoadReport;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onChanged: () => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const config = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.Unknown;
  const isOwner = user?.id === report.reportedBy.id;

  const timeAgo = (iso: string) =>
    formatDistanceToNow(new Date(iso), { addSuffix: true, locale: nb });

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post(`/road-reports/${report.id}/confirm`);
      onChanged();
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Slett denne rapporten?")) return;
    setDeleting(true);
    try {
      await api.delete(`/road-reports/${report.id}`);
      onChanged();
    } finally {
      setDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <ReportForm
        key={report.id}
        report={report}
        onSubmitted={onChanged}
        onCancel={onEditEnd}
      />
    );
  }

  return (
    <Card className={report.isStale ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <config.Icon className="h-[18px] w-[18px]" style={{ color: config.iconColor }} />
            </div>
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
          <p className="text-xs text-muted-foreground shrink-0">{timeAgo(report.confirmedAt ?? report.createdAt)}</p>
        </div>
      </CardHeader>

      {report.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </CardContent>
      )}

      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <span>Rapportert av {report.reportedBy.displayName}</span>
          {report.confirmedBy && (
            <span className="ml-2">· Bekreftet av {report.confirmedBy.displayName}</span>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleConfirm}
              disabled={confirming}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Bekreft
            </Button>
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={onEditStart}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
