# Plan: "Min hytte" — cabin, inventory & shopping list

A user-facing feature that lets a person create a cabin, add existing Frovollseter users as family members, track what's in stock across multiple storage locations (fridge, freezer, dry goods, cellar, …), and maintain a shared shopping list for next time. The page is called **Min hytte** and lives at `/min-hytte`.

This plan is written against the current codebase (May 2026): .NET 10 minimal API + EF Core + Postgres backend, Vite + React 19 + Tailwind + Radix frontend, Norwegian UI.

---

## 1. Concept clarification

### Cabin vs. Association

The codebase already has an `Association` entity, but it represents the *Frovollseter veglag og hytteeierlag* — the cooperative that owns the road, runs webcams, posts news. Every user has exactly one `AssociationId`. That's **not the same as a cabin**.

A cabin in this feature is a **private family unit**:

- A user can own multiple cabins (some people have a hytte from each side of the family).
- A cabin has its own private membership list (the family).
- Inventory, storages, shopping list, and the grocery dictionary are all private to the cabin's members — invisible even to other association members.

So we introduce a new aggregate `Cabin`, with many-to-many membership to `User`, completely separate from `Association`. A user can be in zero, one, or many cabins.

### Adding members directly

There is no email-based invite flow. The cabin owner adds existing Frovollseter users by email: the UI takes an email, the backend looks up the user, and on success the user is immediately a `Member` of the cabin. If no user with that email exists, the owner sees a clear error ("Vi finner ingen bruker med den e-posten. Be dem registrere seg på Frovollseter først.").

Rationale: Frovollseter is already a closed cooperative — everyone using it has registered through the existing magic-link flow. There's no realistic "invite an external person" use case for a private family fridge log.

### Storages, not "fridge or freezer"

A naive design would hardcode a `Location` enum (`Fridge`, `Freezer`). That breaks the moment someone wants to track tørrvarer (dry goods), the bod, the vinkjeller, or "i den blå plastkassa under senga". So **storage locations are first-class per-cabin objects**:

- A cabin starts with two default storages — "Kjøleskap" and "Fryser" — seeded automatically.
- The user can rename them, delete them, add more, reorder them.
- Each storage has a name, an icon, a sort order, and a `IsTempControlled` flag (drives expiry-warning behaviour: we warn aggressively about milk, less so about an unopened bag of flour).
- An inventory item belongs to exactly one storage. Moving an item between storages is just a `PATCH { storageId }`.

### Shopping list & the shared dictionary

The "invisible grocery dictionary" (`CabinGroceryItem`) is the centre of gravity for the cabin. **Both the inventory and the shopping list use it.** The same searchable combobox shows the same suggestions whether you're putting Smør on the shopping list or adding Smør to the fridge. Adding "Beer" once anywhere makes it autocomplete forever after for that cabin.

The buy-flow ties them together: when you check off a shopping list item, the dialog asks "Legg på lager?" with a smart-default storage based on where the same grocery has lived before (smør → most-recent storage was Kjøleskap → default Kjøleskap). A single tap moves it from list to inventory.

---

## 2. Domain model

Six new entities under `Frovollseter.Domain.Entities`. All Guid PKs, all `DateTimeOffset` for timestamps to match existing conventions.

### `Cabin`
- `Id`, `Name`, `CreatedById`, `CreatedAt`
- Navigation: `Members`, `Storages`, `GroceryItems`, `InventoryItems`, `ShoppingListItems`

