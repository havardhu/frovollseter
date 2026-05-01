import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { listCabins, getCabin } from "./api";
import type { CabinDetail, CabinSummary } from "./types";
import { CabinDataProvider } from "./CabinDataContext";
import { CabinSelector } from "./CabinSelector";
import { CreateCabinDialog } from "./CreateCabinDialog";
import { InventoryTab } from "./tabs/InventoryTab";
import { ShoppingListTab } from "./tabs/ShoppingListTab";
import { MembersTab } from "./tabs/MembersTab";
import { SettingsTab } from "./tabs/SettingsTab";

type Tab = "beholdning" | "handleliste" | "medlemmer" | "innstillinger";

const STORAGE_KEY = "lastCabinId";

export function MinHyttePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [cabins, setCabins] = useState<CabinSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<CabinDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<Tab>("beholdning");
  // Bumped to force MembersTab/SettingsTab to refresh when cabin changes.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, isLoading, navigate]);

  const loadCabins = async () => {
    setLoading(true);
    try {
      const list = await listCabins();
      setCabins(list);
      // Pick the active cabin: stored preference if still valid, else first.
      const stored = localStorage.getItem(STORAGE_KEY);
      const next =
        (stored && list.find((c) => c.id === stored)?.id) ?? list[0]?.id ?? null;
      setActiveId(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadCabins();
  }, [isAuthenticated]);

  // Pull full detail (members, my role) whenever the active cabin changes.
  useEffect(() => {
    if (!activeId) {
      setActiveDetail(null);
      return;
    }
    localStorage.setItem(STORAGE_KEY, activeId);
    getCabin(activeId)
      .then(setActiveDetail)
      .catch(() => setActiveDetail(null));
  }, [activeId, refreshKey]);

  if (isLoading || loading) {
    return <p className="text-sm text-muted-foreground">Laster...</p>;
  }

  if (cabins.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Min hytte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Du har ingen hytter ennå.
          </p>
        </div>
        {creating ? (
          <CreateCabinDialog
            onCreated={async () => {
              setCreating(false);
              await loadCabins();
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Opprett din første hytte
          </button>
        )}
      </div>
    );
  }

  if (!activeId || !activeDetail) {
    return <p className="text-sm text-muted-foreground">Laster hytta...</p>;
  }

  const isOwner = activeDetail.myRole === "Owner";

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{activeDetail.name}</h1>
          {creating ? null : cabins.length > 1 ? (
            <CabinSelector
              cabins={cabins}
              activeId={activeId}
              onSelect={(id) => {
                setActiveId(id);
                setTab("beholdning");
              }}
            />
          ) : null}
        </div>
        <div className="mt-2">
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Ny hytte
            </button>
          )}
        </div>
      </div>

      {creating && (
        <CreateCabinDialog
          onCreated={async (cabin) => {
            setCreating(false);
            await loadCabins();
            setActiveId(cabin.id);
            setTab("beholdning");
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="flex border-b gap-2 overflow-x-auto">
        <button className={tabClass(tab === "beholdning")} onClick={() => setTab("beholdning")}>
          Beholdning
        </button>
        <button className={tabClass(tab === "handleliste")} onClick={() => setTab("handleliste")}>
          Handleliste
        </button>
        <button className={tabClass(tab === "medlemmer")} onClick={() => setTab("medlemmer")}>
          Medlemmer
        </button>
        {isOwner && (
          <button
            className={tabClass(tab === "innstillinger")}
            onClick={() => setTab("innstillinger")}
          >
            Innstillinger
          </button>
        )}
      </div>

      <CabinDataProvider cabinId={activeId}>
        {tab === "beholdning" && <InventoryTab cabinId={activeId} />}
        {tab === "handleliste" && <ShoppingListTab cabinId={activeId} />}
        {tab === "medlemmer" && (
          <MembersTab
            cabinId={activeId}
            myRole={activeDetail.myRole}
            refreshKey={refreshKey}
            onChanged={async () => {
              // Self-removal etc — reload and pick a new active cabin.
              await loadCabins();
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
        {tab === "innstillinger" && isOwner && (
          <SettingsTab
            cabinId={activeId}
            cabinName={activeDetail.name}
            onRenamed={(newName) => {
              setActiveDetail((d) => (d ? { ...d, name: newName } : d));
              setCabins((cs) =>
                cs.map((c) => (c.id === activeId ? { ...c, name: newName } : c)),
              );
              setRefreshKey((k) => k + 1);
            }}
            onDeleted={async () => {
              await loadCabins();
              setTab("beholdning");
            }}
          />
        )}
      </CabinDataProvider>
    </div>
  );
}
