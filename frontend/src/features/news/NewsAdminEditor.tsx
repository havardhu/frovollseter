import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Association, CurrentUser, NewsPost, NewsPostRequest } from "@/api/types";
import { NewsEditor } from "./NewsEditor";
import { newsApi } from "./newsApi";

interface Props {
  /** Existing post to edit, or undefined to create a new draft. */
  post?: NewsPost;
  currentUser: CurrentUser;
  associations: Association[];
  onSaved: (post: NewsPost) => void;
  onCancel: () => void;
}

const GLOBAL_VALUE = "__global__";

export function NewsAdminEditor({ post, currentUser, associations, onSaved, onCancel }: Props) {
  const isSystemAdmin = currentUser.role === "SystemAdmin";

  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const initialAssoc = useMemo(() => {
    if (!post) return currentUser.association.id;
    return post.association?.id ?? GLOBAL_VALUE;
  }, [post, currentUser.association.id]);
  const [associationId, setAssociationId] = useState(initialAssoc);
  const [saving, setSaving] = useState(false);

  // Reset form when switching between posts.
  useEffect(() => {
    setTitle(post?.title ?? "");
    setBody(post?.body ?? "");
    setAssociationId(initialAssoc);
  }, [post, initialAssoc]);

  // Plain admins can only post under their own association or as global.
  const selectableAssociations: { id: string; label: string }[] = isSystemAdmin
    ? [
        { id: GLOBAL_VALUE, label: "Global (alle foreninger)" },
        ...associations.map((a) => ({ id: a.id, label: a.name })),
      ]
    : [
        { id: currentUser.association.id, label: `${currentUser.association.name} (min)` },
        { id: GLOBAL_VALUE, label: "Global (alle foreninger)" },
      ];

  const buildPayload = (): NewsPostRequest => {
    const payload: NewsPostRequest = { title: title.trim(), body };
    if (associationId === GLOBAL_VALUE) payload.makeGlobal = true;
    else payload.associationId = associationId;
    return payload;
  };

  const handleSave = async (publishAfter: boolean) => {
    if (!title.trim()) {
      toast.error("Tittel er påkrevd");
      return;
    }
    if (!body || body === "<p><br></p>") {
      toast.error("Innhold er påkrevd");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const saved = post
        ? await newsApi.update(post.id, payload)
        : await newsApi.create(payload);

      // Editing a published post keeps it published – never auto-unpublish.
      const final = publishAfter && !saved.isPublished
        ? await newsApi.publish(saved.id)
        : saved;
      toast.success(publishAfter ? "Nyhet publisert" : "Lagret som utkast");
      onSaved(final);
    } catch (err) {
      console.error(err);
      toast.error("Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-title">Tittel</Label>
        <Input
          id="news-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kort, beskrivende tittel"
          maxLength={300}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="news-association">Forening</Label>
        <select
          id="news-association"
          value={associationId}
          onChange={(e) => setAssociationId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {selectableAssociations.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Velg hvilken forening posten hører til, eller "Global" for å vise den til alle.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Innhold</Label>
        {/* Re-mount editor when switching posts so initial HTML re-applies. */}
        <NewsEditor
          key={post?.id ?? "new"}
          initialHtml={post?.body ?? ""}
          onChange={setBody}
          placeholder="Skriv nyheten her…"
        />
      </div>

      <div className="flex justify-end gap-2 flex-wrap">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Avbryt
        </Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "Lagrer…" : post?.isPublished ? "Lagre" : "Lagre utkast"}
        </Button>
        {!post?.isPublished && (
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? "Lagrer…" : "Lagre og publiser"}
          </Button>
        )}
      </div>
    </div>
  );
}
