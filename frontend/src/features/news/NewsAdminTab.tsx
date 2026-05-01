import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Association, CurrentUser, NewsPost } from "@/api/types";
import { newsApi } from "./newsApi";
import { NewsAdminEditor } from "./NewsAdminEditor";

interface Props {
  currentUser: CurrentUser;
}

type Mode = { kind: "list" } | { kind: "edit"; post?: NewsPost };

export function NewsAdminTab({ currentUser }: Props) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [postsData, assocData] = await Promise.all([
          newsApi.listAdmin(),
          newsApi.listAssociations(),
        ]);
        if (cancelled) return;
        setPosts(postsData ?? []);
        setAssociations(assocData ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error("Kunne ikke laste nyheter");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const upsert = (saved: NewsPost) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const handlePublishToggle = async (post: NewsPost) => {
    try {
      const updated = post.isPublished
        ? await newsApi.unpublish(post.id)
        : await newsApi.publish(post.id);
      upsert(updated);
      toast.success(post.isPublished ? "Avpublisert" : "Publisert");
    } catch {
      toast.error("Kunne ikke endre publisering");
    }
  };

  const handleDelete = async (post: NewsPost) => {
    if (!confirm(`Slett "${post.title}"?`)) return;
    try {
      await newsApi.remove(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Slettet");
    } catch {
      toast.error("Kunne ikke slette");
    }
  };

  if (mode.kind === "edit") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{mode.post ? "Rediger nyhet" : "Ny nyhet"}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewsAdminEditor
            post={mode.post}
            currentUser={currentUser}
            associations={associations}
            onSaved={(saved) => {
              upsert(saved);
              setMode({ kind: "list" });
            }}
            onCancel={() => setMode({ kind: "list" })}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setMode({ kind: "edit" })}>
          <Plus className="h-4 w-4 mr-1" />
          Ny nyhet
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Laster...</p>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Ingen nyheter ennå. Klikk "Ny nyhet" for å lage den første.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex flex-col gap-2 pt-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{post.title}</p>
                    <div className="flex gap-2 items-center flex-wrap mt-1">
                      <Badge variant={post.isPublished ? "default" : "secondary"}>
                        {post.isPublished ? "Publisert" : "Utkast"}
                      </Badge>
                      <Badge variant="outline">
                        {post.association?.name ?? "Global"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Av {post.author.displayName}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMode({ kind: "edit", post })}>
                      Rediger
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePublishToggle(post)}>
                      {post.isPublished ? "Avpubliser" : "Publiser"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(post)}>
                      Slett
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
