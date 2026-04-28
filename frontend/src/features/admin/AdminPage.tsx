import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import type { AdminUser, AdminAssociation } from "@/api/types";
import { adminApi } from "./adminApi";
import { UsersTab } from "./UsersTab";
import { InvitesTab } from "./InvitesTab";
import { AssociationsTab } from "./AssociationsTab";

type Tab = "users" | "invites" | "associations";

export function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [associations, setAssociations] = useState<AdminAssociation[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "Admin" || user?.role === "SystemAdmin";
  const isSystemAdmin = user?.role === "SystemAdmin";

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate("/");
    }
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      try {
        const [usersData, assocData] = await Promise.all([
          adminApi.listUsers(),
          isSystemAdmin ? adminApi.listAssociations() : Promise.resolve([] as AdminAssociation[]),
        ]);
        setUsers(usersData ?? []);
        setAssociations(assocData ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, isSystemAdmin]);

  if (!isAuthenticated || !user || !isAdmin) return null;

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Administrer brukere og foreninger</p>
      </div>

      <div className="flex border-b gap-2">
        <button className={tabClass(tab === "users")} onClick={() => setTab("users")}>
          Brukere
        </button>
        <button className={tabClass(tab === "invites")} onClick={() => setTab("invites")}>
          Invitasjoner
        </button>
        {isSystemAdmin && (
          <button className={tabClass(tab === "associations")} onClick={() => setTab("associations")}>
            Foreninger
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Laster...</p>
      ) : (
        <>
          {tab === "users" && (
            <UsersTab
              users={users}
              currentUser={user}
              associations={associations}
              onUsersChanged={setUsers}
            />
          )}
          {tab === "invites" && (
            <InvitesTab
              currentUser={user}
              associations={associations}
              onUserInvited={(invited) => setUsers((prev) => [...prev, invited])}
            />
          )}
          {tab === "associations" && isSystemAdmin && (
            <AssociationsTab
              associations={associations}
              onAssociationsChanged={setAssociations}
            />
          )}
        </>
      )}
    </div>
  );
}
