import { api } from "@/api/client";
import type {
  CabinDetail,
  CabinSummary,
  CabinMemberDto,
  GrocerySuggestion,
  InventoryItemDto,
  PurchaseResult,
  ShoppingItemDto,
  StorageDto,
  StorageIcon,
  AddToInventoryOnPurchase,
} from "./types";

// Cabins
export const listCabins = () => api.get<CabinSummary[]>("/cabins/");
export const createCabin = (name: string) =>
  api.post<CabinSummary>("/cabins/", { name });
export const getCabin = (id: string) => api.get<CabinDetail>(`/cabins/${id}`);
export const updateCabin = (id: string, name: string) =>
  api.patch<{ id: string; name: string }>(`/cabins/${id}`, { name });
export const deleteCabin = (id: string) => api.delete<void>(`/cabins/${id}`);

// Members
export const addMember = (cabinId: string, email: string) =>
  api.post<CabinMemberDto>(`/cabins/${cabinId}/members`, { email });
export const removeMember = (cabinId: string, userId: string) =>
  api.delete<void>(`/cabins/${cabinId}/members/${userId}`);
export const updateMemberRole = (
  cabinId: string,
  userId: string,
  role: "Owner" | "Member",
) =>
  api.patch<{ userId: string; role: string }>(
    `/cabins/${cabinId}/members/${userId}`,
    { role },
  );

// Storages
export const listStorages = (cabinId: string) =>
  api.get<StorageDto[]>(`/cabins/${cabinId}/storages`);
export const createStorage = (
  cabinId: string,
  name: string,
  icon: StorageIcon,
  isTempControlled: boolean,
) =>
  api.post<StorageDto>(`/cabins/${cabinId}/storages`, {
    name,
    icon,
    isTempControlled,
  });
export const updateStorage = (
  cabinId: string,
  storageId: string,
  patch: Partial<{
    name: string;
    icon: StorageIcon;
    isTempControlled: boolean;
    sortOrder: number;
  }>,
) => api.patch<StorageDto>(`/cabins/${cabinId}/storages/${storageId}`, patch);
export const deleteStorage = (
  cabinId: string,
  storageId: string,
  force = false,
) =>
  api.delete<void>(
    `/cabins/${cabinId}/storages/${storageId}${force ? "?force=true" : ""}`,
  );
export const reorderStorages = (cabinId: string, orderedIds: string[]) =>
  api.post<void>(`/cabins/${cabinId}/storages/reorder`, { orderedIds });

// Groceries
export const searchGroceries = (cabinId: string, q: string) => {
  const qs = q ? `?q=${encodeURIComponent(q)}&limit=20` : "?limit=20";
  return api.get<GrocerySuggestion[]>(`/cabins/${cabinId}/groceries${qs}`);
};
export const getLastStorageForGrocery = (cabinId: string, groceryId: string) =>
  api.get<{ storageId: string | null }>(
    `/cabins/${cabinId}/groceries/${groceryId}/last-storage`,
  );

// Inventory
export const listInventory = (cabinId: string, storageId?: string) => {
  const qs = storageId ? `?storageId=${storageId}` : "";
  return api.get<InventoryItemDto[]>(`/cabins/${cabinId}/inventory${qs}`);
};
export const addInventoryItem = (
  cabinId: string,
  body: {
    groceryName: string;
    storageId: string;
    quantity: number;
    expiryDate: string | null;
  },
) => api.post<InventoryItemDto>(`/cabins/${cabinId}/inventory`, body);
export const updateInventoryItem = (
  cabinId: string,
  itemId: string,
  patch: {
    quantity?: number;
    expiryDate?: string | null;
    clearExpiryDate?: boolean;
    storageId?: string;
  },
) =>
  api.patch<{
    id: string;
    quantity: number;
    expiryDate: string | null;
    storageId: string;
    updatedAt: string;
  }>(`/cabins/${cabinId}/inventory/${itemId}`, patch);
export const adjustInventoryQuantity = (
  cabinId: string,
  itemId: string,
  delta: number,
) =>
  api.post<{ id: string; quantity: number; updatedAt: string }>(
    `/cabins/${cabinId}/inventory/${itemId}/adjust`,
    { delta },
  );
export const deleteInventoryItem = (cabinId: string, itemId: string) =>
  api.delete<void>(`/cabins/${cabinId}/inventory/${itemId}`);

// Shopping list
export const listShoppingList = (
  cabinId: string,
  includePurchased: boolean,
) => {
  const qs = includePurchased
    ? "?includePurchased=true&purchasedSinceDays=7"
    : "";
  return api.get<ShoppingItemDto[]>(`/cabins/${cabinId}/shopping-list${qs}`);
};
export const addShoppingItem = (
  cabinId: string,
  body: { groceryName: string; quantity: number; note?: string | null },
) => api.post<ShoppingItemDto>(`/cabins/${cabinId}/shopping-list`, body);
export const updateShoppingItem = (
  cabinId: string,
  itemId: string,
  patch: { quantity?: number; note?: string | null },
) =>
  api.patch<{ id: string; quantity: number; note: string | null }>(
    `/cabins/${cabinId}/shopping-list/${itemId}`,
    patch,
  );
export const adjustShoppingQuantity = (
  cabinId: string,
  itemId: string,
  delta: number,
) =>
  api.post<{ id: string; quantity: number }>(
    `/cabins/${cabinId}/shopping-list/${itemId}/adjust`,
    { delta },
  );
export const purchaseShoppingItem = (
  cabinId: string,
  itemId: string,
  addToInventory: AddToInventoryOnPurchase | null,
) =>
  api.post<PurchaseResult>(
    `/cabins/${cabinId}/shopping-list/${itemId}/purchase`,
    { addToInventory },
  );
export const restoreShoppingItem = (cabinId: string, itemId: string) =>
  api.post<{ id: string; purchasedAt: null }>(
    `/cabins/${cabinId}/shopping-list/${itemId}/restore`,
  );
export const deleteShoppingItem = (cabinId: string, itemId: string) =>
  api.delete<void>(`/cabins/${cabinId}/shopping-list/${itemId}`);
export const addLowStockToShoppingList = (cabinId: string) =>
  api.post<{ added: ShoppingItemDto[] }>(
    `/cabins/${cabinId}/shopping-list/from-low-stock`,
  );
