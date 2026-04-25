import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api } from "@/api/client";
import type { UsefulLink } from "@/api/types";
import { Card, CardContent } from "@/components/ui/card";

export function LinksPage() {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UsefulLink[]>("/links").then(setLinks).finally(() => setLoading(false));
  }, []);

  const byCategory = links.reduce<Record<string, UsefulLink[]>>((acc, link) => {
    const cat = link.category ?? "Annet";
    (acc[cat] ??= []).push(link);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nyttige lenker</h1>
        <p className="text-sm text-muted-foreground">Viktig informasjon og ressurser for hytteeiere</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">🔗</p>
            <p>Ingen lenker ennå.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {category}
            </h2>
            <div className="space-y-2">
              {items.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 group-hover:text-primary" />
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary">{link.title}</p>
                    {link.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
