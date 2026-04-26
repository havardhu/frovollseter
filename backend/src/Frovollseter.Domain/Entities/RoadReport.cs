using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class RoadReport
{
    public Guid Id { get; set; }
    public Guid ReportedById { get; set; }
    public RoadStatus Status { get; set; }
    public string? Description { get; set; }
    public string? RoadSegment { get; set; }
    public DateTimeOffset? ValidUntil { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Guid? ConfirmedById { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }

    public User ReportedBy { get; set; } = null!;
    public User? ConfirmedBy { get; set; }

    public bool IsStale => ValidUntil.HasValue && DateTimeOffset.UtcNow > ValidUntil;
}
