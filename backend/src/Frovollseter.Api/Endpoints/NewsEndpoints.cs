using Frovollseter.Domain.Entities;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class NewsEndpoints
{
    public static IEndpointRouteBuilder MapNewsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/news").WithTags("News");

        group.MapGet("/", GetFeed).AllowAnonymous();
        group.MapGet("/admin", GetAdminList).RequireAuthorization();
        group.MapGet("/{id:guid}", GetById).AllowAnonymous();
        group.MapPost("/", Create).RequireAuthorization();
        group.MapPatch("/{id:guid}", Update).RequireAuthorization();
        group.MapPost("/{id:guid}/publish", Publish).RequireAuthorization();
        group.MapPost("/{id:guid}/unpublish", Unpublish).RequireAuthorization();
        group.MapDelete("/{id:guid}", Delete).RequireAuthorization();

        return app;
    }

    /// <summary>
    /// Public news feed. Optionally filtered by ?associationId={guid} or ?global=true.
    /// No association-based access restriction – anyone can read every published post.
    /// </summary>
    private static async Task<IResult> GetFeed(
        FrovollseterDbContext db,
        CancellationToken ct,
        Guid? associationId = null,
        bool? global = null,
        int page = 1,
        int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(page, 1);

        var query = db.NewsPosts
            .Include(n => n.Author)
            .Include(n => n.Association)
            .Where(n => n.IsPublished);

        if (associationId is { } aid)
            query = query.Where(n => n.AssociationId == aid);
        else if (global == true)
            query = query.Where(n => n.AssociationId == null);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Results.Ok(new
        {
            total,
            page,
            pageSize,
            items = items.Select(MapToDto)
        });
    }

    /// <summary>
    /// Admin list – includes drafts. Admins see their own association's posts plus
    /// global posts they authored; sysadmins see everything.
    /// </summary>
    private static async Task<IResult> GetAdminList(
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId)) return Results.Unauthorized();
        Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var assocId);

        var query = db.NewsPosts
            .Include(n => n.Author)
            .Include(n => n.Association)
            .AsQueryable();

        if (role == "admin")
        {
            // Plain admins see drafts/posts from their own association OR ones they authored (global incl.).
            query = query.Where(n => n.AssociationId == assocId || n.AuthorId == userId);
        }

        var items = await query
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync(ct);

        return Results.Ok(items.Select(MapToDto));
    }

    private static async Task<IResult> GetById(Guid id, FrovollseterDbContext db, CancellationToken ct)
    {
        var post = await db.NewsPosts
            .Include(n => n.Author)
            .Include(n => n.Association)
            .FirstOrDefaultAsync(n => n.Id == id && n.IsPublished, ct);

        return post is null ? Results.NotFound() : Results.Ok(MapToDto(post));
    }

    private static async Task<IResult> Create(
        [FromBody] NewsPostRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin"))
            return Results.Forbid();

        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();
        Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var callerAssocId);

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { error = "Tittel kan ikke være tom." });
        if (string.IsNullOrWhiteSpace(req.Body))
            return Results.BadRequest(new { error = "Innhold kan ikke være tomt." });

        // Resolve target association: explicit value (sysadmin can pick any, admin must
        // match own), otherwise default to the caller's association. Pass MakeGlobal=true
        // to create a post that isn't tied to any association.
        Guid? assocId;
        if (req.MakeGlobal == true)
        {
            assocId = null;
        }
        else if (req.AssociationId is { } requested)
        {
            if (role == "admin" && requested != callerAssocId)
                return Results.Forbid();
            var exists = await db.Associations.AnyAsync(a => a.Id == requested, ct);
            if (!exists) return Results.BadRequest(new { error = "Ugyldig forening." });
            assocId = requested;
        }
        else
        {
            assocId = callerAssocId == Guid.Empty ? null : callerAssocId;
        }

        var post = new NewsPost
        {
            Id = Guid.NewGuid(),
            AuthorId = userId,
            AssociationId = assocId,
            Title = req.Title.Trim(),
            Body = req.Body,
            IsPublished = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.NewsPosts.Add(post);
        await db.SaveChangesAsync(ct);

        var saved = await db.NewsPosts
            .Include(n => n.Author).Include(n => n.Association)
            .FirstAsync(n => n.Id == post.Id, ct);

        return Results.Created($"/api/news/{post.Id}", MapToDto(saved));
    }

    private static async Task<IResult> Update(
        Guid id,
        [FromBody] NewsPostRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();
        Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var callerAssocId);

        var post = await db.NewsPosts
            .Include(n => n.Author).Include(n => n.Association)
            .FirstOrDefaultAsync(n => n.Id == id, ct);
        if (post is null) return Results.NotFound();

        // Plain admins can only edit their own association's posts (or global ones they authored).
        if (role == "admin")
        {
            var ownsAssoc = post.AssociationId == callerAssocId;
            Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var callerId);
            var ownsAuthored = post.AuthorId == callerId;
            if (!ownsAssoc && !ownsAuthored) return Results.Forbid();
        }

        if (!string.IsNullOrWhiteSpace(req.Title)) post.Title = req.Title.Trim();
        if (!string.IsNullOrWhiteSpace(req.Body)) post.Body = req.Body;

        if (req.MakeGlobal == true)
        {
            // Both admins and sysadmins can flip a post they can edit between
            // own-association and global. Sysadmins additionally bypass the
            // association ownership check above.
            post.AssociationId = null;
        }
        else if (req.AssociationId is { } requested)
        {
            if (role == "admin" && requested != callerAssocId)
                return Results.Forbid();
            var exists = await db.Associations.AnyAsync(a => a.Id == requested, ct);
            if (!exists) return Results.BadRequest(new { error = "Ugyldig forening." });
            post.AssociationId = requested;
        }

        post.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await db.Entry(post).Reference(p => p.Association).LoadAsync(ct);
        return Results.Ok(MapToDto(post));
    }

    private static async Task<IResult> Publish(
        Guid id,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var post = await db.NewsPosts
            .Include(n => n.Author).Include(n => n.Association)
            .FirstOrDefaultAsync(n => n.Id == id, ct);
        if (post is null) return Results.NotFound();

        post.IsPublished = true;
        // Only set PublishedAt the first time the post is published.
        post.PublishedAt ??= DateTimeOffset.UtcNow;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(MapToDto(post));
    }

    private static async Task<IResult> Unpublish(
        Guid id,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var post = await db.NewsPosts
            .Include(n => n.Author).Include(n => n.Association)
            .FirstOrDefaultAsync(n => n.Id == id, ct);
        if (post is null) return Results.NotFound();

        post.IsPublished = false;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(MapToDto(post));
    }

    private static async Task<IResult> Delete(
        Guid id,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var post = await db.NewsPosts.FindAsync([id], ct);
        if (post is null) return Results.NotFound();

        db.NewsPosts.Remove(post);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static object MapToDto(NewsPost n) => new
    {
        n.Id,
        n.Title,
        n.Body,
        n.IsPublished,
        n.PublishedAt,
        n.CreatedAt,
        n.UpdatedAt,
        Author = new { n.Author.Id, n.Author.DisplayName },
        Association = n.Association is null
            ? null
            : new { n.Association.Id, n.Association.Name, Type = n.Association.Type.ToString() }
    };

    private record NewsPostRequest(string Title, string Body, Guid? AssociationId, bool? MakeGlobal);
}
