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
    public DbSet<WebcamAccessGrant> WebcamAccessGrants => Set<WebcamAccessGrant>();
    public DbSet<NewsPost> NewsPosts => Set<NewsPost>();
    public DbSet<UsefulLink> UsefulLinks => Set<UsefulLink>();

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
            e.HasOne(x => x.Owner).WithMany(u => u.Webcams)
                .HasForeignKey(x => x.OwnerId);
        });

        modelBuilder.Entity<WebcamAccessGrant>(e =>
        {
            e.HasKey(x => new { x.WebcamId, x.AssociationId });
            e.HasOne(x => x.Webcam).WithMany(w => w.AccessGrants)
                .HasForeignKey(x => x.WebcamId);
            e.HasOne(x => x.Association).WithMany(a => a.WebcamAccess)
                .HasForeignKey(x => x.AssociationId);
        });

        modelBuilder.Entity<NewsPost>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(300);
            e.Property(x => x.Body).IsRequired();
            e.HasOne(x => x.Author).WithMany(u => u.NewsPosts)
                .HasForeignKey(x => x.AuthorId);
            e.HasOne(x => x.Association).WithMany(a => a.NewsPosts)
                .HasForeignKey(x => x.AssociationId);
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
    }
}
