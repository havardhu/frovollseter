import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listStorages } from "./api";
import type { StorageDto } from "./types";

interface CabinDataValue {
  cabinId: string;
  storages: StorageDto[];
  refreshStorages: () => Promise<void>;
}

const Ctx = createContext<CabinDataValue | null>(null);

interface Props {
  cabinId: string;
  children: React.ReactNode;
}

export function CabinDataProvider({ cabinId, children }: Props) {
  const [storages, setStorages] = useState<StorageDto[]>([]);

  const refreshStorages = useCallback(async () => {
    const list = await listStorages(cabinId);
    setStorages(list);
  }, [cabinId]);

  useEffect(() => {
    setStorages([]);
    refreshStorages().catch(() => {
      // Errors here are surfaced by the page-level loading state — no toast spam.
    });
  }, [cabinId, refreshStorages]);

  return (
    <Ctx.Provider value={{ cabinId, storages, refreshStorages }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCabinData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCabinData must be used inside CabinDataProvider");
  return v;
}
