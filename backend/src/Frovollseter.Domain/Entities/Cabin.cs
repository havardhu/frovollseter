namespace Frovollseter.Domain.Entities;

public class Cabin
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Guid CreatedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User CreatedBy { get; set; } = null!;
    public ICollection<CabinMembership> Members { get; set; } = [];
    public ICollection<CabinStorage> Storages { get; set; } = [];
    public ICollection<CabinGroceryItem> GroceryItems { get; set; } = [];
    public ICollection<InventoryItem> InventoryItems { get; set; } = [];
    public ICollection<ShoppingListItem> ShoppingListItems { get; set; } = [];
}
