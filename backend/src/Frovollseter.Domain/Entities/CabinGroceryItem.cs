namespace Frovollseter.Domain.Entities;

// Per-cabin grocery dictionary. Powers the searchable combobox used by
// both inventory and shopping list. Survives deletion of all references —
// once a name has been used in a cabin, it's autocompletable forever.
public class CabinGroceryItem
{
    public Guid Id { get; set; }
    public Guid CabinId { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public DateTimeOffset LastUsedAt { get; set; }
    public int UseCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cabin Cabin { get; set; } = null!;
    public ICollection<InventoryItem> InventoryItems { get; set; } = [];
    public ICollection<ShoppingListItem> ShoppingListItems { get; set; } = [];
}
