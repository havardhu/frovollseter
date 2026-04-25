using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class Association
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public AssociationType Type { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<User> Members { get; set; } = [];
    public ICollection<NewsPost> NewsPosts { get; set; } = [];
    public ICollection<WebcamAccessGrant> WebcamAccess { get; set; } = [];
}
