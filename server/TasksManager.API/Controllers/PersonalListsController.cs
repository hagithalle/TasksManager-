using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TasksManager.API.DTOs;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PersonalListsController : ControllerBase
{
    private readonly IPersonalListService _service;

    public PersonalListsController(IPersonalListService service) => _service = service;

    private Guid? GetCallerId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var callerId = GetCallerId();
        if (callerId is null || callerId != userId) return Forbid();
        return Ok(await _service.GetAllByUserAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var list = await _service.GetByIdAsync(id);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePersonalListDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        dto = dto with { UserId = callerId.Value };
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePersonalListDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var updated = await _service.UpdateAsync(id, dto, callerId.Value);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var deleted = await _service.DeleteAsync(id, callerId.Value);
        return deleted ? NoContent() : NotFound();
    }

    // ── Generic list items ────────────────────────────────────────────────────

    [HttpPost("{listId:guid}/items")]
    public async Task<IActionResult> AddItem(Guid listId, CreatePersonalListItemDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var item = await _service.AddItemAsync(listId, dto, callerId.Value);
        return item is null ? NotFound() : Created(string.Empty, item);
    }

    [HttpPatch("items/{itemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid itemId, UpdatePersonalListItemDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var item = await _service.UpdateItemAsync(itemId, dto, callerId.Value);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid itemId)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var deleted = await _service.DeleteItemAsync(itemId, callerId.Value);
        return deleted ? NoContent() : NotFound();
    }

    // ── Shopping items ────────────────────────────────────────────────────────

    [HttpPost("{listId:guid}/shopping-items")]
    public async Task<IActionResult> AddShoppingItem(Guid listId, CreateShoppingItemDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var item = await _service.AddShoppingItemAsync(listId, dto, callerId.Value);
        return item is null ? NotFound() : Created(string.Empty, item);
    }

    [HttpPatch("shopping-items/{itemId:guid}")]
    public async Task<IActionResult> UpdateShoppingItem(Guid itemId, UpdateShoppingItemDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var item = await _service.UpdateShoppingItemAsync(itemId, dto, callerId.Value);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpDelete("shopping-items/{itemId:guid}")]
    public async Task<IActionResult> DeleteShoppingItem(Guid itemId)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var deleted = await _service.DeleteShoppingItemAsync(itemId, callerId.Value);
        return deleted ? NoContent() : NotFound();
    }

    // ── Shopping settings ─────────────────────────────────────────────────────

    [HttpGet("{listId:guid}/shopping-settings")]
    public async Task<IActionResult> GetShoppingSettings(Guid listId)
    {
        var settings = await _service.GetShoppingSettingsAsync(listId);
        return settings is null ? NotFound() : Ok(settings);
    }

    [HttpPut("{listId:guid}/shopping-settings")]
    public async Task<IActionResult> UpsertShoppingSettings(Guid listId, UpdateShoppingListSettingsDto dto)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var settings = await _service.UpsertShoppingSettingsAsync(listId, dto, callerId.Value);
        return settings is null ? NotFound() : Ok(settings);
    }

    // ── Clear trip ────────────────────────────────────────────────────────────

    [HttpPost("{listId:guid}/clear-trip")]
    public async Task<IActionResult> ClearTrip(Guid listId)
    {
        var callerId = GetCallerId();
        if (callerId is null) return Unauthorized();
        var list = await _service.ClearTripAsync(listId, callerId.Value);
        return list is null ? NotFound() : Ok(list);
    }
}

