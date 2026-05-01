namespace Frovollseter.Domain.Entities;

// A physical thing currently in some storage. Quantity is integer —
// the unit lives in the grocery name (e.g. "1/2 liter øl" + qty 8).
public class InventoryItem
{
    public Guid Id { get; set; }
    // Denormalized for query speed; must equal Storage.CabinId and Grocery.CabinId.
    public Guid CabinId { get; set; }
    public Guid StorageId { get; set; }
    public Guid GroceryItemId { get; set; }
    public int Quantity { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public Guid AddedById { get; set; }
    public DateTimeOffset AddedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Cabin Cabin { get; set; } = null!;
    public CabinStorage Storage { get; set; } = null!;
    public CabinGroceryItem GroceryItem { get; set; } = null!;
    public User AddedBy { get; set; } = null!;
}
