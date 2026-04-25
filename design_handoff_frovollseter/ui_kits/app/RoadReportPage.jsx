// Frovollseter — RoadReportPage + ReportForm (mono SVG icons)

const { useState } = React;

// ─── Lucide-style SVG icons ───────────────────────────────────
const Icon = ({ children, size = 16, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const IconCheck      = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const IconCheckCircle= (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>;
const IconTruck      = (p) => <Icon {...p}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Icon>;
const IconAlertTri   = (p) => <Icon {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>;
const IconDroplet    = (p) => <Icon {...p}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></Icon>;
const IconXCircle    = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></Icon>;
const IconLock       = (p) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const IconHelp       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>;
const IconRefresh    = (p) => <Icon {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Icon>;
const IconPlus       = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;

const STATUS_CONFIG = {
  Unknown:                  { label: "Ukjent",          variant: "outline",  IconComp: IconHelp,      color: "hsl(215.4 16.3% 46.9%)" },
  RecentlyPlowed:           { label: "Nettopp brøytet", variant: "safe",     IconComp: IconTruck,     color: "#166534" },
  SummerTiresOk:            { label: "Sommerdekk OK",   variant: "safe",     IconComp: IconCheckCircle,color: "#166534" },
  FourWheelDriveRecommended:{ label: "4WD anbefalt",    variant: "caution",  IconComp: IconAlertTri,  color: "#92400e" },
  FloodDamage:              { label: "Flomskade",       variant: "danger",   IconComp: IconDroplet,   color: "#991b1b" },
  UnsafeDangerous:          { label: "Farlig",          variant: "danger",   IconComp: IconXCircle,   color: "#991b1b" },
  Closed:                   { label: "Stengt",          variant: "closed",   IconComp: IconLock,      color: "#4b5563" },
};

const STATUS_OPTIONS = [
  { value: "RecentlyPlowed",             label: "Nettopp brøytet", IconComp: IconTruck },
  { value: "SummerTiresOk",             label: "Sommerdekk OK",   IconComp: IconCheckCircle },
  { value: "FourWheelDriveRecommended", label: "4WD anbefalt",    IconComp: IconAlertTri },
  { value: "FloodDamage",               label: "Flomskade",       IconComp: IconDroplet },
  { value: "UnsafeDangerous",           label: "Farlig / usikker", IconComp: IconXCircle },
  { value: "Closed",                    label: "Stengt",           IconComp: IconLock },
];

const MOCK_REPORTS = [
  { id: 1, status: "RecentlyPlowed", roadSegment: "Fra bommen til første sving", description: "Helt fritt framkommeleg, godt brøyta.", createdAt: new Date(Date.now() - 3600000).toISOString(), reportedBy: { displayName: "Håvard" }, isStale: false },
  { id: 2, status: "FourWheelDriveRecommended", roadSegment: null, description: "Litt is på skyggesiden ved bekken.", createdAt: new Date(Date.now() - 7200000 * 4).toISOString(), reportedBy: { displayName: "Kari" }, isStale: false },
  { id: 3, status: "SummerTiresOk", roadSegment: "Hele strekningen", description: null, createdAt: new Date(Date.now() - 3600000 * 72).toISOString(), reportedBy: { displayName: "Ole" }, isStale: true },
];

function timeAgo(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (diff < 1) return "akkurat nå";
  if (diff < 60) return `for ${diff} min siden`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `for ${h} time${h > 1 ? "r" : ""} siden`;
  const d = Math.floor(h / 24);
  return `for ${d} dag${d > 1 ? "er" : ""} siden`;
}

function ReportForm({ onSubmitted, onCancel }) {
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [roadSegment, setRoadSegment] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!status) { setError("Velg veiforhold."); return; }
    onSubmitted({ id: Date.now(), status, roadSegment: roadSegment || null, description: description || null, createdAt: new Date().toISOString(), reportedBy: { displayName: "Deg" }, isStale: false });
  };

  return (
    <Card style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      <CardHeader><p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Rapporter veiforhold</p></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Tilstand</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  className={"frv-opt-btn" + (status === opt.value ? " active" : "")}>
                  <opt.IconComp size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="segment">Vegstrekning (valgfritt)</Label>
            <Input id="segment" placeholder='f.eks. «Fra bommen til første sving»' value={roadSegment} onChange={e => setRoadSegment(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="desc">Merknad (valgfritt)</Label>
            <Input id="desc" placeholder="Kort beskrivelse…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {error && <p style={{ fontSize: 13, color: "hsl(0 84.2% 60.2%)", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" className="frv-flex-1">Send rapport</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RoadReportCard({ report }) {
  const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.Unknown;
  const { IconComp, color } = config;
  return (
    <Card style={report.isStale ? { opacity: 0.6 } : {}}>
      <CardHeader>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconComp size={18} color={color} />
            </div>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge variant={config.variant}>{config.label}</Badge>
                {report.isStale && <Badge variant="outline" style={{ fontSize: 10 }}>Utdatert</Badge>}
              </div>
              {report.roadSegment && <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 500 }}>{report.roadSegment}</p>}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{timeAgo(report.createdAt)}</p>
        </div>
      </CardHeader>
      {report.description && (
        <CardContent><p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{report.description}</p></CardContent>
      )}
      <div style={{ padding: "0 16px 12px" }}>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Rapportert av {report.reportedBy.displayName}</p>
      </div>
    </Card>
  );
}

function RoadReportPage({ isAuthenticated }) {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleReported = (report) => {
    setReports([report, ...reports]);
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="frv-page-title">Veiforhold</h1>
          <p className="frv-page-subtitle">Siste rapporter fra veien opp til hyttene</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <IconRefresh size={16} style={loading ? { animation: "frv-spin 1s linear infinite" } : {}} />
          </Button>
          {isAuthenticated && (
            <Button onClick={() => setShowForm(true)}>
              <IconPlus size={16} /> Rapporter
            </Button>
          )}
        </div>
      </div>

      {showForm && <ReportForm onSubmitted={handleReported} onCancel={() => setShowForm(false)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reports.map(r => <RoadReportCard key={r.id} report={r} />)}
      </div>
    </div>
  );
}

Object.assign(window, { RoadReportPage, Icon, IconCheck, IconCheckCircle, IconTruck, IconAlertTri, IconDroplet, IconXCircle, IconLock, IconHelp, IconRefresh, IconPlus });
