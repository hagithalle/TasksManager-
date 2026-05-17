using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using TasksManager.API.Models;

namespace TasksManager.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.ConfigureWarnings(w =>
            w.Ignore(RelationalEventId.PendingModelChangesWarning));
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<SubTask> SubTasks => Set<SubTask>();
    public DbSet<PersonalList> PersonalLists => Set<PersonalList>();
    public DbSet<PersonalListItem> PersonalListItems => Set<PersonalListItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.Property(u => u.DisplayName).IsRequired().HasMaxLength(100);
            e.Property(u => u.Email).IsRequired().HasMaxLength(200);
            e.Property(u => u.PasswordHash).IsRequired();
            e.Property(u => u.Language).HasMaxLength(10).HasDefaultValue("en");
            e.HasIndex(u => u.Email).IsUnique();
        });

        // ── Goal ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<Goal>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Title).IsRequired().HasMaxLength(200);
            e.Property(g => g.Category).HasConversion<string>();
            e.Property(g => g.GoalType).HasConversion<string>();

            e.HasOne(g => g.User)
             .WithMany(u => u.Goals)
             .HasForeignKey(g => g.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── TaskItem ──────────────────────────────────────────────────────────
        modelBuilder.Entity<TaskItem>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Title).IsRequired().HasMaxLength(300);
            e.Property(t => t.Priority).HasConversion<string>();
            e.Property(t => t.ExecutionType).HasConversion<string>();
            e.Property(t => t.Difficulty).HasConversion<string>();
            e.Property(t => t.PlannedTime).HasMaxLength(5); // "HH:mm"

            e.HasOne(t => t.User)
             .WithMany(u => u.Tasks)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.Goal)
             .WithMany(g => g.Tasks)
             .HasForeignKey(t => t.GoalId)
             .OnDelete(DeleteBehavior.NoAction)
             .IsRequired(false);

            e.HasOne(t => t.PersonalList)
             .WithMany(l => l.Tasks)
             .HasForeignKey(t => t.ListId)
             .OnDelete(DeleteBehavior.NoAction)
             .IsRequired(false);
        });

        // ── SubTask ───────────────────────────────────────────────────────────
        modelBuilder.Entity<SubTask>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Title).IsRequired().HasMaxLength(300);
            e.Property(s => s.ExecutionType).HasConversion<string>();
            e.Property(s => s.Priority).HasConversion<string>();

            e.HasOne(s => s.TaskItem)
             .WithMany(t => t.SubTasks)
             .HasForeignKey(s => s.TaskItemId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PersonalList ──────────────────────────────────────────────────────
        modelBuilder.Entity<PersonalList>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Title).IsRequired().HasMaxLength(200);
            e.Property(l => l.Emoji).HasMaxLength(10);

            e.HasOne(l => l.User)
             .WithMany(u => u.PersonalLists)
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PersonalListItem ──────────────────────────────────────────────────
        modelBuilder.Entity<PersonalListItem>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.Title).IsRequired().HasMaxLength(300);

            e.HasOne(i => i.PersonalList)
             .WithMany(l => l.Items)
             .HasForeignKey(i => i.PersonalListId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
