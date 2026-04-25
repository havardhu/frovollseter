namespace Frovollseter.Domain.Entities;

public class WebcamStream
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? LocationHint { get; set; }
    public bool IsPublic { get; set; }
    public string SourceUrl { get; set; } = "";
    public string? LastImageUrl { get; set; }
    public DateTimeOffset? LastImageAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User Owner { get; set; } = null!;
    public ICollection<WebcamAccessGrant> AccessGrants { get; set; } = [];
}

public class WebcamAccessGrant
{
    public Guid WebcamId { get; set; }
    public Guid AssociationId { get; set; }

    public WebcamStream Webcam { get; set; } = null!;
    public Association Association { get; set; } = null!;
}
