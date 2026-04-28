using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class WebcamStream
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? LocationHint { get; set; }
    public WebcamAccessLevel AccessLevel { get; set; } = WebcamAccessLevel.Members;
    public WebcamFeedType FeedType { get; set; } = WebcamFeedType.StaticImage;
    public string SourceUrl { get; set; } = "";
    public string? LastImageUrl { get; set; }
    public DateTimeOffset? LastImageAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User Owner { get; set; } = null!;
}
