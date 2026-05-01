using Frovollseter.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class AssociationEndpoints
{
    /// <summary>
    /// Public, lightweight list of associations. Used by anonymous filters
    /// (e.g. the news page) and any other UI that needs association names
    /// without sysadmin access. Does NOT include member counts or PII.
    /// </summary>
    public static IEndpointRouteBuilder MapAssociationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/associations", async (FrovollseterDbContext db, CancellationToken ct) =>
        {
            var assocs = await db.Associations
                .OrderBy(a => a.Name)
                .Select(a => new { a.Id, a.Name, Type = a.Type.ToString() })
                .ToListAsync(ct);
            return Results.Ok(assocs);
        })
        .AllowAnonymous()
        .WithTags("Associations");

        return app;
    }
}
