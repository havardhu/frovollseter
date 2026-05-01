using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Infrastructure.Persistence;

public class FrovollseterDbContext(DbContextOptions<FrovollseterDbContext> options) : DbContext(options)
{
    public DbSet<Association> Associations => Set<Association>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AuthToken> AuthTokens => Set<AuthToken>();
    public DbSet<RoadReport> RoadReports => Set<RoadReport>();
    public DbSet<WebcamStream> WebcamStreams => Set<WebcamStream>();
    public DbSet<NewsPost> NewsPosts => Set<NewsPost>();
    public DbSet<UsefulLink> UsefulLinks => Set<UsefulLink>();
    public DbSet<MassInvite> MassInvites => Set<MassInvite>();
    public DbSet<Cabin> Cabins => Set<Cabin>();
    public DbSet<CabinMembership> CabinMemberships => Set<CabinMembership>();
    public DbSet<CabinStorage> CabinStorages => Set<CabinStorage>();
    public DbSet<CabinGroceryItem> CabinGroceryItems => Set<CabinGroceryItem>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ShoppingListItem> ShoppingListItems => Set<ShoppingListItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Association>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.Type).HasConversion<string>();
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).IsRequired().HasMaxLength(256);
            e.Property(x => x.Phone).HasMaxLength(30);
            e.Property(x => x.DisplayName).IsRequired().HasMaxLength(100);
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.Role).HasConversion<string>();
            e.HasOne(x => x.Association).WithMany(a => a.Members)
                .HasForeignKey(x => x.AssociationId);
        });

        modelBuilder.Entity<AuthToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash);
            e.Property(x => x.TokenHash).IsRequired().HasMaxLength(64);
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.Channel).HasConversion<string>();
            e.HasOne(x => x.User).WithMany(u => u.AuthTokens)
                .HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<RoadReport>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.RoadSegment).HasMaxLength(200);
            e.HasOne(x => x.ReportedBy).WithMany(u => u.RoadReports)
                .HasForeignKey(x => x.ReportedById);
            e.HasOne(x => x.ConfirmedBy).WithMany()
                .HasForeignKey(x => x.ConfirmedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<WebcamStream>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.SourceUrl).IsRequired().HasMaxLength(2048);
            e.Property(x => x.LastImageUrl).HasMaxLength(2048);
            e.Property(x => x.AccessLevel).HasConversion<string>();
            e.Property(x => x.FeedType).HasConversion<string>();
            e.HasOne(x => x.Owner).WithMany(u => u.Webcams)
                .HasForeignKey(x => x.OwnerId);
        });

        modelBuilder.Entity<NewsPost>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(300);
            e.Property(x => x.Body).IsRequired();
            e.HasOne(x => x.Author).WithMany(u => u.NewsPosts)
                .HasForeignKey(x => x.AuthorId);
            // Nullable association – a null AssociationId marks a global post.
            e.HasOne(x => x.Association).WithMany(a => a.NewsPosts)
                .HasForeignKey(x => x.AssociationId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UsefulLink>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.Url).IsRequired().HasMaxLength(2048);
            e.Property(x => x.Category).HasMaxLength(100);
            e.HasOne(x => x.CreatedBy).WithMany()
                .HasForeignKey(x => x.CreatedById);
        });

        modelBuilder.Entity<MassInvite>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.Property(x => x.TokenHash).IsRequired().HasMaxLength(64);
            e.Property(x => x.Note).HasMaxLength(200);
            e.HasOne(x => x.Association).WithMany()
                .HasForeignKey(x => x.AssociationId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CreatedBy).WithMany()
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Cabin>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.HasOne(x => x.CreatedBy).WithMany()
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CabinMembership>(e =>
        {
            // Composite primary key — a user can only be a member of a given cabin once.
            e.HasKey(x => new { x.CabinId, x.UserId });
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Role).HasConversion<string>();
            e.HasOne(x => x.Cabin).WithMany(c => c.Members)
                .HasForeignKey(x => x.CabinId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AddedBy).WithMany()
                .HasForeignKey(x => x.AddedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CabinStorage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Icon).HasConversion<string>();
            e.HasIndex(x => new { x.CabinId, x.SortOrder });
            e.HasOne(x => x.Cabin).WithMany(c => c.Storages)
                .HasForeignKey(x => x.CabinId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CabinGroceryItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.NormalizedName).IsRequired().HasMaxLength(200);
            // Case-insensitive uniqueness within a cabin — one row per distinct name.
            e.HasIndex(x => new { x.CabinId, x.NormalizedName }).IsUnique();
            e.HasOne(x => x.Cabin).WithMany(c => c.GroceryItems)
                .HasForeignKey(x => x.CabinId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InventoryItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CabinId, x.StorageId, x.ExpiryDate });
            e.HasIndex(x => new { x.CabinId, x.GroceryItemId });
            e.HasOne(x => x.Cabin).WithMany(c => c.InventoryItems)
                .HasForeignKey(x => x.CabinId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Storage).WithMany(s => s.InventoryItems)
                .HasForeignKey(x => x.StorageId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.GroceryItem).WithMany(g => g.InventoryItems)
                .HasForeignKey(x => x.GroceryItemId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.AddedBy).WithMany()
                .HasForeignKey(x => x.AddedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ShoppingListItem>(e =>
        {
            e.HasKey(x => x.Id);
            // Filtered index covers the dominant query: "active items for this cabin".
            e.HasIndex(x => x.CabinId)
                .HasFilter("\"PurchasedAt\" IS NULL")
                .HasDatabaseName("IX_ShoppingListItems_CabinId_Active");
            e.HasIndex(x => new { x.CabinId, x.PurchasedAt });
            e.Property(x => x.Note).HasMaxLength(200);
            e.HasOne(x => x.Cabin).WithMany(c => c.ShoppingListItems)
                .HasForeignKey(x => x.CabinId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.GroceryItem).WithMany(g => g.ShoppingListItems)
                .HasForeignKey(x => x.GroceryItemId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.AddedBy).WithMany()
                .HasForeignKey(x => x.AddedById)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.PurchasedBy).WithMany()
                .HasForeignKey(x => x.PurchasedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
