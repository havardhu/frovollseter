using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin").WithTags("Admin").RequireAuthorization();

        group.MapGet("/users", ListUsers);
        group.MapPatch("/users/{id:guid}/role", UpdateRole);
        group.MapPatch("/users/{id:guid}/status", UpdateStatus);
        group.MapPatch("/users/{id:guid}", UpdateUser);
        group.MapGet("/associations", ListAssociations);
        group.MapPost("/associations", CreateAssociation);
        group.MapPatch("/associations/{id:guid}", UpdateAssociation);

        return app;
    }

    private static (Guid callerId, Guid callerAssocId, string role)? GetCallerContext(HttpContext ctx)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return null;
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var callerId)) return null;
        Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var callerAssocId);
        return (callerId, callerAssocId, role);
    }

    private static async Task<IResult> ListUsers(FrovollseterDbContext db, HttpContext ctx, CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null) return Results.Forbid();

        var query = db.Users.Include(u => u.Association).AsQueryable();
        if (caller.Value.role == "admin")
            query = query.Where(u => u.AssociationId == caller.Value.callerAssocId);

        var users = await query.OrderBy(u => u.DisplayName).ToListAsync(ct);
        return Results.Ok(users.Select(MapUserDto));
    }

    private static async Task<IResult> UpdateRole(
        Guid id,
        [FromBody] UpdateRoleRequest req,
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null || caller.Value.role != "systemadmin") return Results.Forbid();
        if (caller.Value.callerId == id) return Results.BadRequest(new { error = "Kan ikke endre egen rolle." });

        if (!Enum.TryParse<UserRole>(req.Role, ignoreCase: true, out var newRole))
            return Results.BadRequest(new { error = "Ugyldig rolle." });

        var user = await db.Users.Include(u => u.Association).FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Results.NotFound();

        user.Role = newRole;
        await db.SaveChangesAsync(ct);
        return Results.Ok(MapUserDto(user));
    }

    private static async Task<IResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateStatusRequest req,
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null) return Results.Forbid();
        if (caller.Value.callerId == id) return Results.BadRequest(new { error = "Kan ikke endre egen status." });

        if (!Enum.TryParse<UserStatus>(req.Status, ignoreCase: true, out var newStatus))
            return Results.BadRequest(new { error = "Ugyldig status." });

        var user = await db.Users.Include(u => u.Association).FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Results.NotFound();

        if (caller.Value.role == "admin")
        {
            if (user.AssociationId != caller.Value.callerAssocId) return Results.Forbid();
            if (user.Role != UserRole.Member) return Results.Forbid();
            if (newStatus is not (UserStatus.Active or UserStatus.Suspended))
                return Results.BadRequest(new { error = "Admin kan kun sette Active eller Suspended." });
        }

        user.Status = newStatus;
        await db.SaveChangesAsync(ct);
        return Results.Ok(MapUserDto(user));
    }

    private static async Task<IResult> ListAssociations(FrovollseterDbContext db, HttpContext ctx, CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null || caller.Value.role != "systemadmin") return Results.Forbid();

        var assocs = await db.Associations
            .OrderBy(a => a.Name)
            .Select(a => new {
                a.Id, a.Name, a.Type,
                MemberCount = a.Members.Count
            })
            .ToListAsync(ct);
        return Results.Ok(assocs);
    }

    private static async Task<IResult> CreateAssociation(
        [FromBody] CreateAssociationRequest req,
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null || caller.Value.role != "systemadmin") return Results.Forbid();

        if (!Enum.TryParse<AssociationType>(req.Type, ignoreCase: true, out var type))
            return Results.BadRequest(new { error = "Ugyldig type." });

        var assoc = new Association
        {
            Id = Guid.NewGuid(),
            Name = req.Name,
            Type = type,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Associations.Add(assoc);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { assoc.Id, assoc.Name, assoc.Type, MemberCount = 0 });
    }

    private static object MapUserDto(User u) => new
    {
        u.Id,
        u.Email,
        u.Phone,
        u.DisplayName,
        u.Role,
        u.Status,
        u.CreatedAt,
        u.LastLoginAt,
        Association = u.Association is null ? null : new { u.Association.Id, u.Association.Name }
    };

    private static async Task<IResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest req,
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null) return Results.Forbid();

        var user = await db.Users.Include(u => u.Association)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Results.NotFound();

        if (caller.Value.role == "admin")
        {
            if (user.AssociationId != caller.Value.callerAssocId) return Results.Forbid();
            if (user.Role != UserRole.Member) return Results.Forbid();
        }

        if (req.DisplayName is not null)
        {
            if (string.IsNullOrWhiteSpace(req.DisplayName))
                return Results.BadRequest(new { error = "DisplayName kan ikke være tomt." });
            user.DisplayName = req.DisplayName.Trim();
        }

        if (req.Phone is not null)
            user.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();

        if (caller.Value.role == "systemadmin")
        {
            if (req.Email is not null)
            {
                var normalised = req.Email.Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(normalised))
                    return Results.BadRequest(new { error = "E-post kan ikke være tom." });
                var conflict = await db.Users.AnyAsync(u => u.Email == normalised && u.Id != id, ct);
                if (conflict)
                    return Results.Conflict(new { error = "E-postadressen er allerede i bruk." });
                user.Email = normalised;
            }

            if (req.AssociationId is not null)
            {
                var assocExists = await db.Associations.AnyAsync(a => a.Id == req.AssociationId.Value, ct);
                if (!assocExists)
                    return Results.BadRequest(new { error = "Ugyldig forening." });
                user.AssociationId = req.AssociationId.Value;
            }
        }

        await db.SaveChangesAsync(ct);
        await db.Entry(user).Reference(u => u.Association).LoadAsync(ct);
        return Results.Ok(MapUserDto(user));
    }

    private static async Task<IResult> UpdateAssociation(
        Guid id,
        [FromBody] UpdateAssociationRequest req,
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var caller = GetCallerContext(ctx);
        if (caller is null || caller.Value.role != "systemadmin") return Results.Forbid();

        var assoc = await db.Associations
            .Include(a => a.Members)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
        if (assoc is null) return Results.NotFound();

        if (req.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Navn kan ikke være tomt." });
            assoc.Name = req.Name.Trim();
        }

        if (req.Type is not null)
        {
            if (!Enum.TryParse<AssociationType>(req.Type, ignoreCase: true, out var newType))
                return Results.BadRequest(new { error = "Ugyldig type." });
            assoc.Type = newType;
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { assoc.Id, assoc.Name, assoc.Type, MemberCount = assoc.Members.Count });
    }

    private record UpdateRoleRequest(string Role);
    private record UpdateStatusRequest(string Status);
    private record UpdateUserRequest(string? DisplayName, string? Phone, string? Email, Guid? AssociationId);
    private record CreateAssociationRequest(string Name, string Type);
    private record UpdateAssociationRequest(string? Name, string? Type);
}
