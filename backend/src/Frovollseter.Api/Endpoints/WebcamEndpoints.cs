using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
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

        return app;
    }

    private static async Task<IResult> GetAll(HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        Guid? currentUserId = Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var uid) ? uid : null;
        var isAuthenticated = currentUserId is not null;

        var query = db.WebcamStreams
            .Include(w => w.Owner)
            .Where(w =>
                w.AccessLevel == WebcamAccessLevel.Public ||
                (isAuthenticated && w.AccessLevel == WebcamAccessLevel.Members) ||
                (currentUserId != null && w.OwnerId == currentUserId));

        var webcams = await query
            .OrderByDescending(w => w.LastImageAt)
            .Select(w => new
            {
                w.Id, w.Title, w.Description, w.LocationHint,
                AccessLevel = w.AccessLevel.ToString(),
                FeedType = w.FeedType.ToString(),
                w.SourceUrl,
                w.LastImageUrl, w.LastImageAt, w.CreatedAt,
                Owner = new { w.Owner.Id, w.Owner.DisplayName }
            })
            .ToListAsync(ct);

        return Results.Ok(webcams);
    }

    private static async Task<IResult> GetById(Guid id, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        Guid? currentUserId = Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var uid) ? uid : null;
        var isAuthenticated = currentUserId is not null;

        var webcam = await db.WebcamStreams
            .Include(w => w.Owner)
            .FirstOrDefaultAsync(w => w.Id == id, ct);

        if (webcam is null) return Results.NotFound();

        var canAccess = webcam.AccessLevel switch
        {
            WebcamAccessLevel.Public => true,
            WebcamAccessLevel.Members => isAuthenticated,
            WebcamAccessLevel.Private => currentUserId != null && webcam.OwnerId == currentUserId,
            _ => false
        };

        if (!canAccess) return Results.NotFound(); // treat as not found to avoid leaking existence

        return Results.Ok(new
        {
            webcam.Id, webcam.Title, webcam.Description, webcam.LocationHint,
            AccessLevel = webcam.AccessLevel.ToString(),
            FeedType = webcam.FeedType.ToString(),
            webcam.SourceUrl, webcam.LastImageUrl, webcam.LastImageAt,
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

        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.SourceUrl))
            return Results.BadRequest(new { error = "Title and SourceUrl are required" });

        if (!Enum.TryParse<WebcamAccessLevel>(req.AccessLevel, true, out var accessLevel))
            return Results.BadRequest(new { error = "AccessLevel must be Public, Members, or Private" });

        if (!Enum.TryParse<WebcamFeedType>(req.FeedType, true, out var feedType))
            return Results.BadRequest(new { error = "FeedType must be StaticImage or VideoFeed" });

        var webcam = new WebcamStream
        {
            Id = Guid.NewGuid(),
            OwnerId = userId,
            Title = req.Title,
            Description = req.Description,
            LocationHint = req.LocationHint,
            AccessLevel = accessLevel,
            FeedType = feedType,
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

        if (!Enum.TryParse<WebcamAccessLevel>(req.AccessLevel, true, out var accessLevel))
            return Results.BadRequest(new { error = "AccessLevel must be Public, Members, or Private" });

        if (!Enum.TryParse<WebcamFeedType>(req.FeedType, true, out var feedType))
            return Results.BadRequest(new { error = "FeedType must be StaticImage or VideoFeed" });

        webcam.Title = req.Title;
        webcam.Description = req.Description;
        webcam.LocationHint = req.LocationHint;
        webcam.AccessLevel = accessLevel;
        webcam.FeedType = feedType;
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

    private record WebcamRequest(
        string Title,
        string? Description,
        string? LocationHint,
        string AccessLevel,
        string FeedType,
        string SourceUrl);

    private record UploadImageRequest(string ImageUrl);
}
