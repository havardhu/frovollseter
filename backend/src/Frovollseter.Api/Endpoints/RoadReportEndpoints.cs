using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class RoadReportEndpoints
{
    public static IEndpointRouteBuilder MapRoadReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/road-reports").WithTags("Road Reports");

        group.MapGet("/", GetLatest).AllowAnonymous();
        group.MapGet("/history", GetHistory).AllowAnonymous();
        group.MapGet("/{id:guid}", GetById).AllowAnonymous();
        group.MapPost("/", Create).RequireAuthorization();
        group.MapDelete("/{id:guid}", Delete).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> GetLatest(FrovollseterDbContext db, CancellationToken ct)
    {
        // Return the most recent report per road segment
        var reports = await db.RoadReports
            .Include(r => r.ReportedBy)
            .OrderByDescending(r => r.CreatedAt)
            .Take(20)
            .Select(r => MapToDto(r))
            .ToListAsync(ct);

        return Results.Ok(reports);
    }

    private static async Task<IResult> GetHistory(
        FrovollseterDbContext db,
        CancellationToken ct,
        int page = 1,
        int pageSize = 20)
    {
        pageSize = Math.Min(pageSize, 100);
        var total = await db.RoadReports.CountAsync(ct);
        var items = await db.RoadReports
            .Include(r => r.ReportedBy)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => MapToDto(r))
            .ToListAsync(ct);

        return Results.Ok(new { total, page, pageSize, items });
    }

    private static async Task<IResult> GetById(Guid id, FrovollseterDbContext db, CancellationToken ct)
    {
        var report = await db.RoadReports.Include(r => r.ReportedBy).FirstOrDefaultAsync(r => r.Id == id, ct);
        return report is null ? Results.NotFound() : Results.Ok(MapToDto(report));
    }

    private static async Task<IResult> Create(
        [FromBody] CreateRoadReportRequest req,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        if (!Enum.TryParse<RoadStatus>(req.Status, ignoreCase: true, out var status))
            return Results.BadRequest(new { error = "Invalid road status value." });

        var report = new RoadReport
        {
            Id = Guid.NewGuid(),
            ReportedById = userId,
            Status = status,
            Description = req.Description,
            RoadSegment = req.RoadSegment,
            ValidUntil = req.ValidUntil,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.RoadReports.Add(report);
        await db.SaveChangesAsync(ct);

        var saved = await db.RoadReports.Include(r => r.ReportedBy).FirstAsync(r => r.Id == report.Id, ct);
        return Results.Created($"/api/road-reports/{report.Id}", MapToDto(saved));
    }

    private static async Task<IResult> Delete(Guid id, HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin"))
            return Results.Forbid();

        var report = await db.RoadReports.FindAsync([id], ct);
        if (report is null) return Results.NotFound();

        db.RoadReports.Remove(report);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static object MapToDto(RoadReport r) => new
    {
        r.Id,
        r.Status,
        r.Description,
        r.RoadSegment,
        r.ValidUntil,
        r.CreatedAt,
        IsStale = r.IsStale,
        ReportedBy = new { r.ReportedBy.Id, r.ReportedBy.DisplayName }
    };

    private record CreateRoadReportRequest(
        string Status,
        string? Description,
        string? RoadSegment,
        DateTimeOffset? ValidUntil);
}
