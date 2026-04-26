import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminUser, AdminAssociation } from "@/api/types";
import { adminApi } from "./adminApi";

interface Props {
  currentUserRole: string;
  associations: AdminAssociation[];
  onUserInvited: (user: AdminUser) => void;
}

export function InviteForm({ currentUserRole, associations, onUserInvited }: Props) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [associationId, setAssociationId] = useState("");
  const [role, setRole] = useState("Member");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await adminApi.inviteUser(
        email,
        displayName,
        currentUserRole === "SystemAdmin" ? associationId || undefined : undefined,
        role
      );
      if (user) {
        toast.success(`Invitasjon sendt til ${email}`);
        onUserInvited(user);
        setEmail("");
        setDisplayName("");
        setAssociationId("");
        setRole("Member");
      }
    } catch {
      toast.error("Kunne ikke sende invitasjon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inviter ny bruker</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">E-post</Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="navn@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-name">Navn</Label>
              <Input
                id="invite-name"
                type="text"
                required
                placeholder="Ola Nordmann"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Rolle</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {currentUserRole === "SystemAdmin" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-assoc">Forening</Label>
              <select
                id="invite-assoc"
                required
                value={associationId}
                onChange={(e) => setAssociationId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Velg forening...</option>
                {associations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Sender..." : "Send invitasjon"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
