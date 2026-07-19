using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services;

namespace TasksManager.Tests.Services;

/// <summary>
/// Unit tests for TaskService.UpdateSubTaskAsync.
/// Each test uses an isolated in-memory database so there is no shared state.
/// </summary>
public class TaskServiceSubTaskTests
{
    // ── DB + service factory ─────────────────────────────────────────────────────

    private static AppDbContext CreateDb()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())   // unique per test
            .Options;
        return new AppDbContext(opts);
    }

    private static TaskService CreateService(AppDbContext db) => new(db);

    // ── Seed helpers ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Seeds a TaskItem owned by a specific user with the given subtask completion states.
    /// Returns the seeded task and the owner's userId.
    /// </summary>
    private static async Task<(TaskItem task, Guid userId)> SeedTask(
        AppDbContext db,
        DailyRole dailyRole     = DailyRole.OngoingHabit,
        ItemStatus status       = ItemStatus.Open,
        bool parentCompleted    = false,
        params bool[] subTaskDoneFlags)
    {
        var userId = Guid.NewGuid();
        var task   = new TaskItem
        {
            Id          = Guid.NewGuid(),
            UserId      = userId,
            Title       = "Parent task",
            DailyRole   = dailyRole,
            Status      = status,
            IsCompleted = parentCompleted,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };
        db.Tasks.Add(task);

        var subs = subTaskDoneFlags.Select((done, i) => new SubTask
        {
            Id          = Guid.NewGuid(),
            TaskItemId  = task.Id,
            Title       = $"Sub {i + 1}",
            IsCompleted = done,
        }).ToList();
        db.SubTasks.AddRange(subs);

        await db.SaveChangesAsync();

        // Re-read the task so SubTasks collection is populated
        var saved = await db.Tasks.Include(t => t.SubTasks).FirstAsync(t => t.Id == task.Id);
        return (saved, userId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Completing a non-final subtask does NOT complete the parent
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task NonFinalSubtask_CompletingIt_DoesNotCompleteParent()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db,
            subTaskDoneFlags: new[] { false, false, false });

        var subToComplete = task.SubTasks.First();
        var dto           = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(subToComplete.Id, dto, userId);

        Assert.NotNull(result);
        Assert.False(result.IsCompleted);   // parent still incomplete
        Assert.Null(result.CompletedAt);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Completing the final open subtask completes the parent
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task FinalSubtask_CompletingIt_CompletesParent()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        // Two subtasks; first is already done, second (final) is about to be completed
        var (task, userId) = await SeedTask(db,
            subTaskDoneFlags: new[] { true, false });

        var finalSub = task.SubTasks.Single(s => !s.IsCompleted);
        var dto      = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(finalSub.Id, dto, userId);

        Assert.NotNull(result);
        Assert.True(result.IsCompleted);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Completing the final subtask sets CompletedAt on the parent
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task FinalSubtask_CompletingIt_SetsParentCompletedAt()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db, subTaskDoneFlags: new[] { true, false });
        var finalSub = task.SubTasks.Single(s => !s.IsCompleted);
        var dto      = new UpdateSubTaskDto(null, true, null, null, null, null);

        var before = DateTime.UtcNow;
        var result = await svc.UpdateSubTaskAsync(finalSub.Id, dto, userId);
        var after  = DateTime.UtcNow;

        Assert.NotNull(result);
        Assert.NotNull(result.CompletedAt);
        Assert.True(result.CompletedAt >= before && result.CompletedAt <= after);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Returned DTO contains the full updated subtask list
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSubTask_ReturnedDto_ContainsAllSiblingSubtasks()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db,
            subTaskDoneFlags: new[] { false, false, false });

        var firstSub = task.SubTasks.First();
        var dto      = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(firstSub.Id, dto, userId);

        Assert.NotNull(result);
        var resultSubs = result.SubTasks.ToList();
        Assert.Equal(3, resultSubs.Count);

        var completedSub = resultSubs.Single(s => s.Id == firstSub.Id);
        Assert.True(completedSub.IsCompleted);

        // Siblings remain incomplete
        Assert.Equal(2, resultSubs.Count(s => !s.IsCompleted));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Returned DTO preserves DailyRole
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSubTask_ReturnedDto_PreservesDailyRole()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db,
            dailyRole: DailyRole.OngoingHabit,
            subTaskDoneFlags: new[] { false });

        var dto = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(task.SubTasks.First().Id, dto, userId);

        Assert.NotNull(result);
        Assert.Equal("ongoingHabit", result.DailyRole);   // camelCase — confirms SerializeDailyRole fix
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Uncompleting a subtask does NOT reopen a completed parent
    //    (existing business rule: no auto-reopen on the parent)
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UncompletingSubtask_DoesNotReopenParent()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        // Both subtasks done, parent auto-completed
        var (task, userId) = await SeedTask(db,
            parentCompleted: true,
            subTaskDoneFlags: new[] { true, true });

        // Uncomplete the first subtask
        var subToReopen = task.SubTasks.First();
        var dto         = new UpdateSubTaskDto(null, false, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(subToReopen.Id, dto, userId);

        Assert.NotNull(result);
        // Parent remains completed — no auto-reopen logic exists
        Assert.True(result.IsCompleted);

        // Confirmed in DB
        var dbTask = await db.Tasks.FindAsync(task.Id);
        Assert.NotNull(dbTask);
        Assert.True(dbTask!.IsCompleted);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. Completing all subtasks of an Archived parent:
    //    parent IsCompleted is set to true; Status remains Archived
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AllSubtasksDone_ArchivedParent_IsCompletedSetButStatusKept()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db,
            status:          ItemStatus.Archived,
            parentCompleted: false,
            subTaskDoneFlags: new[] { false });

        var dto = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(task.SubTasks.First().Id, dto, userId);

        Assert.NotNull(result);
        // Auto-complete fires regardless of parent status
        Assert.True(result.IsCompleted);
        // Status field is NOT changed by auto-complete
        Assert.Equal(ItemStatus.Archived, result.Status);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 8a. Non-existent subtask returns null
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSubTask_NonExistentSubtask_ReturnsNull()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var fakeSubId = Guid.NewGuid();
        var callerId  = Guid.NewGuid();
        var dto       = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(fakeSubId, dto, callerId);

        Assert.Null(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 8b. Wrong caller (not the task owner) returns null
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSubTask_WrongCaller_ReturnsNull()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, _) = await SeedTask(db, subTaskDoneFlags: new[] { false });
        var sub       = task.SubTasks.First();
        var wrongUser = Guid.NewGuid();   // different from task.UserId
        var dto       = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(sub.Id, dto, wrongUser);

        Assert.Null(result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DailyRole serialization: SerializeDailyRole produces correct camelCase strings
    // (regression guard for the .ToLower() casing bug)
    // ─────────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(DailyRole.Focus,          "focus")]
    [InlineData(DailyRole.MorningRoutine, "morningRoutine")]
    [InlineData(DailyRole.OngoingHabit,   "ongoingHabit")]
    public async Task DailyRoleSerialization_IsCamelCase(DailyRole role, string expected)
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db, dailyRole: role, subTaskDoneFlags: new[] { false });
        var dto = new UpdateSubTaskDto(null, true, null, null, null, null);

        var result = await svc.UpdateSubTaskAsync(task.SubTasks.First().Id, dto, userId);

        Assert.NotNull(result);
        Assert.Equal(expected, result.DailyRole);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Single-subtask habit: completing it completes the parent in one call
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SingleSubtask_CompletingIt_CompletesParentAndSetsCompletedAt()
    {
        using var db = CreateDb();
        var svc = CreateService(db);

        var (task, userId) = await SeedTask(db, subTaskDoneFlags: new[] { false });
        var dto = new UpdateSubTaskDto(null, true, null, null, null, null);

        var before = DateTime.UtcNow;
        var result = await svc.UpdateSubTaskAsync(task.SubTasks.Single().Id, dto, userId);
        var after  = DateTime.UtcNow;

        Assert.NotNull(result);
        Assert.True(result.IsCompleted);
        Assert.NotNull(result.CompletedAt);
        Assert.True(result.CompletedAt >= before && result.CompletedAt <= after);
        Assert.Equal(1, result.SubTasks.Count(s => s.IsCompleted));
    }
}
