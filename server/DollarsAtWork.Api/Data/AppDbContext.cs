using DollarsAtWork.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DollarsAtWork.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Debt> Debts => Set<Debt>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Every money value in the app is stored the same way.
        configurationBuilder.Properties<decimal>().HavePrecision(19, 4);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Plan>(e =>
        {
            e.HasIndex(p => p.UserId).IsUnique();
            e.Property(p => p.Currency).HasMaxLength(3);
            e.Property(p => p.DebtStrategy).HasConversion<string>().HasMaxLength(20).HasDefaultValue(DebtStrategy.Snowball);
            e.HasOne<AppUser>().WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Category>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(60);
            e.Property(c => c.Color).HasMaxLength(9);
            e.Property(c => c.Kind).HasConversion<string>().HasMaxLength(20);
            e.Ignore(c => c.IsBuiltIn);
            e.HasIndex(c => new { c.UserId, c.SortOrder });

            // Exactly one Savings, Debt and Investment category per user; any number of Custom ones.
            e.HasIndex(c => new { c.UserId, c.Kind })
                .IsUnique()
                .HasFilter("[Kind] <> 'Custom'");

            e.HasOne<AppUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Debt>(e =>
        {
            e.Property(d => d.Name).HasMaxLength(60);
            e.Property(d => d.Type).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(d => new { d.UserId, d.SortOrder });
            e.HasOne<AppUser>().WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Subscription>(e =>
        {
            e.HasIndex(s => s.UserId).IsUnique();
            e.HasIndex(s => s.StripeCustomerId);
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(s => s.BillingInterval).HasMaxLength(10);
            e.Property(s => s.StripeCustomerId).HasMaxLength(64);
            e.Property(s => s.StripeSubscriptionId).HasMaxLength(64);
            e.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
