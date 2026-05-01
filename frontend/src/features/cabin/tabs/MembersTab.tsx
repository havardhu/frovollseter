import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/AuthContext";
import { getCabin, removeMember } from "../api";
import type { CabinMemberDto, CabinRole } from "../types";
import { AddMemberDialog } from "../components/AddMemberDialog";

interface Props {
  cabinId: string;
  myRole: CabinRole;
  // Bumped from MinHyttePage when cabin detail might have changed (rename, etc).
  refreshKey: number;
  onChanged: () => void;
}

export function MembersTab({ cabinId, myRole, refreshKey, onChanged }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CabinMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const isOwner = myRole === "Owner";

  const load = async () => {
    setLoading(true);
    try {
      const detail = await getCabin(cabinId);
      setMembers(detail.members);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinId, refreshKey]);

  const handleRemove = async (m: CabinMemberDto) => {
    const isSelf = m.userId === user?.id;
    const msg = isSelf
      ? "Vil du forlate hytta?"
      : `Fjerne ${m.displayName} fra hytta?`;
    if (!confirm(msg)) return;
    try {
      await removeMember(cabinId, m.userId);
      toast.success(isSelf ? "Du har forlatt hytta" : "Medlem fjernet");
      if (isSelf) {
        onChanged();
      } else {
        await load();
      }
    } catch {
      toast.error("Kunne ikke fjerne medlemmet");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {showAdd && isOwner && (
        <AddMemberDialog
          cabinId={cabinId}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {!showAdd && isOwner && (
        <Button variant="outline" onClick={() => setShowAdd(true)} className="self-start">
          <Plus className="h-4 w-4 mr-1" /> Legg til medlem
        </Button>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Laster...</p>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => {
          const isSelf = m.userId === user?.id;
          return (
            <Card key={m.userId}>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {m.displayName}
                    {isSelf && (
                      <span className="text-muted-foreground font-normal"> (deg)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Ble medlem {format(parseISO(m.joinedAt), "dd.MM.yyyy", { locale: nb })}
                  </p>
                </div>
                <Badge variant={m.role === "Owner" ? "default" : "secondary"}>
                  {m.role === "Owner" ? "Eier" : "Medlem"}
                </Badge>
                {(isOwner || isSelf) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(m)}
                    aria-label={isSelf ? "Forlat hytta" : `Fjern ${m.displayName}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
