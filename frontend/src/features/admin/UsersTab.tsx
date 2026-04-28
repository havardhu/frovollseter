import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUser, AdminAssociation, CurrentUser } from "@/api/types";
import { adminApi } from "./adminApi";

interface Props {
  users: AdminUser[];
  currentUser: CurrentUser;
  associations: AdminAssociation[];
  onUsersChanged: (users: AdminUser[]) => void;
}

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Alle roller" },
  { value: "Member", label: "Member" },
  { value: "Admin", label: "Admin" },
  { value: "SystemAdmin", label: "SystemAdmin" },
];

// Default filter hides suspended users; admins can opt back in.
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "active-and-pending", label: "Aktive (skjul suspenderte)" },
  { value: "all", label: "Alle" },
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Suspended", label: "Suspended" },
];

const DEFAULT_ROLE_FILTER = "all";
const DEFAULT_STATUS_FILTER = "active-and-pending";
const DEFAULT_ASSOCIATION_FILTER = "all";

function canManage(callerId: string, callerRole: string, target: AdminUser): boolean {
  if (callerId === target.id) return false;
  if (callerRole === "Admin" && target.role !== "Member") return false;
  return true;
}

function roleBadgeVariant(role: AdminUser["role"]) {
  if (role === "SystemAdmin") return "outline" as const;
  if (role === "Admin") return "secondary" as const;
  return "default" as const;
}

function statusBadgeVariant(status: AdminUser["status"]) {
  if (status === "Active") return "safe" as const;
  if (status === "Pending") return "caution" as const;
  return "danger" as const;
}

