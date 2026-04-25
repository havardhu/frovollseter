namespace Frovollseter.Domain.Entities;

public class NewsPost
{
    public Guid Id { get; set; }
    public Guid AuthorId { get; set; }
    public Guid AssociationId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User Author { get; set; } = null!;
    public Association Association { get; set; } = null!;
}

public class UsefulLink
{
    public Guid Id { get; set; }
    public Guid CreatedById { get; set; }
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
    public string? Description { get; set; }
    public string? Category { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public User CreatedBy { get; set; } = null!;
}
