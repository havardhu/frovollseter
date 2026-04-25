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
        group.MapGet("/{id:guid}", GetById).AllowAnonymous();
        group.MapPost("/", Create).RequireAuthorization();
        group.MapPatch("/{id:guid}", Update).RequireAuthorization();
        group.MapPost("/{id:guid}/publish", Publish).RequireAuthorization();
        group.MapDelete("/{id:guid}", Delete).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> GetFeed(
        FrovollseterDbContext db,
        HttpContext ctx,
        CancellationToken ct,
        int page = 1,
        int pageSize = 20)
    {
        pageSize = Math.Min(pageSize, 50);

        var query = db.NewsPosts
            .Include(n => n.Author)
            .Include(n => n.Association)
            .Where(n => n.IsPublished);

        // If authenticated, filter to user's association + all veglag posts
        if (Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var assocId))
        {
            query = query.Where(n =>
                n.AssociationId == assocId ||
                n.Association.Type == Domain.Enums.AssociationType.Veglag);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => MapToDto(n))
            .ToListAsync(ct);

        return Results.Ok(new { total, page, pageSize, items });
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
        if (!Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var assocId))
            return Results.Unauthorized();

        var post = new NewsPost
        {
            Id = Guid.NewGuid(),
            AuthorId = userId,
            AssociationId = assocId,
            Title = req.Title,
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

        var post = await db.NewsPosts.FindAsync([id], ct);
        if (post is null) return Results.NotFound();

        post.Title = req.Title;
        post.Body = req.Body;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }

    private static async Task<IResult> Publish(
        Guid id,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var post = await db.NewsPosts.FindAsync([id], ct);
        if (post is null) return Results.NotFound();

        post.IsPublished = true;
        post.PublishedAt = DateTimeOffset.UtcNow;
        post.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
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
        Author = new { n.Author.Id, n.Author.DisplayName },
        Association = new { n.Association.Id, n.Association.Name, n.Association.Type }
    };

    private record NewsPostRequest(string Title, string Body);
}
