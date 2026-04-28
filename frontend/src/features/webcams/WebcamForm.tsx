import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type { WebcamAccessLevel, WebcamFeedType, WebcamStream } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  webcam?: WebcamStream;
  onSubmitted: () => void;
  onCancel: () => void;
}

const ACCESS_LEVELS: { value: WebcamAccessLevel; label: string; help: string }[] = [
  { value: "Public", label: "Offentlig", help: "Alle kan se kameraet (også uinnloggede)" },
  { value: "Members", label: "Medlemmer", help: "Bare innloggede medlemmer kan se kameraet" },
  { value: "Private", label: "Privat", help: "Bare du kan se kameraet" },
];

const FEED_TYPES: { value: WebcamFeedType; label: string; help: string }[] = [
  { value: "StaticImage", label: "Stillbilde", help: "URL til siste bilde (oppdateres med jevne mellomrom)" },
  { value: "VideoFeed", label: "Videofeed", help: "Direktestrøm (HLS, MJPEG eller iframe-kompatibel URL)" },
];

export function WebcamForm({ webcam, onSubmitted, onCancel }: Props) {
  const [title, setTitle] = useState(webcam?.title ?? "");
  const [description, setDescription] = useState(webcam?.description ?? "");
  const [locationHint, setLocationHint] = useState(webcam?.locationHint ?? "");
  const [sourceUrl, setSourceUrl] = useState(webcam?.sourceUrl ?? "");
  const [accessLevel, setAccessLevel] = useState<WebcamAccessLevel>(webcam?.accessLevel ?? "Members");
  const [feedType, setFeedType] = useState<WebcamFeedType>(webcam?.feedType ?? "StaticImage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!webcam;

  useEffect(() => {
    setTitle(webcam?.title ?? "");
    setDescription(webcam?.description ?? "");
    setLocationHint(webcam?.locationHint ?? "");
    setSourceUrl(webcam?.sourceUrl ?? "");
    setAccessLevel(webcam?.accessLevel ?? "Members");
    setFeedType(webcam?.feedType ?? "StaticImage");
  }, [webcam?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Tittel er påkrevd."); return; }
    if (!sourceUrl.trim()) { setError("Kilde-URL er påkrevd."); return; }
    setError("");
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        locationHint: locationHint.trim() || null,
        accessLevel,
        feedType,
        sourceUrl: sourceUrl.trim(),
      };
      if (isEdit) {
        await api.patch(`/webcams/${webcam!.id}`, body);
      } else {
        await api.post("/webcams", body);
      }
      onSubmitted();
    } catch {
      setError("Kunne ikke lagre kamera. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{isEdit ? "Rediger kamera" : "Legg til kamera"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel</Label>
            <Input
              id="title"
              placeholder="f.eks. «Innkjørselen»"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationHint">Plassering (valgfritt)</Label>
            <Input
              id="locationHint"
              placeholder="f.eks. «Hytta nordsiden»"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
            <Input
              id="description"
              placeholder="Kort om kameraet…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {FEED_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedType(opt.value)}
                  className={`flex flex-col gap-0.5 rounded-md border p-2 text-sm text-left transition-colors ${
                    feedType === opt.value
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.help}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">
              {feedType === "VideoFeed" ? "Strøm-URL" : "Bilde-URL"}
            </Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder={feedType === "VideoFeed" ? "https://…/stream.m3u8" : "https://…/snapshot.jpg"}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tilgang</Label>
            <div className="space-y-1.5">
              {ACCESS_LEVELS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccessLevel(opt.value)}
                  className={`w-full flex flex-col gap-0.5 rounded-md border p-2 text-sm text-left transition-colors ${
                    accessLevel === opt.value
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.help}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Lagrer…" : isEdit ? "Lagre endringer" : "Legg til kamera"}
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
