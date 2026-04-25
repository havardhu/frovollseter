using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string DisplayName { get; set; } = "";
    public UserStatus Status { get; set; } = UserStatus.Pending;
    public UserRole Role { get; set; } = UserRole.Member;
    public Guid AssociationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }

    public Association Association { get; set; } = null!;
    public ICollection<AuthToken> AuthTokens { get; set; } = [];
    public ICollection<RoadReport> RoadReports { get; set; } = [];
    public ICollection<WebcamStream> Webcams { get; set; } = [];
    public ICollection<NewsPost> NewsPosts { get; set; } = [];
}
