import { useEffect, useRef, useState } from "react";
import { Maximize2, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import type { WebcamStream } from "@/api/types";

interface Props {
  webcam: WebcamStream;
  onClose: () => void;
}

export function WebcamLightbox({ webcam, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVideo = webcam.feedType === "VideoFeed";
  const baseSrc = isVideo
    ? webcam.sourceUrl
    : (webcam.lastImageUrl ?? webcam.sourceUrl);
  const [bust, setBust] = useState(0);

  // Append a cache-buster for static images so "Oppdater" actually fetches a new copy.
  const imageSrc = baseSrc
    ? bust > 0
      ? baseSrc + (baseSrc.includes("?") ? "&" : "?") + "_=" + bust
      : baseSrc
    : null;

  // Close on ESC + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const goNativeFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.().catch(() => { /* ignore */ });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={webcam.title}
    >
      {/* Top bar */}
      <div
        className="flex items-start justify-between gap-3 p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{webcam.title}</h2>
          {webcam.locationHint && (
            <p className="text-sm text-white/70 truncate">{webcam.locationHint}</p>
          )}
          {!isVideo && webcam.lastImageAt && (
            <p className="text-xs text-white/50 mt-0.5">
              Sist oppdatert {formatDistanceToNow(new Date(webcam.lastImageAt), { addSuffix: true, locale: nb })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isVideo && (
            <button
              type="button"
              onClick={() => setBust(Date.now())}
              className="p-2 rounded-md hover:bg-white/10 text-white/80 hover:text-white"
              aria-label="Oppdater bilde"
              title="Oppdater bilde"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={goNativeFullscreen}
            className="p-2 rounded-md hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Fullskjerm"
            title="Fullskjerm"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Lukk"
            title="Lukk (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Feed area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <iframe
            src={webcam.sourceUrl}
            title={webcam.title}
            className="w-full h-full border-0 rounded-md bg-black"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={webcam.title}
            className="max-w-full max-h-full object-contain rounded-md"
          />
        ) : (
          <p className="text-white/60 text-sm">Ingen bilde tilgjengelig.</p>
        )}
      </div>

      {webcam.description && (
        <div
          className="text-sm text-white/70 px-4 pb-4 max-w-3xl mx-auto w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {webcam.description}
        </div>
      )}
    </div>
  );
}
