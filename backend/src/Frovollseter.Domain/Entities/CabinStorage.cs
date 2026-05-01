using Frovollseter.Domain.Enums;

namespace Frovollseter.Domain.Entities;

public class CabinStorage
{
    public Guid Id { get; set; }
    public Guid CabinId { get; set; }
    public string Name { get; set; } = "";
    public StorageIcon Icon { get; set; } = StorageIcon.Other;
    public int SortOrder { get; set; }
    public bool IsTempControlled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cabin Cabin { get; set; } = null!;
    public ICollection<InventoryItem> InventoryItems { get; set; } = [];
}
