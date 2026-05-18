using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;

namespace TasksManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ShareController : ControllerBase
{
    private readonly AppDbContext _db;

    public ShareController(AppDbContext db) => _db = db;

    // ── Create invite link ──────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create(CreateShareDto dto)
    {
        var ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (!Enum.TryParse<ShareResourceType>(dto.ResourceType, ignoreCase: true, out var resourceType))
            return BadRequest("Invalid resource type.");

        // Check if an active (unaccepted) invite already exists for this resource
        var existing = await _db.ShareInvites
            .Where(s => s.OwnerId == ownerId && s.ResourceId == dto.ResourceId
                        && s.ResourceType == resourceType && s.AcceptedByUserId == null)
            .FirstOrDefaultAsync();

        if (existing is not null)
            return Ok(new { token = existing.Token });

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                           .Replace("+", "-").Replace("/", "_").Replace("=", "")
                           .Substring(0, 22);

        var invite = new ShareInvite
        {
            Id           = Guid.NewGuid(),
            Token        = token,
            ResourceType = resourceType,
            ResourceId   = dto.ResourceId,
            OwnerId      = ownerId,
            CreatedAt    = DateTime.UtcNow,
        };

        _db.ShareInvites.Add(invite);
        await _db.SaveChangesAsync();

        return Ok(new { token });
    }

    // ── Get invite info (for the join page) ─────────────────────────────────
    [HttpGet("{token}")]
    public async Task<IActionResult> GetInfo(string token)
    {
        var invite = await _db.ShareInvites
            .Include(s => s.Owner)
            .FirstOrDefaultAsync(s => s.Token == token);

        if (invite is null) return NotFound();

        string? title = invite.ResourceType switch
        {
            ShareResourceType.List => await _db.PersonalLists
                .Where(l => l.Id == invite.ResourceId).Select(l => l.Title).FirstOrDefaultAsync(),
            ShareResourceType.Goal => await _db.Goals
                .Where(g => g.Id == invite.ResourceId).Select(g => g.Title).FirstOrDefaultAsync(),
            ShareResourceType.Task => await _db.Tasks
                .Where(t => t.Id == invite.ResourceId).Select(t => t.Title).FirstOrDefaultAsync(),
            _ => null
        };

        return Ok(new ShareInviteDto(
            invite.Token,
            invite.ResourceType.ToString(),
            invite.ResourceId,
            invite.Owner.DisplayName,
            title
        ));
    }

    // ── Accept invite ────────────────────────────────────────────────────────
    [HttpPost("{token}/accept")]
    public async Task<IActionResult> Accept(string token)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invite = await _db.ShareInvites
            .FirstOrDefaultAsync(s => s.Token == token);

        if (invite is null) return NotFound();
        if (invite.OwnerId == userId) return BadRequest("Cannot share with yourself.");
        if (invite.AcceptedByUserId is not null && invite.AcceptedByUserId != userId)
            return Conflict("Already accepted by another user.");

        invite.AcceptedByUserId = userId;
        invite.AcceptedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { resourceType = invite.ResourceType.ToString(), resourceId = invite.ResourceId });
    }

    // ── Revoke invite (owner only) ───────────────────────────────────────────
    [HttpDelete("{token}")]
    public async Task<IActionResult> Revoke(string token)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var invite = await _db.ShareInvites
            .FirstOrDefaultAsync(s => s.Token == token);

        if (invite is null) return NotFound();
        if (invite.OwnerId != userId) return Forbid();

        _db.ShareInvites.Remove(invite);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── List active shares for a resource (owner only) ──────────────────────
    [HttpGet("resource/{resourceType}/{resourceId:guid}")]
    public async Task<IActionResult> GetForResource(string resourceType, Guid resourceId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (!Enum.TryParse<ShareResourceType>(resourceType, ignoreCase: true, out var rt))
            return BadRequest();

        var invites = await _db.ShareInvites
            .Include(s => s.AcceptedByUser)
            .Where(s => s.OwnerId == userId && s.ResourceId == resourceId && s.ResourceType == rt)
            .Select(s => new {
                token         = s.Token,
                acceptedByName= s.AcceptedByUser != null ? s.AcceptedByUser.DisplayName : (string?)null,
                createdAt     = s.CreatedAt,
            })
            .ToListAsync();

        return Ok(invites);
    }
}
