import { useEffect, useState } from "react";
import { Camera, Expand, Globe, Lock, Pencil, Plus, Trash2, Users, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { api } from "@/api/client";
import type { WebcamAccessLevel, WebcamStream } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";
import { WebcamForm } from "./WebcamForm";
import { WebcamLightbox } from "./WebcamLightbox";

const ACCESS_BADGE: Record<WebcamAccessLevel, { label: string; variant: "secondary" | "outline" | "default"; Icon: typeof Globe }> = {
  Public: { label: "Offentlig", variant: "secondary", Icon: Globe },
  Members: { label: "Medlemmer", variant: "default", Icon: Users },
  Private: { label: "Privat", variant: "outline", Icon: Lock },
};

export function WebcamsPage() {
  const { isAuthenticated, user } = useAuth();
  const [webcams, setWebcams] = useState<WebcamStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WebcamStream | undefined>(undefined);
  const [lightboxCam, setLightboxCam] = useState<WebcamStream | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<WebcamStream[]>("/webcams")
      .then(setWebcams)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (cam: WebcamStream) => {
    if (!confirm(`Slette kameraet «${cam.title}»?`)) return;
    await api.delete(`/webcams/${cam.id}`);
    load();
  };

  const handleSubmitted = () => {
    setShowForm(false);
    setEditing(undefined);
    load();
  };

  const startEdit = (cam: WebcamStream) => {
    setEditing(cam);
    setShowForm(true);
  };

  const startCreate = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Webkameraer</h1>
          <p className="text-sm text-muted-foreground">Live og daglige bilder fra området</p>
        </div>
        {isAuthenticated && !showForm && (
          <Button onClick={startCreate} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Legg til
          </Button>
        )}
      </div>

      {showForm && (
        <WebcamForm
          webcam={editing}
          onSubmitted={handleSubmitted}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : webcams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📷</p>
            <p>Ingen kameraer registrert ennå.</p>
            {isAuthenticated && (
              <p className="text-sm mt-2">Klikk «Legg til» for å registrere det første kameraet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {webcams.map((cam) => {
            const access = ACCESS_BADGE[cam.accessLevel];
            const isOwner = user?.id === cam.owner.id;
            const isVideo = cam.feedType === "VideoFeed";
            return (
              <Card key={cam.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLightboxCam(cam)}
                  className="relative w-full h-40 block group focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`Åpne ${cam.title} i fullskjerm`}
                >
                  {isVideo ? (
                    <div className="relative w-full h-full bg-black">
                      <iframe
                        src={cam.sourceUrl}
                        title={cam.title}
                        className="w-full h-full border-0 pointer-events-none"
                        allow="autoplay; fullscreen"
                      />
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-red-600/90 text-white text-[10px] font-semibold px-2 py-0.5">
                        <Video className="h-3 w-3" /> LIVE
                      </span>
                    </div>
                  ) : (cam.lastImageUrl || cam.sourceUrl) ? (
                    <img
                      src={cam.lastImageUrl ?? cam.sourceUrl}
                      alt={cam.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Camera className="h-9 w-9 text-muted-foreground opacity-35" />
                    </div>
                  )}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Expand className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                  </span>
                </button>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{cam.title}</CardTitle>
                    <Badge variant={access.variant} className="text-xs shrink-0 inline-flex items-center gap-1">
                      <access.Icon className="h-3 w-3" />
                      {access.label}
                    </Badge>
                  </div>
                  {cam.locationHint && (
                    <p className="text-xs text-muted-foreground">{cam.locationHint}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 pb-3 space-y-2">
                  {!isVideo && cam.lastImageAt && (
                    <p className="text-xs text-muted-foreground">
                      Sist oppdatert {formatDistanceToNow(new Date(cam.lastImageAt), { addSuffix: true, locale: nb })}
                    </p>
                  )}
                  {isOwner && (
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(cam)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Rediger
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(cam)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Slett
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {lightboxCam && (
        <WebcamLightbox webcam={lightboxCam} onClose={() => setLightboxCam(null)} />
      )}
    </div>
  );
}
