export type CabinRole = "Owner" | "Member";

export type StorageIcon =
  | "Fridge"
  | "Freezer"
  | "Pantry"
  | "Cellar"
  | "Shed"
  | "Box"
  | "Other";

export interface CabinSummary {
  id: string;
  name: string;
  role: CabinRole;
  memberCount: number;
  joinedAt?: string;
}

export interface CabinMemberDto {
  userId: string;
  displayName: string;
  email: string;
  role: CabinRole;
  joinedAt: string;
}

export interface CabinDetail {
  id: string;
  name: string;
  createdAt: string;
  myRole: CabinRole;
  members: CabinMemberDto[];
}

export interface StorageDto {
  id: string;
  name: string;
  icon: StorageIcon;
  sortOrder: number;
  isTempControlled: boolean;
}

export interface GrocerySuggestion {
  id: string;
  name: string;
  useCount: number;
  lastUsedAt: string;
}

export interface InventoryItemDto {
  id: string;
  groceryItemId: string;
  groceryName: string;
  storageId: string;
  storageName: string;
  storageIcon: StorageIcon;
  isTempControlled: boolean;
  quantity: number;
  // ISO date string yyyy-mm-dd, or null when no expiry was set.
  expiryDate: string | null;
  addedAt: string;
  updatedAt: string;
}

export interface ShoppingItemDto {
  id: string;
  groceryItemId: string;
  groceryName: string;
  quantity: number;
  note: string | null;
  addedAt: string;
  addedBy: { id: string; displayName: string };
  purchasedAt: string | null;
  purchasedBy: { id: string; displayName: string } | null;
}

export interface AddToInventoryOnPurchase {
  storageId: string;
  expiryDate: string | null;
}

export interface PurchaseResult {
  shoppingItem: { id: string; purchasedAt: string; purchasedById: string };
  inventoryItem: InventoryItemDto | null;
}
