// Frovollseter — NewsPage, WebcamsPage, LinksPage, LoginPage
// Requires: Components.jsx exported to window

const { useState } = React;

// ─── Shared Icon helper (reused from RoadReportPage) ─────────
const SvgIcon = ({ children, size = 16, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const IconCamera   = (p) => <SvgIcon {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></SvgIcon>;
const IconLink     = (p) => <SvgIcon {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></SvgIcon>;
const IconNewspaper= (p) => <SvgIcon {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm0 0H4a2 2 0 0 1-2-2v-9"/><line x1="16" y1="6" x2="8" y2="6"/><line x1="16" y1="10" x2="8" y2="10"/><line x1="11" y1="14" x2="8" y2="14"/></SvgIcon>;
const IconRoad     = (p) => <SvgIcon {...p}><path d="M12 2L8 22"/><path d="M12 2l4 20"/><path d="M3 12h18"/></SvgIcon>;
const IconMail     = (p) => <SvgIcon {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></SvgIcon>;

// ── Shared time helper ─────────────────────────────────────────
function timeAgo(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (diff < 60) return `for ${diff || 1} min siden`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `for ${h} time${h > 1 ? "r" : ""} siden`;
  const d = Math.floor(h / 24);
  return `for ${d} dag${d > 1 ? "er" : ""} siden`;
}

// ── NewsPage ──────────────────────────────────────────────────
const MOCK_NEWS = [
  { id: 1, title: "Dugnad lørdag 3. mai — møt opp kl. 10", body: "Vi møtes ved bommen for å rydde veikanten etter vinteren. Ta med ryddehanskene. Kaffe og vafler serveres!", association: { name: "Veglag" }, publishedAt: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: 2, title: "Ny nøkkeldistribusjon for 2025-sesongen", body: "Alle hytteeiere må hente ny brikke til bommen innen 1. mai. Ta kontakt med styret på e-post.", association: { name: "Hytteeierlag" }, publishedAt: new Date(Date.now() - 3600000 * 120).toISOString() },
  { id: 3, title: "Brøytesesongen er over for i år", body: "Takk til alle som bidrog! Veien er nå åpen for sommerkjøring.", association: { name: "Veglag" }, publishedAt: new Date(Date.now() - 3600000 * 240).toISOString() },
];

function NewsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="frv-page-title">Nyheter</h1>
        <p className="frv-page-subtitle">Fra hytteeierlag, grunneiere og veglag</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {MOCK_NEWS.map(post => (
          <Card key={post.id}>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{post.title}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant="secondary">{post.association.name}</Badge>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{timeAgo(post.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "var(--foreground)" }}>{post.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── WebcamsPage ───────────────────────────────────────────────
const MOCK_WEBCAMS = [
  { id: 1, title: "Bommen — innkjøring", locationHint: "Ved bomstasjonen, sørvendt", isPublic: true, lastImageUrl: null, lastImageAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, title: "Toppen av bakken", locationHint: "Utsikt mot fjorden", isPublic: false, lastImageUrl: null, lastImageAt: new Date(Date.now() - 7200000).toISOString() },
];

function WebcamsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="frv-page-title">Webkameraer</h1>
        <p className="frv-page-subtitle">Live og daglige bilder fra området</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {MOCK_WEBCAMS.map(cam => (
          <Card key={cam.id} style={{ overflow: "hidden" }}>
            <div style={{ width: "100%", height: 160, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconCamera size={36} color="var(--muted-foreground)" style={{ opacity: 0.35 }} />
            </div>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{cam.title}</p>
                <Badge variant={cam.isPublic ? "secondary" : "outline"} style={{ fontSize: 11, whiteSpace: "nowrap" }}>{cam.isPublic ? "Offentlig" : "Privat"}</Badge>
              </div>
              {cam.locationHint && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{cam.locationHint}</p>}
            </CardHeader>
            {cam.lastImageAt && (
              <CardContent><p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Sist oppdatert {timeAgo(cam.lastImageAt)}</p></CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── LinksPage ─────────────────────────────────────────────────
const MOCK_LINKS = [
  { id: 1, title: "Yr.no — Frovollseter", description: "Værvarsling for hytta", url: "#", category: "Vær og føre" },
  { id: 2, title: "Statens vegvesen — Vegmeldingen", description: "Offisielle veiforhold i området", url: "#", category: "Vær og føre" },
  { id: 3, title: "Kommunens nettside", description: "Lokal informasjon fra kommunen", url: "#", category: "Offentlig" },
  { id: 4, title: "Hytteeierlagets vedtekter", description: "Gjeldende vedtekter for laget", url: "#", category: "Dokumenter" },
];

function LinksPage() {
  const byCategory = MOCK_LINKS.reduce((acc, link) => {
    const cat = link.category || "Annet";
    (acc[cat] = acc[cat] || []).push(link);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="frv-page-title">Nyttige lenker</h1>
        <p className="frv-page-subtitle">Viktig informasjon og ressurser for hytteeiere</p>
      </div>
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>{cat}</h2>
          {items.map(link => (
            <a key={link.id} href={link.url}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", textDecoration: "none", transition: "background .15s", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
            >
              <IconLink size={16} color="var(--muted-foreground)" style={{ marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>{link.title}</p>
                {link.description && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{link.description}</p>}
              </div>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── LoginPage ─────────────────────────────────────────────────
function LoginPage({ onLogin, onBack }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState("link");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(mode === "link" ? "link-sent" : "otp"); }, 700);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otp === "123456") { onLogin(); }
      else { setError("Ugyldig eller utløpt kode. Prøv igjen."); }
    }, 700);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", padding: 16 }}>
      <div style={{ padding: "8px 0" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--muted-foreground)", fontFamily: "inherit", padding: "6px 8px", borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Tilbake
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Card>
          <CardHeader>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏔️</div>
              <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Frovollseter</p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)" }}>Logg inn for å se hytte- og veiinformasjon</p>
            </div>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Label htmlFor="email">E-postadresse</Label>
                  <Input id="email" type="email" placeholder="deg@example.no" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["link", "otp"].map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      style={{ flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${mode === m ? "hsl(213 72% 30%)" : "var(--border)"}`, background: mode === m ? "hsl(213 72% 30% / .08)" : "transparent", color: mode === m ? "hsl(213 72% 30%)" : "var(--muted-foreground)", fontWeight: mode === m ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      {m === "link" ? "Lenke på e-post" : "Engangskode"}
                    </button>
                  ))}
                </div>
                {error && <p style={{ fontSize: 13, color: "hsl(0 84.2% 60.2%)", margin: 0 }}>{error}</p>}
                <Button type="submit" disabled={loading}>{loading ? "Sender…" : mode === "link" ? "Send innloggingslenke" : "Send engangskode"}</Button>
              </form>
            )}
            {step === "link-sent" && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
                <IconMail size={36} color="var(--muted-foreground)" style={{ margin: "0 auto" }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Sjekk innboksen din</p>
                <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)" }}>Vi har sendt en innloggingslenke til <strong>{email}</strong>. Lenken er gyldig i 15 minutter.</p>
                <Button variant="ghost" size="sm" onClick={() => setStep("email")}>Prøv igjen</Button>
              </div>
            )}
            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)" }}>Vi sendte en 6-sifret kode til <strong>{email}</strong>.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Label htmlFor="otp">Engangskode</Label>
                  <Input id="otp" type="text" inputMode="numeric" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} autoComplete="one-time-code" />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Hint: skriv inn 123456</span>
                </div>
                {error && <p style={{ fontSize: 13, color: "hsl(0 84.2% 60.2%)", margin: 0 }}>{error}</p>}
                <Button type="submit" disabled={loading || otp.length < 6}>{loading ? "Sjekker…" : "Logg inn"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>Tilbake</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

Object.assign(window, { NewsPage, WebcamsPage, LinksPage, LoginPage });
