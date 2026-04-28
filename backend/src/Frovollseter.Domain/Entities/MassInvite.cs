namespace Frovollseter.Domain.Entities;

public class MassInvite
{
    public Guid Id { get; set; }
    public string TokenHash { get; set; } = "";
    public Guid AssociationId { get; set; }
    public Guid CreatedById { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int RedemptionCount { get; set; }

    public Association Association { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;

    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAt;
    public bool IsValid => !IsExpired;
}
