using Frovollseter.Domain.Entities;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class LinksEndpoints
{
    public static IEndpointRouteBuilder MapLinksEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/links").WithTags("Links");

        group.MapGet("/", GetAll).AllowAnonymous();
        group.MapPost("/", Create).RequireAuthorization();
        group.MapPatch("/{id:guid}", Update).RequireAuthorization();
        group.MapDelete("/{id:guid}", Delete).RequireAuthorization();
        group.MapPatch("/reorder", Reorder).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> GetAll(FrovollseterDbContext db, CancellationToken ct)
    {
        var links = await db.UsefulLinks
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .Select(l => new { l.Id, l.Title, l.Url, l.Description, l.Category, l.SortOrder })
            .ToListAsync(ct);

        return Results.Ok(links);
    }

    private static async Task<IResult> Create(
        [FromBody] LinkRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId)) return Results.Unauthorized();

        var maxOrder = await db.UsefulLinks.MaxAsync(l => (int?)l.SortOrder, ct) ?? 0;
        var link = new UsefulLink
        {
            Id = Guid.NewGuid(),
            CreatedById = userId,
            Title = req.Title,
            Url = req.Url,
            Description = req.Description,
            Category = req.Category,
            SortOrder = maxOrder + 10,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.UsefulLinks.Add(link);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/links/{link.Id}", new { link.Id, link.Title, link.Url });
    }

    private static async Task<IResult> Update(
        Guid id,
        [FromBody] LinkRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var link = await db.UsefulLinks.FindAsync([id], ct);
        if (link is null) return Results.NotFound();

        link.Title = req.Title;
        link.Url = req.Url;
        link.Description = req.Description;
        link.Category = req.Category;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Delete(Guid id, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var link = await db.UsefulLinks.FindAsync([id], ct);
        if (link is null) return Results.NotFound();

        link.IsActive = false;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Reorder(
        [FromBody] ReorderRequest[] items,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var ids = items.Select(i => i.Id).ToList();
        var links = await db.UsefulLinks.Where(l => ids.Contains(l.Id)).ToListAsync(ct);

        foreach (var item in items)
        {
            var link = links.FirstOrDefault(l => l.Id == item.Id);
            if (link is not null) link.SortOrder = item.SortOrder;
        }

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private record LinkRequest(string Title, string Url, string? Description, string? Category);
    private record ReorderRequest(Guid Id, int SortOrder);
}