### `CabinMembership` (composite PK `(CabinId, UserId)`)
- `CabinId`, `UserId`, `Role` (enum `CabinRole` — `Owner`, `Member`)
- `JoinedAt`, `AddedById?` (the owner who added them, nullable for the cabin creator's own row)
- At least one Owner must remain on a cabin. Members can read everything and edit inventory + shopping list. Only Owners can add/remove members, manage cabin settings, and force-delete storages with content.

### `CabinStorage` — a place where things are kept
- `Id`, `CabinId`
- `Name` (string) — "Kjøleskap", "Fryser", "Tørrvarer", "Bod", …
- `Icon` (enum `StorageIcon` — `Fridge`, `Freezer`, `Pantry`, `Cellar`, `Shed`, `Box`, `Other`) — drives the UI emoji/icon
- `SortOrder` (int)
- `IsTempControlled` (bool) — Fridge/Freezer = true, Pantry/Shed = false. Drives expiry-warning aggressiveness.

On cabin creation the backend seeds two default storages: Kjøleskap (Fridge, temp-controlled) and Fryser (Freezer, temp-controlled). A cabin must always have at least one storage.

### `CabinGroceryItem` — the per-cabin **grocery dictionary** (the "invisible" combobox source)
- `Id`, `CabinId`
- `Name` (string)
- `NormalizedName` (string, lowercased+trimmed) — used for unique index and search
- `LastUsedAt`, `UseCount` (drives suggestion ranking)

Upserted whenever a name appears in inventory OR shopping list. Survives deletion of all referencing items, so "Beer" stays autocompletable forever.

### `InventoryItem` — physical thing in a storage right now
- `Id`, `CabinId` (denormalized), `StorageId`, `GroceryItemId`
- `Quantity` (int, ≥ 0)
- `ExpiryDate` (DateOnly?) — nullable, "—" in UI
- `AddedById`, `AddedAt`, `UpdatedAt`

### `ShoppingListItem` — wishlist for next shopping trip
- `Id`, `CabinId`, `GroceryItemId`
- `Quantity` (int, default 1)
- `Note` (string?, ≤ 200 chars) — "Helst Tine smør"
- `AddedById`, `AddedAt`
- `PurchasedAt` (DateTimeOffset?), `PurchasedById?`

We keep `PurchasedAt` rather than hard-deleting so the UI can show "Sist kjøpt 12.04.2026" hints when the same grocery is added again, and so the recent-purchases section gives a small undo window. A 30-day cutoff hides ancient purchased rows from the default query.

### Indexes & constraints
- `CabinMembership`: composite PK `(CabinId, UserId)`, index on `UserId` for "list my cabins".
- `CabinStorage`: index on `(CabinId, SortOrder)`.
- `CabinGroceryItem`: unique `(CabinId, NormalizedName)`.
- `InventoryItem`: index on `(CabinId, StorageId, ExpiryDate)`; index on `(CabinId, GroceryItemId)` for "where has this lived?" lookups.
- `ShoppingListItem`: filtered index on `(CabinId)` `WHERE PurchasedAt IS NULL` — the dominant query.

### EF Core configuration
Add six `DbSet`s to `FrovollseterDbContext`. Enums-as-strings (matches existing convention). Cascade delete from `Cabin` to all dependents.

### Migration
One new migration `AddCabinFeatures`. Auto-apply on startup is already wired up.

---

## 3. Backend API

New endpoint group file: `Frovollseter.Api/Endpoints/CabinEndpoints.cs`. All routes require auth. Authorization checks via a `CabinAccess` helper exposing `GetRoleAsync(userId, cabinId)`, `IsMemberAsync`, `IsOwnerAsync`.

### Cabin management

| Method | Route | Auth | Body / Notes |
|---|---|---|---|
| GET | `/api/cabins` | any auth | Cabins where caller is a member. `[{ id, name, role, memberCount }]` |
| POST | `/api/cabins` | any auth | `{ name }`. Caller becomes Owner; default storages seeded. |
| GET | `/api/cabins/{id}` | member | Full detail incl. members. |
| PATCH | `/api/cabins/{id}` | owner | `{ name }`. |
| DELETE | `/api/cabins/{id}` | owner | Cascades. UI confirmation. |

### Membership

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/cabins/{id}/members` | owner | `{ email }`. Server normalizes the email and looks up a `User`. **404** if no user found. **409** if already a member. **200** with the new member row otherwise. |
| DELETE | `/api/cabins/{id}/members/{userId}` | owner, or self | Last-owner protection: refuses if removing the last Owner. Self-removal allowed. |
| PATCH | `/api/cabins/{id}/members/{userId}` | owner | `{ role }` to promote/demote. Same last-owner protection on demotion. |

The "add member" endpoint deliberately requires the exact email. We don't expose a user-search endpoint to all cabin owners — the owner already knows the email of the family member they want to add. This avoids leaking the user directory.

### Storages

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/cabins/{id}/storages` | member | Ordered by `SortOrder`. |
| POST | `/api/cabins/{id}/storages` | member | `{ name, icon, isTempControlled }`. SortOrder = max+1. |
| PATCH | `/api/cabins/{id}/storages/{storageId}` | member | `{ name?, icon?, isTempControlled?, sortOrder? }`. |
| DELETE | `/api/cabins/{id}/storages/{storageId}` | member; owner if `?force=true` | Refuses if non-empty unless force. Cabin must always have ≥ 1 storage. |
| POST | `/api/cabins/{id}/storages/reorder` | member | `{ orderedIds: [...] }`. Bulk update of SortOrder for drag-to-reorder. |

### Grocery dictionary

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/cabins/{id}/groceries?q=…&limit=20` | member | Search by `NormalizedName LIKE q%` first, then `LIKE %q%`, ordered by `UseCount DESC, LastUsedAt DESC`. |
| POST | `/api/cabins/{id}/groceries` | member | `{ name }`. Idempotent upsert. Rarely called directly. |
| DELETE | `/api/cabins/{id}/groceries/{groceryId}` | owner | Optional cleanup; refused if any inventory or shopping-list item references it. |

### Inventory

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/cabins/{id}/inventory?storageId=…` | member | Optional storage filter. Returns flat list with `groceryName`, `storageId`, `storageName`, `quantity`, `expiryDate`. |
| POST | `/api/cabins/{id}/inventory` | member | `{ groceryName, storageId, quantity, expiryDate? }`. Upserts grocery in the dictionary. |
| PATCH | `/api/cabins/{id}/inventory/{itemId}` | member | Partial: `quantity?, expiryDate?, storageId?`. `storageId` change = move between storages. |
| POST | `/api/cabins/{id}/inventory/{itemId}/adjust` | member | `{ delta: +1 \| -1 }`. Atomic increment for the +/- buttons — avoids races when two family members edit at once. Rejects below 0. |
| DELETE | `/api/cabins/{id}/inventory/{itemId}` | member | Remove. |

### Shopping list

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/cabins/{id}/shopping-list?includePurchased=false&purchasedSinceDays=7` | member | Active items always returned; purchased items only when `includePurchased=true`. |
| POST | `/api/cabins/{id}/shopping-list` | member | `{ groceryName, quantity, note? }`. Upserts grocery. |
| PATCH | `/api/cabins/{id}/shopping-list/{itemId}` | member | `{ quantity?, note? }`. |
| POST | `/api/cabins/{id}/shopping-list/{itemId}/adjust` | member | `{ delta: ±1 }`. |
| POST | `/api/cabins/{id}/shopping-list/{itemId}/purchase` | member | Marks `PurchasedAt = now`. Optional body `{ addToInventory: { storageId, expiryDate? } }` — when present, atomically also creates the matching `InventoryItem`. Returns both. |
| POST | `/api/cabins/{id}/shopping-list/{itemId}/restore` | member | Un-purchase (mistap recovery). |
| DELETE | `/api/cabins/{id}/shopping-list/{itemId}` | member | Remove without buying. |

### Smart endpoints (cheap, ship in v1)

`POST /api/cabins/{id}/shopping-list/from-low-stock` — member.
Server scans `InventoryItem` rows where `Quantity <= 1` for the cabin, and for each grocery not already on the active shopping list, adds it with `quantity = 1`. Returns the list of added items. Powers a "Foreslå fra lavt lager" button.

`GET /api/cabins/{id}/groceries/{groceryId}/last-storage` — member.
Returns the `storageId` of the most recent `InventoryItem` (active or historical) for this grocery, or null. The shopping-list "purchase" dialog calls this to pre-select the smart-default storage.

### DTOs
Local `record` types per file, matching the existing minimal-API pattern.

---

## 4. Frontend

### Routing

In `frontend/src/App.tsx`, inside the authenticated `<Layout />` block:

```tsx
<Route path="/min-hytte" element={<MinHyttePage />} />
```

In `Layout.tsx`, add `{ to: "/min-hytte", label: "Min hytte" }` to `NAV_ITEMS` (between "Veiforhold" and "Nyheter").

### File layout

```
frontend/src/features/cabin/
  MinHyttePage.tsx              ← top-level, picks/creates cabin, hosts tabs
  CabinSelector.tsx             ← dropdown when user has multiple cabins
  CreateCabinDialog.tsx
  CabinDataContext.tsx          ← caches storages + groceries per active cabin
  tabs/
    InventoryTab.tsx
    ShoppingListTab.tsx
    MembersTab.tsx
    SettingsTab.tsx
  components/
    GroceryCombobox.tsx         ← reusable: inventory & shopping list both use it
    AddInventoryItemDialog.tsx
    AddShoppingItemDialog.tsx
    PurchaseDialog.tsx          ← "Kjøpt — legg på lager?"
    AddMemberDialog.tsx         ← email input
    StorageManagementSection.tsx
    StoragePill.tsx
    QuantityStepper.tsx         ← the [−] N [+] control, reused everywhere
    ExpiryBadge.tsx
  api.ts
  types.ts
```

### `MinHyttePage.tsx`

On mount, GET `/api/cabins`. Three states:

1. **No cabins** → empty state, primary button "Opprett hytte" opens `CreateCabinDialog`.
2. **One cabin** → render its detail directly.
3. **Multiple cabins** → `CabinSelector` (Radix Select) at the top, persisted to `localStorage('lastCabinId')`.

Wraps content in `<CabinDataContext>` keyed on the active cabin id. The context fetches storages + groceries once on mount and exposes mutate-and-refresh helpers.

### Tabs

Four Radix Tabs (matches the existing Admin page pattern):

1. **Beholdning** (`<InventoryTab />`) — default
2. **Handleliste** (`<ShoppingListTab />`)
3. **Medlemmer** (`<MembersTab />`)
4. **Innstillinger** (`<SettingsTab />`, owners only) — cabin name, storage management, delete cabin

### `InventoryTab.tsx`

Top: a horizontal pill row of storages from the context, with an "Alle" pill at the start and a "+" pill at the end.

```
[ Alle ] [ 🧊 Kjøleskap ] [ ❄️ Fryser ] [ 🌾 Tørrvarer ] [ + ]
```

- "+" pill opens a quick-add storage dialog (also reachable from Innstillinger).
- Selecting a pill filters the list. "Alle" groups by storage with collapsible sections.

Below: the item list. Each row:
```
🥛 Smør                                    [Kjøleskap]
   Antall  [−] 2 [+]    Utløper 12.12.2026
```
- Storage badge clickable → switches the filter pill.
- Row tap → expand for: change storage (Radix Select), change expiry (date input + "Ingen utløpsdato" checkbox), delete.
- Sort: `expiryDate ASC NULLS LAST`, then alphabetical.
- `<ExpiryBadge />` shows "Utløpt" (red) for past, "Utløper snart" (amber) for ≤ 3 days. **Suppressed when the item's storage has `IsTempControlled = false` AND no `expiryDate` is set** — no nagging amber tags on flour bags.

`<AddInventoryItemDialog />`:
- `<GroceryCombobox />` for name (with a "Legg til «{query}»" tail item when no exact match)
- Storage `<Select />` (defaults to currently filtered storage, else first storage)
- Quantity `<QuantityStepper />` (default 1)
- Optional expiry date

### `ShoppingListTab.tsx`

```
┌───────────────────────────────────────────────┐
│  Handleliste                                  │
│  [+ Legg til vare]  [⚡ Foreslå fra lavt lager]│
├───────────────────────────────────────────────┤
│  ☐  Smør            ×2                        │
│      "Helst Tine"                             │
│  ☐  Egg             ×12                       │
│  ☐  Kaffe           ×1                        │
├───────────────────────────────────────────────┤
│  Sist kjøpt (siste 7 dager)   [vis/skjul]    │
│  ☑  Melk  ×2 · Håvard, 28.04   [Angre]       │
└───────────────────────────────────────────────┘
```

- Checkbox = mark as purchased → opens `<PurchaseDialog />`:
  - Title: "Kjøpt!" with subtitle "Legg på lager?"
  - Storage selector — pre-populated by GET `/groceries/{id}/last-storage`; falls back to first storage.
  - Optional expiry date.
  - Two buttons: **"Bare merk som kjøpt"** (POST `/purchase` with no `addToInventory`) and **"Legg på lager"** (POST `/purchase` with `addToInventory`).
- Tap a row to edit quantity/note, or remove from list.
- "⚡ Foreslå fra lavt lager" → POST `/from-low-stock`, then re-fetch.
- Recently purchased section (collapsible, collapsed by default) shows last 7 days with an "Angre" button → POST `/restore`.
- The combobox "Legg til vare" supports the same dictionary as inventory; this is the whole point of the shared dictionary design.

### `GroceryCombobox.tsx`

The key reusable UX piece. Built on Radix `Popover` + `<input>` + a manually keyboard-navigable list (Radix doesn't ship a Combobox, but the rest of the app already uses Radix primitives directly — consistent).

- Debounced (~150 ms) GET `/api/cabins/{id}/groceries?q=…&limit=20`.
- Up/Down arrows + Enter for keyboard nav. Esc closes.
- Tail item: when the typed string doesn't exactly match any result, show "Legg til «{query}»" — selecting it submits the form with the new name (the parent's POST will upsert into the dictionary).
- Selecting a result populates the input with its display name and stores `groceryItemId` (or null for brand-new names).

This satisfies the "even if Beer isn't currently listed but was previously listed for that cabin" requirement: the dictionary is server-side and persistent per cabin.

### `QuantityStepper.tsx`

The `[−] N [+]` control, reused in inventory rows, the add-item dialog, and the shopping list. Backed by `POST /…/adjust { delta }` for inventory rows (atomic). Optimistic update with rollback on error. Hold-to-repeat (long-press) is nice-to-have, deferred to polish phase.

### `MembersTab.tsx`

- List members with displayName, email, role badge ("Eier" / "Medlem"), joined date.
- "+ Legg til medlem" button (owners only) → opens `<AddMemberDialog />`:
  - Single email input.
  - Submit → POST `/api/cabins/{id}/members { email }`.
  - On 200: toast "Medlem lagt til", refresh.
  - On 404: inline error "Vi finner ingen bruker med den e-posten. Be dem registrere seg på Frovollseter først."
  - On 409: inline error "Brukeren er allerede medlem."
- Owners can remove members via trash icon (with confirm).
- Self-removal allowed.

### `SettingsTab.tsx`

- Rename cabin (PATCH).
- `<StorageManagementSection />` — reorderable list with rename, icon picker (six options), `IsTempControlled` toggle, delete (with force confirm if non-empty). Drag-to-reorder calls POST `/storages/reorder`.
- "Slett hytte" — destructive action with confirmation.

### Styling & primitives
Reuse existing `@/components/ui/*` (Button, Card, Input, Label, Badge). For dialogs, popovers, tabs, selects use Radix directly as the rest of the app does. No new dependencies needed.

### State management
Match the rest of the app: local `useState`/`useEffect` per component plus `<CabinDataContext>` for the active cabin's storages + grocery dictionary (referenced by both inventory and shopping list, doesn't change often, invalidated on mutation). No global store, no React Query — consistent with the existing codebase.

---

## 5. Implementation phases

Each phase is a coherent commit you can ship to Fly + Vercel independently.

**Phase 1 — Cabin aggregate + storages + membership (backend).** Domain entities Cabin, Membership, Storage; default-seed two storages on cabin creation; EF config; migration; `CabinAccess` helper; `/api/cabins`, `/api/cabins/{id}/members`, `/api/cabins/{id}/storages` endpoints. Smoke-test via Scalar UI.

**Phase 2 — Grocery dictionary + inventory (backend).** `CabinGroceryItem`, `InventoryItem`; all `/groceries` and `/inventory` endpoints incl. `/adjust` and storage-aware moves; `last-storage` lookup endpoint.

**Phase 3 — Shopping list (backend).** `ShoppingListItem`; CRUD + `/adjust` + `/purchase` (with optional `addToInventory`) + `/restore` + `/from-low-stock`.

**Phase 4 — Min hytte page shell (frontend).** Route, nav entry, MinHyttePage with empty/one/many states, CreateCabinDialog, CabinDataContext, MembersTab + AddMemberDialog, SettingsTab + StorageManagementSection. End of phase: a user can create a cabin, manage storages, and add their spouse by email.

**Phase 5 — InventoryTab (frontend).** GroceryCombobox, QuantityStepper, ExpiryBadge, storage pill row, AddInventoryItemDialog, list with row expansion + move-between-storages.

**Phase 6 — ShoppingListTab (frontend).** AddShoppingItemDialog, PurchaseDialog with smart storage default, recently-purchased section with Angre, "Foreslå fra lavt lager" button.

**Phase 7 — Polish.** Drag-to-reorder storages; "Sist kjøpt" hint inside GroceryCombobox results; export to CSV; bulk "Tøm utløpte varer" sweep button; hold-to-repeat on QuantityStepper; per-grocery `MinQuantity` for smarter low-stock suggestions; optional courtesy email when added to a cabin.

---

## 6. Open questions / decisions to confirm

1. **Notify on add** — when an owner adds a member, do we send the new member a courtesy email ("Håvard la deg til i hytta «Frovoll»")? My take: defer to polish phase. The user will see the new cabin next time they visit /min-hytte; the cabin selector makes it discoverable.
2. **Default storages** — auto-seed Kjøleskap + Fryser. Add Tørrvarer as a third default? My take: no, plant-and-water — let the user add it if they want it. Worth confirming.
3. **Quantity semantics** — integer-only with the unit baked into the name ("1/2 liter øl" + qty 8). Confirm.
4. **Cross-cabin shopping list** — if a user is in two cabins, lists stay separate (per-cabin privacy is the whole point). Confirm.
5. **Same grocery in multiple storages** — Smør in fridge AND freezer shows as two rows under their respective storages. Aggregating across storages would obscure where things actually are. Confirm.
6. **Low-stock threshold** — hardcoded at `Quantity <= 1` for v1; add per-grocery `MinQuantity` in v2 if people use it. Confirm.
7. **Purchase → inventory default behaviour** — `<PurchaseDialog />` shows two buttons ("Bare merk som kjøpt" vs "Legg på lager"). Should "Legg på lager" be the primary (visually emphasized) button? My take: yes — putting away groceries is the common case.

---

## 7. Out of scope (explicit non-goals)

- Photos of items.
- Categories/tags on groceries.
- Recipes / "what can I make from what's in stock".
- Push notifications / expiry reminders.
- Multiple shopping lists per cabin (e.g. one per store).
- Barcode scanning.
- Real-time sync between simultaneous editors (atomic `/adjust` endpoint covers the common race; full live sync is overkill).
- Sharing cabins between Associations (cross-tenant).
- Inviting external (non-registered) users via email link.