export function UsersTab({ users, currentUser, associations, onUsersChanged }: Props) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ displayName: "", phone: "", email: "", associationId: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [roleFilter, setRoleFilter] = useState<string>(DEFAULT_ROLE_FILTER);
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [associationFilter, setAssociationFilter] = useState<string>(DEFAULT_ASSOCIATION_FILTER);

  const isSystemAdmin = currentUser.role === "SystemAdmin";

  // Build the association options from the users actually present, falling back to the full
  // associations list for SystemAdmins (so they can pre-pick an association even if it's empty).
  const associationOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of users) {
      if (u.association && !seen.has(u.association.id)) {
        seen.set(u.association.id, u.association.name);
      }
    }
    if (isSystemAdmin) {
      for (const a of associations) {
        if (!seen.has(a.id)) seen.set(a.id, a.name);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "nb-NO"),
    );
  }, [users, associations, isSystemAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active-and-pending") {
        if (u.status === "Suspended") return false;
      } else if (statusFilter !== "all") {
        if (u.status !== statusFilter) return false;
      }
      if (associationFilter !== "all") {
        if (associationFilter === "none") {
          if (u.association) return false;
        } else if (u.association?.id !== associationFilter) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, associationFilter]);

  const filtersActive =
    roleFilter !== DEFAULT_ROLE_FILTER ||
    statusFilter !== DEFAULT_STATUS_FILTER ||
    associationFilter !== DEFAULT_ASSOCIATION_FILTER;
  const showAssociationFilter = isSystemAdmin || associationOptions.length > 1;

  const startEdit = (user: AdminUser) => {
    setEditDraft({
      displayName: user.displayName,
      phone: user.phone ?? "",
      email: user.email,
      associationId: user.association?.id ?? "",
    });
    setEditingUserId(user.id);
  };

  const cancelEdit = () => setEditingUserId(null);

  const handleSaveEdit = async (user: AdminUser) => {
    setEditLoading(true);
    try {
      const payload: Parameters<typeof adminApi.updateUser>[1] = {};
      if (editDraft.displayName !== user.displayName) payload.displayName = editDraft.displayName;
      if (editDraft.phone !== (user.phone ?? "")) payload.phone = editDraft.phone;
      if (currentUser.role === "SystemAdmin") {
        if (editDraft.email !== user.email) payload.email = editDraft.email;
        if (editDraft.associationId !== (user.association?.id ?? ""))
          payload.associationId = editDraft.associationId || undefined;
      }
      const updated = await adminApi.updateUser(user.id, payload);
      if (updated) {
        onUsersChanged(users.map((u) => (u.id === user.id ? updated : u)));
        toast.success("Bruker oppdatert");
        setEditingUserId(null);
      }
    } catch {
      toast.error("Kunne ikke oppdatere bruker");
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusChange = async (target: AdminUser) => {
    const newStatus = target.status === "Active" ? "Suspended" : "Active";
    try {
      const updated = await adminApi.updateStatus(target.id, newStatus);
      if (updated) {
        onUsersChanged(users.map((u) => (u.id === target.id ? updated : u)));
        toast.success(`Status oppdatert til ${newStatus}`);
      }
    } catch {
      toast.error("Kunne ikke oppdatere status");
    }
  };

  const handleRoleChange = async (target: AdminUser, role: string) => {
    try {
      const updated = await adminApi.updateRole(target.id, role);
      if (updated) {
        onUsersChanged(users.map((u) => (u.id === target.id ? updated : u)));
        toast.success(`Rolle oppdatert til ${role}`);
      }
    } catch {
      toast.error("Kunne ikke oppdatere rolle");
    }
  };

  const filterSelectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-role">Rolle</Label>
              <select
                id="filter-role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={filterSelectClass}
              >
                {ROLE_FILTERS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={filterSelectClass}
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {showAssociationFilter && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-assoc">Forening</Label>
                <select
                  id="filter-assoc"
                  value={associationFilter}
                  onChange={(e) => setAssociationFilter(e.target.value)}
                  className={filterSelectClass}
                >
                  <option value="all">Alle foreninger</option>
                  <option value="none">Uten forening</option>
                  {associationOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Viser {filteredUsers.length} av {users.length}{" "}
              {users.length === 1 ? "bruker" : "brukere"}
            </span>
            {filtersActive && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setRoleFilter(DEFAULT_ROLE_FILTER);
                  setStatusFilter(DEFAULT_STATUS_FILTER);
                  setAssociationFilter(DEFAULT_ASSOCIATION_FILTER);
                }}
              >
                Nullstill filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ingen brukere funnet.</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen brukere matcher filteret.
          </p>
        ) : null}
        {filteredUsers.map((user) => {
          const manageable = canManage(currentUser.id, currentUser.role, user);
          const isEditing = editingUserId === user.id;

          return (
            <Card key={user.id}>
              <CardContent className="flex flex-col gap-3 pt-4">
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-name-${user.id}`}>Navn</Label>
                        <Input
                          id={`edit-name-${user.id}`}
                          value={editDraft.displayName}
                          onChange={(e) => setEditDraft((d) => ({ ...d, displayName: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-phone-${user.id}`}>Telefon</Label>
                        <Input
                          id={`edit-phone-${user.id}`}
                          value={editDraft.phone}
                          placeholder="+47 000 00 000"
                          onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                        />
                      </div>
                      {currentUser.role === "SystemAdmin" && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`edit-email-${user.id}`}>E-post</Label>
                            <Input
                              id={`edit-email-${user.id}`}
                              type="email"
                              value={editDraft.email}
                              onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`edit-assoc-${user.id}`}>Forening</Label>
                            <select
                              id={`edit-assoc-${user.id}`}
                              value={editDraft.associationId}
                              onChange={(e) => setEditDraft((d) => ({ ...d, associationId: e.target.value }))}
                              className={filterSelectClass}
                            >
                              <option value="">Ingen forening</option>
                              {associations.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={editLoading}>
                        Avbryt
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(user)} disabled={editLoading}>
                        {editLoading ? "Lagrer..." : "Lagre"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                      )}
                      {user.association && (
                        <p className="text-xs text-muted-foreground">{user.association.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                      <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
                      {manageable && currentUser.role === "SystemAdmin" && (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="Member">Member</option>
                          <option value="Admin">Admin</option>
                          <option value="SystemAdmin">SystemAdmin</option>
                        </select>
                      )}
                      {manageable && (
                        <Button
                          size="sm"
                          variant={user.status === "Active" ? "destructive" : "outline"}
                          onClick={() => handleStatusChange(user)}
                        >
                          {user.status === "Active" ? "Suspender" : "Aktiver"}
                        </Button>
                      )}
                      {manageable && (
                        <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                          Rediger
                        </Button>
                      )}
                    </div>
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
