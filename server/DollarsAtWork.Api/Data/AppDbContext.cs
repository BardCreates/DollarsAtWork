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
    public DbSet<SavingsGoal> SavingsGoals => Set<SavingsGoal>();
    public DbSet<InvestmentAccount> InvestmentAccounts => Set<InvestmentAccount>();
    public DbSet<OtherItem> OtherItems => Set<OtherItem>();
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<ProcessedStripeEvent> ProcessedStripeEvents => Set<ProcessedStripeEvent>();

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
            e.Property(p => p.DebtDoneDestination).HasConversion<string>().HasMaxLength(20).HasDefaultValue(FreedMoneyDestination.Investments);
            e.Property(p => p.SavingsDoneDestination).HasConversion<string>().HasMaxLength(20).HasDefaultValue(FreedMoneyDestination.Investments);
            e.Property(p => p.InflationRate).HasDefaultValue(3m);
            e.Property(p => p.SavingsSplitMode).HasConversion<string>().HasMaxLength(20).HasDefaultValue(SavingsSplitMode.Priority);
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

        builder.Entity<SavingsGoal>(e =>
        {
            e.Property(g => g.Name).HasMaxLength(60);
            e.HasIndex(g => new { g.UserId, g.Priority });
            e.HasOne<AppUser>().WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InvestmentAccount>(e =>
        {
            e.Property(a => a.Name).HasMaxLength(60);
            e.Property(a => a.Type).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(a => new { a.UserId, a.SortOrder });
            e.HasOne<AppUser>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<OtherItem>(e =>
        {
            e.Property(i => i.Name).HasMaxLength(60);
            e.Property(i => i.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(i => i.Type).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(i => new { i.UserId, i.SortOrder });
            e.HasOne<AppUser>().WithMany().HasForeignKey(i => i.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<NetWorthSnapshot>(e =>
        {
            e.HasIndex(s => new { s.UserId, s.Date }).IsUnique();
            e.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ProcessedStripeEvent>(e =>
        {
            e.HasKey(p => p.EventId);
            e.Property(p => p.EventId).HasMaxLength(255);
        });

        builder.Entity<Subscription>(e =>
        {
            e.HasIndex(s => s.UserId).IsUnique();
            e.HasIndex(s => s.StripeCustomerId);
            e.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(s => s.TrialEmailStage).HasConversion<string>().HasMaxLength(20).HasDefaultValue(TrialEmailStage.None);
            e.Property(s => s.BillingInterval).HasMaxLength(10);
            e.Property(s => s.StripeCustomerId).HasMaxLength(64);
            e.Property(s => s.StripeSubscriptionId).HasMaxLength(64);
            e.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
