namespace Frovollseter.Domain.Entities;

public class ShoppingListItem
{
    public Guid Id { get; set; }
    public Guid CabinId { get; set; }
    public Guid GroceryItemId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Note { get; set; }
    public Guid AddedById { get; set; }
    public DateTimeOffset AddedAt { get; set; }
    // Null = still on the active list.
    public DateTimeOffset? PurchasedAt { get; set; }
    public Guid? PurchasedById { get; set; }

    public Cabin Cabin { get; set; } = null!;
    public CabinGroceryItem GroceryItem { get; set; } = null!;
    public User AddedBy { get; set; } = null!;
    public User? PurchasedBy { get; set; }
}
