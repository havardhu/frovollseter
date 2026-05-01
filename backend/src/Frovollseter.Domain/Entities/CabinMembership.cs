using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class CabinMembership
{
    public Guid CabinId { get; set; }
    public Guid UserId { get; set; }
    public CabinRole Role { get; set; } = CabinRole.Member;
    public DateTimeOffset JoinedAt { get; set; }
    // Null for the cabin creator's own membership row.
    public Guid? AddedById { get; set; }

    public Cabin Cabin { get; set; } = null!;
    public User User { get; set; } = null!;
    public User? AddedBy { get; set; }
}
