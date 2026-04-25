using Frovollseter.Domain.Entities;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class WebcamEndpoints
{
    public static IEndpointRouteBuilder MapWebcamEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/webcams").WithTags("Webcams");

        group.MapGet("/", GetAll).AllowAnonymous();
        group.MapGet("/{id:guid}", GetById).AllowAnonymous();
        group.MapPost("/", Create).RequireAuthorization();
        group.MapPatch("/{id:guid}", Update).RequireAuthorization();
        group.MapDelete("/{id:guid}", Delete).RequireAuthorization();
        group.MapPost("/{id:guid}/image", UploadImage).RequireAuthorization();
        group.MapPost("/{id:guid}/access/{assocId:guid}", GrantAccess).RequireAuthorization();
        group.MapDelete("/{id:guid}/access/{assocId:guid}", RevokeAccess).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> GetAll(HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        Guid? currentUserId = Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var uid) ? uid : null;
        Guid? currentAssocId = Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var aid) ? aid : null;

        var query = db.WebcamStreams
            .Include(w => w.Owner)
            .Include(w => w.AccessGrants)
            .Where(w =>
                w.IsPublic ||
                (currentUserId != null && w.OwnerId == currentUserId) ||
                (currentAssocId != null && w.AccessGrants.Any(g => g.AssociationId == currentAssocId)));

        var webcams = await query
            .OrderByDescending(w => w.LastImageAt)
            .Select(w => new
            {
                w.Id, w.Title, w.Description, w.LocationHint, w.IsPublic,
                w.LastImageUrl, w.LastImageAt, w.CreatedAt,
                Owner = new { w.Owner.Id, w.Owner.DisplayName }
            })
            .ToListAsync(ct);

        return Results.Ok(webcams);
    }

    private static async Task<IResult> GetById(Guid id, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        Guid? currentUserId = Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var uid) ? uid : null;
        Guid? currentAssocId = Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var aid) ? aid : null;

        var webcam = await db.WebcamStreams
            .Include(w => w.Owner)
            .Include(w => w.AccessGrants)
            .FirstOrDefaultAsync(w => w.Id == id, ct);

        if (webcam is null) return Results.NotFound();

        var canAccess = webcam.IsPublic
            || (currentUserId != null && webcam.OwnerId == currentUserId)
            || (currentAssocId != null && webcam.AccessGrants.Any(g => g.AssociationId == currentAssocId));

        if (!canAccess) return Results.NotFound(); // treat as not found to avoid leaking existence

        return Results.Ok(new
        {
            webcam.Id, webcam.Title, webcam.Description, webcam.LocationHint,
            webcam.IsPublic, webcam.SourceUrl, webcam.LastImageUrl, webcam.LastImageAt,
            Owner = new { webcam.Owner.Id, webcam.Owner.DisplayName }
        });
    }

    private static async Task<IResult> Create(
        [FromBody] WebcamRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        var webcam = new WebcamStream
        {
            Id = Guid.NewGuid(),
            OwnerId = userId,
            Title = req.Title,
            Description = req.Description,
            LocationHint = req.LocationHint,
            IsPublic = req.IsPublic,
            SourceUrl = req.SourceUrl,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.WebcamStreams.Add(webcam);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/webcams/{webcam.Id}", new { webcam.Id, webcam.Title });
    }

    private static async Task<IResult> Update(
        Guid id,
        [FromBody] WebcamRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        var webcam = await db.WebcamStreams.FindAsync([id], ct);
        if (webcam is null) return Results.NotFound();
        if (webcam.OwnerId != userId && ctx.User.FindFirst("role")?.Value is not ("admin" or "systemadmin"))
            return Results.Forbid();

        webcam.Title = req.Title;
        webcam.Description = req.Description;
        webcam.LocationHint = req.LocationHint;
        webcam.IsPublic = req.IsPublic;
        webcam.SourceUrl = req.SourceUrl;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Delete(Guid id, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        var webcam = await db.WebcamStreams.FindAsync([id], ct);
        if (webcam is null) return Results.NotFound();
        if (webcam.OwnerId != userId && ctx.User.FindFirst("role")?.Value is not ("admin" or "systemadmin"))
            return Results.Forbid();

        db.WebcamStreams.Remove(webcam);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> UploadImage(
        Guid id,
        [FromBody] UploadImageRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        var webcam = await db.WebcamStreams.FindAsync([id], ct);
        if (webcam is null) return Results.NotFound();
        if (webcam.OwnerId != userId && ctx.User.FindFirst("role")?.Value is not ("admin" or "systemadmin"))
            return Results.Forbid();

        // For MVP: accept a pre-uploaded image URL (client uploads to R2 directly via pre-signed URL)
        webcam.LastImageUrl = req.ImageUrl;
        webcam.LastImageAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { webcam.LastImageUrl, webcam.LastImageAt });
    }

    private static async Task<IResult> GrantAccess(
        Guid id, Guid assocId, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId)) return Results.Unauthorized();

        var webcam = await db.WebcamStreams.FindAsync([id], ct);
        if (webcam is null) return Results.NotFound();
        if (webcam.OwnerId != userId) return Results.Forbid();

        if (!await db.WebcamAccessGrants.AnyAsync(g => g.WebcamId == id && g.AssociationId == assocId, ct))
        {
            db.WebcamAccessGrants.Add(new WebcamAccessGrant { WebcamId = id, AssociationId = assocId });
            await db.SaveChangesAsync(ct);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> RevokeAccess(
        Guid id, Guid assocId, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId)) return Results.Unauthorized();

        var webcam = await db.WebcamStreams.FindAsync([id], ct);
        if (webcam is null) return Results.NotFound();
        if (webcam.OwnerId != userId) return Results.Forbid();

        var grant = await db.WebcamAccessGrants.FindAsync([id, assocId], ct);
        if (grant is not null)
        {
            db.WebcamAccessGrants.Remove(grant);
            await db.SaveChangesAsync(ct);
        }

        return Results.NoContent();
    }

    private record WebcamRequest(string Title, string? Description, string? LocationHint, bool IsPublic, string SourceUrl);
    private record UploadImageRequest(string ImageUrl);
}
