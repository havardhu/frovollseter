import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import type { Association, NewsPost } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { newsApi } from "./newsApi";

const ALL = "__all__";
const GLOBAL = "global";

export function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(ALL);

  // Load associations once for the filter dropdown.
  useEffect(() => {
    newsApi.listAssociations().then(setAssociations).catch(() => {
      /* non-fatal – filter just won't have options */
    });
  }, []);

  // Reload feed whenever the filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params =
      filter === ALL ? undefined :
      filter === GLOBAL ? { associationId: "global" as const } :
      { associationId: filter };
    newsApi
      .listFeed(params)
      .then((d) => { if (!cancelled) setPosts(d.items); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Nyheter</h1>
          <p className="text-sm text-muted-foreground">Fra hytteeierlag, grunneiere og veglag</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrer på forening"
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value={ALL}>Alle foreninger</option>
          <option value={GLOBAL}>Globale</option>
          {associations.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📰</p>
            <p>Ingen nyheter for dette filteret.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => <NewsCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}

function NewsCard({ post }: { post: NewsPost }) {
  // Sanitize once per render. DOMPurify is cheap, but memoising keeps things
  // tidy if the post object is re-used between renders.
  const safeHtml = useMemo(
    () => DOMPurify.sanitize(post.body, { USE_PROFILES: { html: true } }),
    [post.body],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{post.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{post.association?.name ?? "Global"}</Badge>
              <span className="text-xs text-muted-foreground">
                {post.publishedAt
                  ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true, locale: nb })
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="news-content"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </CardContent>
    </Card>
  );
}
