import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAssociation } from "@/api/types";
import { adminApi } from "./adminApi";

const ASSOCIATION_TYPES = ["Hytteeierlag", "Veglag", "Grunneier"] as const;

interface Props {
  associations: AdminAssociation[];
  onAssociationsChanged: (associations: AdminAssociation[]) => void;
}

export function AssociationsTab({ associations, onAssociationsChanged }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await adminApi.createAssociation(name, type);
      if (created) {
        onAssociationsChanged([...associations, created]);
        toast.success(`Forening "${name}" opprettet`);
        setName("");
        setType("");
      }
    } catch {
      toast.error("Kunne ikke opprette forening");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (assoc: AdminAssociation) => {
    setEditName(assoc.name);
    setEditType(assoc.type);
    setEditingId(assoc.id);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (assoc: AdminAssociation) => {
    setEditLoading(true);
    try {
      const payload: { name?: string; type?: string } = {};
      if (editName !== assoc.name) payload.name = editName;
      if (editType !== assoc.type) payload.type = editType;
      const updated = await adminApi.updateAssociation(assoc.id, payload);
      if (updated) {
        onAssociationsChanged(associations.map((a) => (a.id === assoc.id ? updated : a)));
        toast.success("Forening oppdatert");
        setEditingId(null);
      }
    } catch {
      toast.error("Kunne ikke oppdatere forening");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Opprett forening</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assoc-name">Navn</Label>
                <Input
                  id="assoc-name"
                  type="text"
                  required
                  placeholder="Frovollseter Veglag"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assoc-type">Type</Label>
                <select
                  id="assoc-type"
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Velg type...</option>
                  {ASSOCIATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Oppretter..." : "Opprett forening"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {associations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Ingen foreninger.</p>
        )}
        {associations.map((assoc) => {
          const isEditing = editingId === assoc.id;
          return (
            <Card key={assoc.id}>
              <CardContent className="flex flex-col gap-3 pt-4">
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-assoc-name-${assoc.id}`}>Navn</Label>
                        <Input
                          id={`edit-assoc-name-${assoc.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-assoc-type-${assoc.id}`}>Type</Label>
                        <select
                          id={`edit-assoc-type-${assoc.id}`}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {ASSOCIATION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={editLoading}>
                        Avbryt
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(assoc)} disabled={editLoading}>
                        {editLoading ? "Lagrer..." : "Lagre"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{assoc.name}</p>
                      <p className="text-sm text-muted-foreground">{assoc.memberCount} medlemmer</p>
                    </div>
                    <Badge variant="secondary">{assoc.type}</Badge>
                    <Button size="sm" variant="outline" onClick={() => startEdit(assoc)}>
                      Rediger
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
