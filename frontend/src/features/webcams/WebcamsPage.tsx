import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { api } from "@/api/client";
import type { WebcamStream } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WebcamsPage() {
  const [webcams, setWebcams] = useState<WebcamStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WebcamStream[]>("/webcams").then(setWebcams).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webkameraer</h1>
        <p className="text-sm text-muted-foreground">Live og daglige bilder fra området</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : webcams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📷</p>
            <p>Ingen kameraer registrert ennå.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {webcams.map((cam) => (
            <Card key={cam.id} className="overflow-hidden">
              {cam.lastImageUrl ? (
                <img
                  src={cam.lastImageUrl}
                  alt={cam.title}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center text-3xl">📷</div>
              )}
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{cam.title}</CardTitle>
                  <Badge variant={cam.isPublic ? "secondary" : "outline"} className="text-xs shrink-0">
                    {cam.isPublic ? "Offentlig" : "Privat"}
                  </Badge>
                </div>
                {cam.locationHint && (
                  <p className="text-xs text-muted-foreground">{cam.locationHint}</p>
                )}
              </CardHeader>
              {cam.lastImageAt && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-xs text-muted-foreground">
                    Sist oppdatert {formatDistanceToNow(new Date(cam.lastImageAt), { addSuffix: true, locale: nb })}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
