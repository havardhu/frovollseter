using Frovollseter.Application.Cabins;
using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class CabinEndpoints
{
    public static IEndpointRouteBuilder MapCabinEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cabins").WithTags("Cabins").RequireAuthorization();

        // Cabin
        group.MapGet("/", ListMyCabins);
        group.MapPost("/", CreateCabin);
        group.MapGet("/{id:guid}", GetCabin);
        group.MapPatch("/{id:guid}", UpdateCabin);
        group.MapDelete("/{id:guid}", DeleteCabin);

        // Members
        group.MapPost("/{id:guid}/members", AddMember);
        group.MapPatch("/{id:guid}/members/{userId:guid}", UpdateMember);
        group.MapDelete("/{id:guid}/members/{userId:guid}", RemoveMember);

        // Storages
        group.MapGet("/{id:guid}/storages", ListStorages);
        group.MapPost("/{id:guid}/storages", CreateStorage);
        group.MapPatch("/{id:guid}/storages/{storageId:guid}", UpdateStorage);
        group.MapDelete("/{id:guid}/storages/{storageId:guid}", DeleteStorage);
        group.MapPost("/{id:guid}/storages/reorder", ReorderStorages);

        // Grocery dictionary
        group.MapGet("/{id:guid}/groceries", SearchGroceries);
        group.MapPost("/{id:guid}/groceries", CreateGrocery);
        group.MapDelete("/{id:guid}/groceries/{groceryId:guid}", DeleteGrocery);
        group.MapGet("/{id:guid}/groceries/{groceryId:guid}/last-storage", GetLastStorageForGrocery);

        // Inventory
        group.MapGet("/{id:guid}/inventory", ListInventory);
        group.MapPost("/{id:guid}/inventory", AddInventoryItem);
        group.MapPatch("/{id:guid}/inventory/{itemId:guid}", UpdateInventoryItem);
        group.MapPost("/{id:guid}/inventory/{itemId:guid}/adjust", AdjustInventoryQuantity);
        group.MapDelete("/{id:guid}/inventory/{itemId:guid}", DeleteInventoryItem);

        // Shopping list
        group.MapGet("/{id:guid}/shopping-list", ListShoppingList);
        group.MapPost("/{id:guid}/shopping-list", AddShoppingItem);
        group.MapPatch("/{id:guid}/shopping-list/{itemId:guid}", UpdateShoppingItem);
        group.MapPost("/{id:guid}/shopping-list/{itemId:guid}/adjust", AdjustShoppingQuantity);
        group.MapPost("/{id:guid}/shopping-list/{itemId:guid}/purchase", PurchaseShoppingItem);
        group.MapPost("/{id:guid}/shopping-list/{itemId:guid}/restore", RestoreShoppingItem);
        group.MapDelete("/{id:guid}/shopping-list/{itemId:guid}", DeleteShoppingItem);
        group.MapPost("/{id:guid}/shopping-list/from-low-stock", AddLowStockToShoppingList);

        return app;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static Guid? GetUserId(HttpContext ctx) =>
        Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var uid) ? uid : null;

    // Upsert a grocery name in the per-cabin dictionary. Increments UseCount
    // and bumps LastUsedAt — drives suggestion ranking in the combobox.
    private static async Task<CabinGroceryItem> UpsertGroceryAsync(
        FrovollseterDbContext db, Guid cabinId, string name, CancellationToken ct)
    {
        var trimmed = name.Trim();
        var normalized = trimmed.ToLowerInvariant();
        var existing = await db.CabinGroceryItems
            .FirstOrDefaultAsync(g => g.CabinId == cabinId && g.NormalizedName == normalized, ct);
        if (existing is not null)
        {
            existing.UseCount += 1;
            existing.LastUsedAt = DateTimeOffset.UtcNow;
            return existing;
        }
        var entity = new CabinGroceryItem
        {
            Id = Guid.NewGuid(),
            CabinId = cabinId,
            Name = trimmed,
            NormalizedName = normalized,
            LastUsedAt = DateTimeOffset.UtcNow,
            UseCount = 1,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.CabinGroceryItems.Add(entity);
        return entity;
    }

    // ---------------------------------------------------------------------
    // Cabin CRUD
    // ---------------------------------------------------------------------

    private static async Task<IResult> ListMyCabins(
        HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();

        var cabins = await db.CabinMemberships
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.Cabin.Name)
            .Select(m => new
            {
                id = m.CabinId,
                name = m.Cabin.Name,
                role = m.Role.ToString(),
                memberCount = m.Cabin.Members.Count,
                joinedAt = m.JoinedAt,
            })
            .ToListAsync(ct);

        return Results.Ok(cabins);
    }

    private static async Task<IResult> CreateCabin(
        [FromBody] CreateCabinRequest req,
        HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        var name = (req.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return Results.BadRequest(new { error = "Navn er påkrevd." });

        var now = DateTimeOffset.UtcNow;
        var cabin = new Cabin
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedById = userId,
            CreatedAt = now,
        };
        db.Cabins.Add(cabin);
        db.CabinMemberships.Add(new CabinMembership
        {
            CabinId = cabin.Id,
            UserId = userId,
            Role = CabinRole.Owner,
            JoinedAt = now,
            AddedById = null,
        });

        // Default storages — Kjøleskap and Fryser, both temperature-controlled.
        db.CabinStorages.AddRange(
            new CabinStorage
            {
                Id = Guid.NewGuid(),
                CabinId = cabin.Id,
                Name = "Kjøleskap",
                Icon = StorageIcon.Fridge,
                SortOrder = 0,
                IsTempControlled = true,
                CreatedAt = now,
            },
            new CabinStorage
            {
                Id = Guid.NewGuid(),
                CabinId = cabin.Id,
                Name = "Fryser",
                Icon = StorageIcon.Freezer,
                SortOrder = 1,
                IsTempControlled = true,
                CreatedAt = now,
            });

        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/cabins/{cabin.Id}", new
        {
            id = cabin.Id,
            name = cabin.Name,
            role = nameof(CabinRole.Owner),
            memberCount = 1,
        });
    }

    private static async Task<IResult> GetCabin(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        var role = await access.GetRoleAsync(userId, id, ct);
        if (role is null) return Results.NotFound();

        var cabin = await db.Cabins
            .Where(c => c.Id == id)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                createdAt = c.CreatedAt,
                myRole = role.ToString()!,
                members = c.Members
                    .OrderBy(m => m.JoinedAt)
                    .Select(m => new
                    {
                        userId = m.UserId,
                        displayName = m.User.DisplayName,
                        email = m.User.Email,
                        role = m.Role.ToString(),
                        joinedAt = m.JoinedAt,
                    }).ToList(),
            })
            .FirstOrDefaultAsync(ct);

        return cabin is null ? Results.NotFound() : Results.Ok(cabin);
    }

    private static async Task<IResult> UpdateCabin(
        Guid id, [FromBody] UpdateCabinRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsOwnerAsync(userId, id, ct)) return Results.Forbid();

        var cabin = await db.Cabins.FindAsync([id], ct);
        if (cabin is null) return Results.NotFound();

        if (req.Name is not null)
        {
            var name = req.Name.Trim();
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { error = "Navn kan ikke være tomt." });
            cabin.Name = name;
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = cabin.Id, name = cabin.Name });
    }

    private static async Task<IResult> DeleteCabin(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsOwnerAsync(userId, id, ct)) return Results.Forbid();

        var cabin = await db.Cabins.FindAsync([id], ct);
        if (cabin is null) return Results.NotFound();

        db.Cabins.Remove(cabin);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ---------------------------------------------------------------------
    // Members
    // ---------------------------------------------------------------------

    private static async Task<IResult> AddMember(
        Guid id, [FromBody] AddMemberRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid actingUserId) return Results.Unauthorized();
        if (!await access.IsOwnerAsync(actingUserId, id, ct)) return Results.Forbid();

        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return Results.BadRequest(new { error = "E-post er påkrevd." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);
        if (user is null)
            return Results.NotFound(new
            {
                error = "Vi finner ingen bruker med den e-posten. Be dem registrere seg på Frovollseter først.",
            });

        var alreadyMember = await db.CabinMemberships
            .AnyAsync(m => m.CabinId == id && m.UserId == user.Id, ct);
        if (alreadyMember)
            return Results.Conflict(new { error = "Brukeren er allerede medlem." });

        var membership = new CabinMembership
        {
            CabinId = id,
            UserId = user.Id,
            Role = CabinRole.Member,
            JoinedAt = DateTimeOffset.UtcNow,
            AddedById = actingUserId,
        };
        db.CabinMemberships.Add(membership);
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            userId = user.Id,
            displayName = user.DisplayName,
            email = user.Email,
            role = membership.Role.ToString(),
            joinedAt = membership.JoinedAt,
        });
    }

    private static async Task<IResult> UpdateMember(
        Guid id, Guid userId, [FromBody] UpdateMemberRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid actingUserId) return Results.Unauthorized();
        if (!await access.IsOwnerAsync(actingUserId, id, ct)) return Results.Forbid();

        if (!Enum.TryParse<CabinRole>(req.Role, true, out var newRole))
            return Results.BadRequest(new { error = "Ugyldig rolle." });

        var membership = await db.CabinMemberships
            .FirstOrDefaultAsync(m => m.CabinId == id && m.UserId == userId, ct);
        if (membership is null) return Results.NotFound();

        // Refuse demoting the last owner.
        if (membership.Role == CabinRole.Owner && newRole != CabinRole.Owner)
        {
            var owners = await access.CountOwnersAsync(id, ct);
            if (owners <= 1)
                return Results.Conflict(new { error = "Hytta må ha minst én eier." });
        }

        membership.Role = newRole;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { userId = membership.UserId, role = membership.Role.ToString() });
    }

    private static async Task<IResult> RemoveMember(
        Guid id, Guid userId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid actingUserId) return Results.Unauthorized();
        var actingRole = await access.GetRoleAsync(actingUserId, id, ct);
        if (actingRole is null) return Results.NotFound();

        // Owners can remove anyone; members can remove themselves.
        var isSelfRemoval = actingUserId == userId;
        if (!isSelfRemoval && actingRole != CabinRole.Owner) return Results.Forbid();

        var membership = await db.CabinMemberships
            .FirstOrDefaultAsync(m => m.CabinId == id && m.UserId == userId, ct);
        if (membership is null) return Results.NotFound();

        // Last-owner protection.
        if (membership.Role == CabinRole.Owner)
        {
            var owners = await access.CountOwnersAsync(id, ct);
            if (owners <= 1)
                return Results.Conflict(new { error = "Hytta må ha minst én eier. Gjør noen andre til eier først." });
        }

        db.CabinMemberships.Remove(membership);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ---------------------------------------------------------------------
    // Storages
    // ---------------------------------------------------------------------

    private static async Task<IResult> ListStorages(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.NotFound();

        var storages = await db.CabinStorages
            .Where(s => s.CabinId == id)
            .OrderBy(s => s.SortOrder)
            .Select(s => new
            {
                id = s.Id,
                name = s.Name,
                icon = s.Icon.ToString(),
                sortOrder = s.SortOrder,
                isTempControlled = s.IsTempControlled,
            })
            .ToListAsync(ct);

        return Results.Ok(storages);
    }

    private static async Task<IResult> CreateStorage(
        Guid id, [FromBody] CreateStorageRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var name = (req.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return Results.BadRequest(new { error = "Navn er påkrevd." });
        if (!Enum.TryParse<StorageIcon>(req.Icon, true, out var icon))
            icon = StorageIcon.Other;

        var maxOrder = await db.CabinStorages
            .Where(s => s.CabinId == id)
            .MaxAsync(s => (int?)s.SortOrder, ct) ?? -1;

        var storage = new CabinStorage
        {
            Id = Guid.NewGuid(),
            CabinId = id,
            Name = name,
            Icon = icon,
            SortOrder = maxOrder + 1,
            IsTempControlled = req.IsTempControlled,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.CabinStorages.Add(storage);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/cabins/{id}/storages/{storage.Id}", new
        {
            id = storage.Id,
            name = storage.Name,
            icon = storage.Icon.ToString(),
            sortOrder = storage.SortOrder,
            isTempControlled = storage.IsTempControlled,
        });
    }

    private static async Task<IResult> UpdateStorage(
        Guid id, Guid storageId, [FromBody] UpdateStorageRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var storage = await db.CabinStorages
            .FirstOrDefaultAsync(s => s.Id == storageId && s.CabinId == id, ct);
        if (storage is null) return Results.NotFound();

        if (req.Name is not null)
        {
            var name = req.Name.Trim();
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { error = "Navn kan ikke være tomt." });
            storage.Name = name;
        }
        if (req.Icon is not null)
        {
            if (!Enum.TryParse<StorageIcon>(req.Icon, true, out var icon))
                return Results.BadRequest(new { error = "Ugyldig ikon." });
            storage.Icon = icon;
        }
        if (req.IsTempControlled is not null)
            storage.IsTempControlled = req.IsTempControlled.Value;
        if (req.SortOrder is not null)
            storage.SortOrder = req.SortOrder.Value;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new
        {
            id = storage.Id,
            name = storage.Name,
            icon = storage.Icon.ToString(),
            sortOrder = storage.SortOrder,
            isTempControlled = storage.IsTempControlled,
        });
    }

    private static async Task<IResult> DeleteStorage(
        Guid id, Guid storageId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct,
        [FromQuery] bool force = false)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        var role = await access.GetRoleAsync(userId, id, ct);
        if (role is null) return Results.NotFound();

        var storage = await db.CabinStorages
            .FirstOrDefaultAsync(s => s.Id == storageId && s.CabinId == id, ct);
        if (storage is null) return Results.NotFound();

        // Cabin must always have at least one storage.
        var totalStorages = await db.CabinStorages.CountAsync(s => s.CabinId == id, ct);
        if (totalStorages <= 1)
            return Results.Conflict(new { error = "Hytta må ha minst én oppbevaringsplass." });

        var hasItems = await db.InventoryItems.AnyAsync(i => i.StorageId == storageId, ct);
        if (hasItems)
        {
            if (!force)
                return Results.Conflict(new { error = "Oppbevaringen inneholder varer. Bruk force=true for å slette likevel." });
            if (role != CabinRole.Owner)
                return Results.Forbid();
            // Cascade delete items in this storage so the storage delete itself can succeed
            // (storage→item FK is Restrict, not Cascade).
            var items = await db.InventoryItems.Where(i => i.StorageId == storageId).ToListAsync(ct);
            db.InventoryItems.RemoveRange(items);
        }

        db.CabinStorages.Remove(storage);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderStorages(
        Guid id, [FromBody] ReorderStoragesRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        if (req.OrderedIds is null || req.OrderedIds.Count == 0)
            return Results.BadRequest(new { error = "orderedIds er påkrevd." });

        var storages = await db.CabinStorages
            .Where(s => s.CabinId == id)
            .ToListAsync(ct);

        var indexById = req.OrderedIds
            .Select((sid, idx) => new { sid, idx })
            .ToDictionary(x => x.sid, x => x.idx);

        foreach (var s in storages)
            if (indexById.TryGetValue(s.Id, out var newOrder))
                s.SortOrder = newOrder;

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ---------------------------------------------------------------------
    // Grocery dictionary
    // ---------------------------------------------------------------------

    private static async Task<IResult> SearchGroceries(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct,
        [FromQuery] string? q = null, [FromQuery] int limit = 20)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.NotFound();

        limit = Math.Clamp(limit, 1, 50);
        var query = db.CabinGroceryItems.Where(g => g.CabinId == id);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLowerInvariant();
            // Prefix matches first, then any-substring; ranked by usage afterwards.
            query = query.Where(g => g.NormalizedName.Contains(needle));
        }

        var items = await query
            .OrderByDescending(g => g.UseCount)
            .ThenByDescending(g => g.LastUsedAt)
            .ThenBy(g => g.NormalizedName)
            .Take(limit)
            .Select(g => new
            {
                id = g.Id,
                name = g.Name,
                useCount = g.UseCount,
                lastUsedAt = g.LastUsedAt,
            })
            .ToListAsync(ct);

        return Results.Ok(items);
    }

    private static async Task<IResult> CreateGrocery(
        Guid id, [FromBody] CreateGroceryRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var name = (req.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return Results.BadRequest(new { error = "Navn er påkrevd." });

        var grocery = await UpsertGroceryAsync(db, id, name, ct);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = grocery.Id, name = grocery.Name });
    }

    private static async Task<IResult> DeleteGrocery(
        Guid id, Guid groceryId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsOwnerAsync(userId, id, ct)) return Results.Forbid();

        var grocery = await db.CabinGroceryItems
            .FirstOrDefaultAsync(g => g.Id == groceryId && g.CabinId == id, ct);
        if (grocery is null) return Results.NotFound();

        var inUse =
            await db.InventoryItems.AnyAsync(i => i.GroceryItemId == groceryId, ct) ||
            await db.ShoppingListItems.AnyAsync(s => s.GroceryItemId == groceryId, ct);
        if (inUse)
            return Results.Conflict(new { error = "Vare brukes fortsatt i beholdning eller handleliste." });

        db.CabinGroceryItems.Remove(grocery);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> GetLastStorageForGrocery(
        Guid id, Guid groceryId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.NotFound();

        // Most recent inventory placement of this grocery — drives the smart
        // storage suggestion in the shopping-list "purchase" dialog.
        var lastStorageId = await db.InventoryItems
            .Where(i => i.CabinId == id && i.GroceryItemId == groceryId)
            .OrderByDescending(i => i.AddedAt)
            .Select(i => (Guid?)i.StorageId)
            .FirstOrDefaultAsync(ct);

        return Results.Ok(new { storageId = lastStorageId });
    }

    // ---------------------------------------------------------------------
    // Inventory
    // ---------------------------------------------------------------------

    private static async Task<IResult> ListInventory(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct,
        [FromQuery] Guid? storageId = null)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.NotFound();

        var query = db.InventoryItems.Where(i => i.CabinId == id);
        if (storageId is not null) query = query.Where(i => i.StorageId == storageId);

        var items = await query
            .OrderBy(i => i.ExpiryDate ?? DateOnly.MaxValue)
            .ThenBy(i => i.GroceryItem.NormalizedName)
            .Select(i => new
            {
                id = i.Id,
                groceryItemId = i.GroceryItemId,
                groceryName = i.GroceryItem.Name,
                storageId = i.StorageId,
                storageName = i.Storage.Name,
                storageIcon = i.Storage.Icon.ToString(),
                isTempControlled = i.Storage.IsTempControlled,
                quantity = i.Quantity,
                expiryDate = i.ExpiryDate,
                addedAt = i.AddedAt,
                updatedAt = i.UpdatedAt,
            })
            .ToListAsync(ct);

        return Results.Ok(items);
    }

    private static async Task<IResult> AddInventoryItem(
        Guid id, [FromBody] AddInventoryRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var name = (req.GroceryName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return Results.BadRequest(new { error = "Varenavn er påkrevd." });
        if (req.Quantity < 0)
            return Results.BadRequest(new { error = "Antall kan ikke være negativt." });

        var storage = await db.CabinStorages
            .FirstOrDefaultAsync(s => s.Id == req.StorageId && s.CabinId == id, ct);
        if (storage is null)
            return Results.BadRequest(new { error = "Ukjent oppbevaringsplass." });

        var grocery = await UpsertGroceryAsync(db, id, name, ct);
        var now = DateTimeOffset.UtcNow;
        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            CabinId = id,
            StorageId = storage.Id,
            GroceryItemId = grocery.Id,
            Quantity = req.Quantity <= 0 ? 1 : req.Quantity,
            ExpiryDate = req.ExpiryDate,
            AddedById = userId,
            AddedAt = now,
            UpdatedAt = now,
        };
        db.InventoryItems.Add(item);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/cabins/{id}/inventory/{item.Id}", new
        {
            id = item.Id,
            groceryItemId = grocery.Id,
            groceryName = grocery.Name,
            storageId = storage.Id,
            storageName = storage.Name,
            storageIcon = storage.Icon.ToString(),
            isTempControlled = storage.IsTempControlled,
            quantity = item.Quantity,
            expiryDate = item.ExpiryDate,
            addedAt = item.AddedAt,
            updatedAt = item.UpdatedAt,
        });
    }

    private static async Task<IResult> UpdateInventoryItem(
        Guid id, Guid itemId, [FromBody] UpdateInventoryRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        if (req.Quantity is not null)
        {
            if (req.Quantity < 0) return Results.BadRequest(new { error = "Antall kan ikke være negativt." });
            item.Quantity = req.Quantity.Value;
        }
        if (req.ExpiryDate is not null) item.ExpiryDate = req.ExpiryDate.Value;
        if (req.ClearExpiryDate == true) item.ExpiryDate = null;
        if (req.StorageId is not null)
        {
            var storage = await db.CabinStorages
                .FirstOrDefaultAsync(s => s.Id == req.StorageId.Value && s.CabinId == id, ct);
            if (storage is null) return Results.BadRequest(new { error = "Ukjent oppbevaringsplass." });
            item.StorageId = storage.Id;
        }
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            id = item.Id,
            quantity = item.Quantity,
            expiryDate = item.ExpiryDate,
            storageId = item.StorageId,
            updatedAt = item.UpdatedAt,
        });
    }

    private static async Task<IResult> AdjustInventoryQuantity(
        Guid id, Guid itemId, [FromBody] AdjustQuantityRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        if (req.Delta == 0) return Results.BadRequest(new { error = "delta kan ikke være 0." });

        var item = await db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        var newQty = item.Quantity + req.Delta;
        if (newQty < 0)
            return Results.Conflict(new { error = "Antall kan ikke gå under 0." });

        item.Quantity = newQty;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = item.Id, quantity = item.Quantity, updatedAt = item.UpdatedAt });
    }

    private static async Task<IResult> DeleteInventoryItem(
        Guid id, Guid itemId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        db.InventoryItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ---------------------------------------------------------------------
    // Shopping list
    // ---------------------------------------------------------------------

    private static async Task<IResult> ListShoppingList(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct,
        [FromQuery] bool includePurchased = false,
        [FromQuery] int purchasedSinceDays = 7)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.NotFound();

        var query = db.ShoppingListItems.Where(s => s.CabinId == id);
        if (!includePurchased)
        {
            query = query.Where(s => s.PurchasedAt == null);
        }
        else
        {
            var cutoff = DateTimeOffset.UtcNow.AddDays(-Math.Max(1, purchasedSinceDays));
            query = query.Where(s => s.PurchasedAt == null || s.PurchasedAt >= cutoff);
        }

        var items = await query
            .OrderBy(s => s.PurchasedAt == null ? 0 : 1)
            .ThenByDescending(s => s.PurchasedAt)
            .ThenBy(s => s.AddedAt)
            .Select(s => new
            {
                id = s.Id,
                groceryItemId = s.GroceryItemId,
                groceryName = s.GroceryItem.Name,
                quantity = s.Quantity,
                note = s.Note,
                addedAt = s.AddedAt,
                addedBy = new { id = s.AddedBy.Id, displayName = s.AddedBy.DisplayName },
                purchasedAt = s.PurchasedAt,
                purchasedBy = s.PurchasedBy == null
                    ? null
                    : new { id = s.PurchasedBy.Id, displayName = s.PurchasedBy.DisplayName },
            })
            .ToListAsync(ct);

        return Results.Ok(items);
    }

    private static async Task<IResult> AddShoppingItem(
        Guid id, [FromBody] AddShoppingItemRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var name = (req.GroceryName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            return Results.BadRequest(new { error = "Varenavn er påkrevd." });
        var qty = req.Quantity <= 0 ? 1 : req.Quantity;

        var grocery = await UpsertGroceryAsync(db, id, name, ct);
        var now = DateTimeOffset.UtcNow;
        var item = new ShoppingListItem
        {
            Id = Guid.NewGuid(),
            CabinId = id,
            GroceryItemId = grocery.Id,
            Quantity = qty,
            Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
            AddedById = userId,
            AddedAt = now,
        };
        db.ShoppingListItems.Add(item);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/cabins/{id}/shopping-list/{item.Id}", new
        {
            id = item.Id,
            groceryItemId = grocery.Id,
            groceryName = grocery.Name,
            quantity = item.Quantity,
            note = item.Note,
            addedAt = item.AddedAt,
        });
    }

    private static async Task<IResult> UpdateShoppingItem(
        Guid id, Guid itemId, [FromBody] UpdateShoppingItemRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(s => s.Id == itemId && s.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        if (req.Quantity is not null)
        {
            if (req.Quantity < 1) return Results.BadRequest(new { error = "Antall må være minst 1." });
            item.Quantity = req.Quantity.Value;
        }
        if (req.Note is not null)
            item.Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim();

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = item.Id, quantity = item.Quantity, note = item.Note });
    }

    private static async Task<IResult> AdjustShoppingQuantity(
        Guid id, Guid itemId, [FromBody] AdjustQuantityRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();
        if (req.Delta == 0) return Results.BadRequest(new { error = "delta kan ikke være 0." });

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(s => s.Id == itemId && s.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        var newQty = item.Quantity + req.Delta;
        if (newQty < 1) return Results.Conflict(new { error = "Antall må være minst 1." });
        item.Quantity = newQty;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = item.Id, quantity = item.Quantity });
    }

    private static async Task<IResult> PurchaseShoppingItem(
        Guid id, Guid itemId, [FromBody] PurchaseShoppingItemRequest req,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(s => s.Id == itemId && s.CabinId == id, ct);
        if (item is null) return Results.NotFound();
        if (item.PurchasedAt is not null)
            return Results.Conflict(new { error = "Varen er allerede markert som kjøpt." });

        var now = DateTimeOffset.UtcNow;
        item.PurchasedAt = now;
        item.PurchasedById = userId;

        object? createdInventory = null;
        if (req.AddToInventory is { } addReq)
        {
            var storage = await db.CabinStorages
                .FirstOrDefaultAsync(s => s.Id == addReq.StorageId && s.CabinId == id, ct);
            if (storage is null)
                return Results.BadRequest(new { error = "Ukjent oppbevaringsplass." });

            // Bump grocery usage on purchase too — it's a "use" of the dictionary entry.
            var grocery = await db.CabinGroceryItems
                .FirstAsync(g => g.Id == item.GroceryItemId, ct);
            grocery.UseCount += 1;
            grocery.LastUsedAt = now;

            var inv = new InventoryItem
            {
                Id = Guid.NewGuid(),
                CabinId = id,
                StorageId = storage.Id,
                GroceryItemId = item.GroceryItemId,
                Quantity = item.Quantity,
                ExpiryDate = addReq.ExpiryDate,
                AddedById = userId,
                AddedAt = now,
                UpdatedAt = now,
            };
            db.InventoryItems.Add(inv);
            createdInventory = new
            {
                id = inv.Id,
                groceryItemId = inv.GroceryItemId,
                groceryName = grocery.Name,
                storageId = inv.StorageId,
                storageName = storage.Name,
                storageIcon = storage.Icon.ToString(),
                isTempControlled = storage.IsTempControlled,
                quantity = inv.Quantity,
                expiryDate = inv.ExpiryDate,
                addedAt = inv.AddedAt,
                updatedAt = inv.UpdatedAt,
            };
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(new
        {
            shoppingItem = new
            {
                id = item.Id,
                purchasedAt = item.PurchasedAt,
                purchasedById = item.PurchasedById,
            },
            inventoryItem = createdInventory,
        });
    }

    private static async Task<IResult> RestoreShoppingItem(
        Guid id, Guid itemId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(s => s.Id == itemId && s.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        item.PurchasedAt = null;
        item.PurchasedById = null;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { id = item.Id, purchasedAt = (DateTimeOffset?)null });
    }

    private static async Task<IResult> DeleteShoppingItem(
        Guid id, Guid itemId,
        HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        var item = await db.ShoppingListItems
            .FirstOrDefaultAsync(s => s.Id == itemId && s.CabinId == id, ct);
        if (item is null) return Results.NotFound();

        db.ShoppingListItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> AddLowStockToShoppingList(
        Guid id, HttpContext ctx, FrovollseterDbContext db, CabinAccess access, CancellationToken ct)
    {
        if (GetUserId(ctx) is not Guid userId) return Results.Unauthorized();
        if (!await access.IsMemberAsync(userId, id, ct)) return Results.Forbid();

        // Group inventory by grocery and find the ones whose total quantity is ≤ 1.
        var lowStockGroceryIds = await db.InventoryItems
            .Where(i => i.CabinId == id)
            .GroupBy(i => i.GroceryItemId)
            .Where(g => g.Sum(i => i.Quantity) <= 1)
            .Select(g => g.Key)
            .ToListAsync(ct);

        if (lowStockGroceryIds.Count == 0)
            return Results.Ok(new { added = Array.Empty<object>() });

        // Skip those already on the active shopping list.
        var alreadyOnList = await db.ShoppingListItems
            .Where(s => s.CabinId == id && s.PurchasedAt == null
                && lowStockGroceryIds.Contains(s.GroceryItemId))
            .Select(s => s.GroceryItemId)
            .ToListAsync(ct);

        var toAdd = lowStockGroceryIds.Except(alreadyOnList).ToList();
        if (toAdd.Count == 0)
            return Results.Ok(new { added = Array.Empty<object>() });

        var groceries = await db.CabinGroceryItems
            .Where(g => toAdd.Contains(g.Id))
            .ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        var added = new List<object>();
        foreach (var grocery in groceries)
        {
            var item = new ShoppingListItem
            {
                Id = Guid.NewGuid(),
                CabinId = id,
                GroceryItemId = grocery.Id,
                Quantity = 1,
                AddedById = userId,
                AddedAt = now,
            };
            db.ShoppingListItems.Add(item);
            added.Add(new
            {
                id = item.Id,
                groceryItemId = grocery.Id,
                groceryName = grocery.Name,
                quantity = item.Quantity,
                addedAt = item.AddedAt,
            });
        }
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { added });
    }

    // ---------------------------------------------------------------------
    // DTOs
    // ---------------------------------------------------------------------

    private record CreateCabinRequest(string Name);
    private record UpdateCabinRequest(string? Name);
    private record AddMemberRequest(string Email);
    private record UpdateMemberRequest(string Role);

    private record CreateStorageRequest(string Name, string Icon, bool IsTempControlled);
    private record UpdateStorageRequest(string? Name, string? Icon, bool? IsTempControlled, int? SortOrder);
    private record ReorderStoragesRequest(List<Guid> OrderedIds);

    private record CreateGroceryRequest(string Name);

    private record AddInventoryRequest(string GroceryName, Guid StorageId, int Quantity, DateOnly? ExpiryDate);
    private record UpdateInventoryRequest(int? Quantity, DateOnly? ExpiryDate, bool? ClearExpiryDate, Guid? StorageId);
    private record AdjustQuantityRequest(int Delta);

    private record AddShoppingItemRequest(string GroceryName, int Quantity, string? Note);
    private record UpdateShoppingItemRequest(int? Quantity, string? Note);
    private record AddToInventoryOnPurchase(Guid StorageId, DateOnly? ExpiryDate);
    private record PurchaseShoppingItemRequest(AddToInventoryOnPurchase? AddToInventory);
}
