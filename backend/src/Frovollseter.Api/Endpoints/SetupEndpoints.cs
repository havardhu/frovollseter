using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class SetupEndpoints
{
    public static IEndpointRouteBuilder MapSetupEndpoints(this IEndpointRouteBuilder app)
    {
        // Protected by a setup key — only works if SETUP_KEY env var is configured
        app.MapPost("/api/setup/seed", Seed).AllowAnonymous();
        return app;
    }

    private static async Task<IResult> Seed(
        [FromBody] SeedRequest req,
        [FromHeader(Name = "X-Setup-Key")] string? setupKey,
        FrovollseterDbContext db,
        IConfiguration config,
        CancellationToken ct)
    {
        var expectedKey = config["Setup:Key"];
        if (string.IsNullOrEmpty(expectedKey) || setupKey != expectedKey)
            return Results.Unauthorized();

        if (await db.Associations.AnyAsync(ct))
            return Results.Conflict(new { error = "Database already seeded." });

        var association = new Association
        {
            Id = Guid.NewGuid(),
            Name = req.AssociationName,
            Type = AssociationType.Hytteeierlag,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Associations.Add(association);

        var veglag = new Association
        {
            Id = Guid.NewGuid(),
            Name = req.VeglagName,
            Type = AssociationType.Veglag,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Associations.Add(veglag);

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Email = req.AdminEmail,
            DisplayName = req.AdminName,
            Role = UserRole.SystemAdmin,
            Status = UserStatus.Active,
            AssociationId = association.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(admin);

        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            message = "Seeded successfully.",
            adminEmail = admin.Email,
            associationId = association.Id,
            veglagId = veglag.Id
        });
    }

    private record SeedRequest(
        string AdminEmail,
        string AdminName,
        string AssociationName,
        string VeglagName);
}
