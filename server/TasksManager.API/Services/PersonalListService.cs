using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TasksManager.API.Data;
using TasksManager.API.DTOs;
using TasksManager.API.Models;
using TasksManager.API.Services.Interfaces;

namespace TasksManager.API.Services;

public class PersonalListService : IPersonalListService
{
    private readonly AppDbContext _db;

    public PersonalListService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<PersonalListDto>> GetAllByUserAsync(Guid userId)
    {
        // Own lists
        var ownLists = await _db.PersonalLists
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .Include(l => l.CookingItems)
            .ToListAsync();

        // Shared lists accepted by this user
        var sharedIds = await _db.ShareInvites
            .Where(s => s.AcceptedByUserId == userId && s.ResourceType == Models.ShareResourceType.List)
            .Select(s => s.ResourceId)
            .ToListAsync();

        var sharedLists = sharedIds.Any()
            ? await _db.PersonalLists
                .AsNoTracking()
                .Where(l => sharedIds.Contains(l.Id))
                .Include(l => l.Items)
                .Include(l => l.ShoppingItems)
                .Include(l => l.ShoppingSettings)
                .Include(l => l.CookingItems)
                .ToListAsync()
            : new List<PersonalList>();

        return ownLists.Concat(sharedLists).Select(ToDto);
    }

    public async Task<PersonalListDto?> GetByIdAsync(Guid id)
    {
        var list = await _db.PersonalLists
            .AsNoTracking()
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .Include(l => l.CookingItems)
            .FirstOrDefaultAsync(l => l.Id == id);
        return list is null ? null : ToDto(list);
    }

    public async Task<PersonalListDto> CreateAsync(CreatePersonalListDto dto)
    {
        var listType = Enum.TryParse<ListType>(dto.ListType, ignoreCase: true, out var lt) ? lt : ListType.Checklist;

        var list = new PersonalList
        {
            Id        = Guid.NewGuid(),
            UserId    = dto.UserId,
            Title     = dto.Title,
            Emoji     = dto.Emoji,
            ListType  = listType,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.PersonalLists.Add(list);

        // Auto-create default settings for shopping lists
        if (listType == ListType.Shopping)
        {
            _db.ShoppingListSettings.Add(new ShoppingListSettings
            {
                Id           = Guid.NewGuid(),
                PersonalListId = list.Id,
            });
        }

        await _db.SaveChangesAsync();

        list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .Include(l => l.CookingItems)
            .FirstAsync(l => l.Id == list.Id);

        return ToDto(list);
    }

    public async Task<PersonalListDto?> UpdateAsync(Guid id, UpdatePersonalListDto dto, Guid callerId)
    {
        var list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .Include(l => l.CookingItems)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (list is null || list.UserId != callerId) return null;

        if (dto.Title is not null) list.Title = dto.Title;
        if (dto.Emoji is not null) list.Emoji = dto.Emoji;
        if (dto.ListType is not null)
        {
            var newType = Enum.TryParse<ListType>(dto.ListType, ignoreCase: true, out var lt) ? lt : list.ListType;
            list.ListType = newType;
            // Auto-create shopping settings when converting to shopping
            if (newType == ListType.Shopping && list.ShoppingSettings is null)
            {
                _db.ShoppingListSettings.Add(new ShoppingListSettings
                {
                    Id             = Guid.NewGuid(),
                    PersonalListId = list.Id,
                });
            }
        }
        list.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(list);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid callerId)
    {
        var list = await _db.PersonalLists.FirstOrDefaultAsync(l => l.Id == id);
        if (list is null || list.UserId != callerId) return false;
        _db.PersonalLists.Remove(list);
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<bool> HasListAccessAsync(Guid listId, Guid callerId)
    {
        if (await _db.PersonalLists.AnyAsync(l => l.Id == listId && l.UserId == callerId)) return true;
        return await _db.ShareInvites.AnyAsync(s =>
            s.ResourceId == listId &&
            s.ResourceType == Models.ShareResourceType.List &&
            s.AcceptedByUserId == callerId);
    }

    // ── Generic items ─────────────────────────────────────────────────────────

    public async Task<PersonalListItemDto?> AddItemAsync(Guid listId, CreatePersonalListItemDto dto, Guid callerId)
    {
        if (!await HasListAccessAsync(listId, callerId)) return null;
        var item = new PersonalListItem
        {
            Id             = Guid.NewGuid(),
            PersonalListId = listId,
            Title          = dto.Title,
            SortOrder      = dto.SortOrder
        };
        _db.PersonalListItems.Add(item);
        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<PersonalListItemDto?> UpdateItemAsync(Guid itemId, UpdatePersonalListItemDto dto, Guid callerId)
    {
        var item = await _db.PersonalListItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return null;

        if (dto.Title is not null)    item.Title       = dto.Title;
        if (dto.IsCompleted.HasValue) item.IsCompleted = dto.IsCompleted.Value;
        if (dto.SortOrder.HasValue)   item.SortOrder   = dto.SortOrder.Value;

        await _db.SaveChangesAsync();
        return ToItemDto(item);
    }

    public async Task<bool> DeleteItemAsync(Guid itemId, Guid callerId)
    {
        var item = await _db.PersonalListItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return false;
        _db.PersonalListItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Shopping items ────────────────────────────────────────────────────────

    public async Task<ShoppingItemDto?> AddShoppingItemAsync(Guid listId, CreateShoppingItemDto dto, Guid callerId)
    {
        if (!await HasListAccessAsync(listId, callerId)) return null;
        var dept     = Enum.TryParse<ShoppingDepartment>(dto.Department, ignoreCase: true, out var d) ? d : ShoppingDepartment.Other;
        var itemType = Enum.TryParse<ShoppingItemType>(dto.ItemType, ignoreCase: true, out var t)     ? t : ShoppingItemType.Regular;

        var item = new ShoppingItem
        {
            Id             = Guid.NewGuid(),
            PersonalListId = listId,
            Title          = dto.Title,
            Quantity       = dto.Quantity,
            Unit           = dto.Unit,
            Department     = dept,
            ItemType       = itemType,
            IsActive       = true,
            SortOrder      = dto.SortOrder,
            ImageUrl       = dto.ImageUrl,
            PreferredBrand = dto.PreferredBrand,
            AlternativeBrandsJson = dto.AlternativeBrands is not null
                ? JsonSerializer.Serialize(dto.AlternativeBrands)
                : null,
            NoteForBuyer   = dto.NoteForBuyer,
        };
        _db.ShoppingItems.Add(item);
        await _db.SaveChangesAsync();
        return ToShoppingItemDto(item);
    }

    public async Task<ShoppingItemDto?> UpdateShoppingItemAsync(Guid itemId, UpdateShoppingItemDto dto, Guid callerId)
    {
        var item = await _db.ShoppingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return null;

        if (dto.Title is not null)     item.Title    = dto.Title;
        if (dto.Quantity.HasValue)     item.Quantity = dto.Quantity;
        if (dto.Unit is not null)      item.Unit     = dto.Unit;
        if (dto.SortOrder.HasValue)    item.SortOrder = dto.SortOrder.Value;
        if (dto.IsActive.HasValue)     item.IsActive = dto.IsActive.Value;

        if (dto.ImageUrl is not null)       item.ImageUrl       = string.IsNullOrEmpty(dto.ImageUrl) ? null : dto.ImageUrl;
        if (dto.PreferredBrand is not null) item.PreferredBrand = string.IsNullOrEmpty(dto.PreferredBrand) ? null : dto.PreferredBrand;
        if (dto.NoteForBuyer is not null)   item.NoteForBuyer   = string.IsNullOrEmpty(dto.NoteForBuyer)   ? null : dto.NoteForBuyer;
        if (dto.AlternativeBrands is not null)
            item.AlternativeBrandsJson = JsonSerializer.Serialize(dto.AlternativeBrands);

        if (dto.Department is not null &&
            Enum.TryParse<ShoppingDepartment>(dto.Department, ignoreCase: true, out var dept))
            item.Department = dept;

        if (dto.ItemType is not null &&
            Enum.TryParse<ShoppingItemType>(dto.ItemType, ignoreCase: true, out var itype))
            item.ItemType = itype;

        // Handle buy/unbuy
        if (dto.IsBought.HasValue)
        {
            if (dto.IsBought.Value && !item.IsBought)
            {
                item.IsBought = true;
                item.BoughtAt = DateTime.UtcNow;
            }
            else if (!dto.IsBought.Value && item.IsBought)
            {
                item.IsBought = false;
                item.BoughtAt = null;
            }
        }

        await _db.SaveChangesAsync();
        return ToShoppingItemDto(item);
    }

    public async Task<bool> DeleteShoppingItemAsync(Guid itemId, Guid callerId)
    {
        var item = await _db.ShoppingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return false;
        _db.ShoppingItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Shopping settings ─────────────────────────────────────────────────────

    public async Task<ShoppingListSettingsDto?> GetShoppingSettingsAsync(Guid listId)
    {
        var s = await _db.ShoppingListSettings.AsNoTracking().FirstOrDefaultAsync(s => s.PersonalListId == listId);
        return s is null ? null : ToSettingsDto(s);
    }

    public async Task<ShoppingListSettingsDto?> UpsertShoppingSettingsAsync(Guid listId, UpdateShoppingListSettingsDto dto, Guid callerId)
    {
        if (!await HasListAccessAsync(listId, callerId)) return null;
        var s = await _db.ShoppingListSettings.FirstOrDefaultAsync(s => s.PersonalListId == listId);
        if (s is null)
        {
            s = new ShoppingListSettings { Id = Guid.NewGuid(), PersonalListId = listId };
            _db.ShoppingListSettings.Add(s);
        }

        if (dto.EnableSmartSuggestions.HasValue)  s.EnableSmartSuggestions = dto.EnableSmartSuggestions.Value;
        if (dto.OccasionalIntervalDays.HasValue)  s.OccasionalIntervalDays = dto.OccasionalIntervalDays.Value;
        if (dto.GroupByDepartment.HasValue)        s.GroupByDepartment      = dto.GroupByDepartment.Value;
        if (dto.ShowBoughtSection.HasValue)        s.ShowBoughtSection      = dto.ShowBoughtSection.Value;

        await _db.SaveChangesAsync();
        return ToSettingsDto(s);
    }

    // ── Clear trip ────────────────────────────────────────────────────────────

    public async Task<PersonalListDto?> ClearTripAsync(Guid listId, Guid callerId)
    {
        var list = await _db.PersonalLists
            .Include(l => l.Items)
            .Include(l => l.ShoppingItems)
            .Include(l => l.ShoppingSettings)
            .Include(l => l.CookingItems)
            .FirstOrDefaultAsync(l => l.Id == listId);
        if (list is null || !await HasListAccessAsync(listId, callerId)) return null;

        var now = DateTime.UtcNow;
        foreach (var item in list.ShoppingItems.Where(i => i.IsBought))
        {
            item.IsActive     = false;
            item.IsBought     = false;
            item.LastBoughtAt = item.BoughtAt ?? now;
            item.BoughtAt     = null;
        }

        list.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return ToDto(list);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static PersonalListDto ToDto(PersonalList l) => new(
        l.Id,
        l.UserId,
        l.Title,
        l.Emoji,
        l.ListType.ToString().ToLower(),
        l.Items.Select(ToItemDto).OrderBy(i => i.SortOrder),
        l.ShoppingItems.Select(ToShoppingItemDto).OrderBy(i => i.SortOrder),
        l.ShoppingSettings is null ? null : ToSettingsDto(l.ShoppingSettings),        l.CookingItems.Select(ToCookingItemDto).OrderBy(i => i.SortOrder),        l.CreatedAt,
        l.UpdatedAt
    );

    private static PersonalListItemDto ToItemDto(PersonalListItem i) =>
        new(i.Id, i.PersonalListId, i.Title, i.IsCompleted, i.SortOrder);

    private static ShoppingItemDto ToShoppingItemDto(ShoppingItem i)
    {
        IEnumerable<string> altBrands = i.AlternativeBrandsJson is null
            ? Enumerable.Empty<string>()
            : JsonSerializer.Deserialize<IEnumerable<string>>(i.AlternativeBrandsJson) ?? Enumerable.Empty<string>();

        return new ShoppingItemDto(
            i.Id,
            i.PersonalListId,
            i.Title,
            i.Quantity,
            i.Unit,
            i.Department.ToString().ToLower(),
            i.ItemType.ToString().ToLower(),
            i.IsActive,
            i.IsBought,
            i.BoughtAt,
            i.LastBoughtAt,
            i.SortOrder,
            i.ImageUrl,
            i.PreferredBrand,
            altBrands,
            i.NoteForBuyer
        );
    }

    private static ShoppingListSettingsDto ToSettingsDto(ShoppingListSettings s) => new(
        s.EnableSmartSuggestions,
        s.OccasionalIntervalDays,
        s.GroupByDepartment,
        s.ShowBoughtSection
    );

    // ── Cooking items ─────────────────────────────────────────────────────────

    public async Task<CookingItemDto?> AddCookingItemAsync(Guid listId, CreateCookingItemDto dto, Guid callerId)
    {
        if (!await HasListAccessAsync(listId, callerId)) return null;
        var item = new CookingItem
        {
            Id             = Guid.NewGuid(),
            PersonalListId = listId,
            Title          = dto.Title,
            RecipeUrl      = dto.RecipeUrl,
            IngredientsJson = dto.Ingredients is not null
                ? JsonSerializer.Serialize(dto.Ingredients)
                : null,
            Notes       = dto.Notes,
            PlannedDate = dto.PlannedDate,
            TagsJson    = dto.Tags is not null ? JsonSerializer.Serialize(dto.Tags) : null,
            SortOrder   = dto.SortOrder,
            IsCompleted = dto.IsCompleted,
            LinkedTaskId = null,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };
        _db.CookingItems.Add(item);
        await _db.SaveChangesAsync();
        return ToCookingItemDto(item);
    }

    public async Task<CookingItemDto?> UpdateCookingItemAsync(Guid itemId, UpdateCookingItemDto dto, Guid callerId)
    {
        var item = await _db.CookingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return null;

        if (dto.Title is not null)       item.Title       = dto.Title;
        if (dto.RecipeUrl is not null)   item.RecipeUrl   = string.IsNullOrEmpty(dto.RecipeUrl) ? null : dto.RecipeUrl;
        if (dto.Notes is not null)       item.Notes       = string.IsNullOrEmpty(dto.Notes) ? null : dto.Notes;
        if (dto.PlannedDate.HasValue)    item.PlannedDate = dto.PlannedDate;
        if (dto.SortOrder.HasValue)      item.SortOrder   = dto.SortOrder.Value;
        if (dto.LinkedShoppingListId.HasValue) item.LinkedShoppingListId = dto.LinkedShoppingListId;

        if (dto.Ingredients is not null)
            item.IngredientsJson = JsonSerializer.Serialize(dto.Ingredients);
        if (dto.Tags is not null)
            item.TagsJson = JsonSerializer.Serialize(dto.Tags);
        if (dto.IsCompleted.HasValue)
            item.IsCompleted = dto.IsCompleted.Value;
        if (dto.LinkedTaskId.HasValue)
            item.LinkedTaskId = dto.LinkedTaskId.Value;

        item.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToCookingItemDto(item);
    }

    public async Task<bool> DeleteCookingItemAsync(Guid itemId, Guid callerId)
    {
        var item = await _db.CookingItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item is null || !await HasListAccessAsync(item.PersonalListId, callerId)) return false;
        _db.CookingItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Ingredient extraction (rule-based) ────────────────────────────────────

    public async Task<ExtractIngredientsResultDto?> ExtractIngredientsAsync(
        Guid cookingListId, Guid shoppingListId, Guid callerId)
    {
        if (!await HasListAccessAsync(cookingListId, callerId)) return null;

        var cookingItems = await _db.CookingItems
            .AsNoTracking()
            .Where(c => c.PersonalListId == cookingListId)
            .ToListAsync();

        // Aggregate all ingredients, dedup by normalised title
        var aggregated = new Dictionary<string, SuggestedShoppingItemDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var ci in cookingItems)
        {
            if (ci.IngredientsJson is null) continue;
            var ingredients = JsonSerializer.Deserialize<IEnumerable<CookingIngredientDto>>(
                ci.IngredientsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? Enumerable.Empty<CookingIngredientDto>();

            foreach (var ing in ingredients)
            {
                var key = ing.Title.Trim().ToLower();
                if (!aggregated.ContainsKey(key))
                    aggregated[key] = new SuggestedShoppingItemDto(
                        ing.Title.Trim(), ing.Quantity, ing.Unit,
                        GuessShoppingDepartment(ing.Title), false);
            }
        }

        // Check what's already on the shopping list
        var shoppingTitles = await _db.ShoppingItems
            .AsNoTracking()
            .Where(s => s.PersonalListId == shoppingListId && s.IsActive)
            .Select(s => s.Title.ToLower())
            .ToListAsync();

        var result = aggregated.Values
            .Select(item => item with { IsAlreadyOnList = shoppingTitles.Contains(item.Title.ToLower()) })
            .OrderBy(i => i.IsAlreadyOnList)
            .ThenBy(i => i.Title)
            .ToList();

        return new ExtractIngredientsResultDto(result);
    }

    // ── Push ingredients to shopping list ─────────────────────────────────────

    public async Task<bool> PushIngredientsToShoppingAsync(
        Guid cookingListId, PushToShoppingRequestDto dto, Guid callerId)
    {
        if (!await HasListAccessAsync(cookingListId, callerId)) return false;
        if (!await HasListAccessAsync(dto.ShoppingListId, callerId)) return false;

        // Get existing active items on the shopping list (avoid duplicates)
        var existingTitles = await _db.ShoppingItems
            .Where(s => s.PersonalListId == dto.ShoppingListId && s.IsActive)
            .Select(s => s.Title.ToLower())
            .ToListAsync();

        var sortBase = await _db.ShoppingItems
            .Where(s => s.PersonalListId == dto.ShoppingListId)
            .CountAsync();

        int sortOrder = sortBase;
        foreach (var item in dto.Items)
        {
            if (existingTitles.Contains(item.Title.ToLower())) continue;

            var dept = Enum.TryParse<ShoppingDepartment>(item.Department, ignoreCase: true, out var d)
                ? d : ShoppingDepartment.Other;

            _db.ShoppingItems.Add(new ShoppingItem
            {
                Id             = Guid.NewGuid(),
                PersonalListId = dto.ShoppingListId,
                Title          = item.Title,
                Quantity       = item.Quantity,
                Unit           = item.Unit,
                Department     = dept,
                ItemType       = ShoppingItemType.Regular,
                IsActive       = true,
                SortOrder      = sortOrder++,
            });
        }

        // Update LinkedShoppingListId on the cooking list items
        var cookingItems = await _db.CookingItems
            .Where(c => c.PersonalListId == cookingListId)
            .ToListAsync();
        foreach (var ci in cookingItems)
            ci.LinkedShoppingListId = dto.ShoppingListId;

        await _db.SaveChangesAsync();
        return true;
    }

    // ── Cooking history suggestions (rule-based) ──────────────────────────────

    public async Task<IEnumerable<CookingSuggestionDto>> GetCookingSuggestionsAsync(Guid userId)
    {
        // Get all cooking items from all cooking lists owned by the user
        var allItems = await _db.CookingItems
            .AsNoTracking()
            .Where(c => c.PersonalList.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        // Group by normalised title, count, take last ingredients/tags
        var groups = allItems
            .GroupBy(c => c.Title.Trim().ToLower())
            .Select(g =>
            {
                var latest  = g.OrderByDescending(x => x.CreatedAt).First();
                var ingJson = latest.IngredientsJson;
                var tags    = latest.TagsJson is null
                    ? Enumerable.Empty<string>()
                    : JsonSerializer.Deserialize<IEnumerable<string>>(latest.TagsJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                      ?? Enumerable.Empty<string>();
                var ingredients = ingJson is null
                    ? Enumerable.Empty<CookingIngredientDto>()
                    : JsonSerializer.Deserialize<IEnumerable<CookingIngredientDto>>(ingJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                      ?? Enumerable.Empty<CookingIngredientDto>();

                return new CookingSuggestionDto(
                    latest.Title,
                    g.Count(),
                    ingredients,
                    tags,
                    g.Max(x => x.CreatedAt)
                );
            })
            .OrderByDescending(s => s.TimesCooked)
            .ThenByDescending(s => s.LastCooked)
            .Take(20);

        return groups;
    }

    // ── Department detection (rule-based keyword match) ───────────────────────

    private static readonly Dictionary<ShoppingDepartment, string[]> DeptKeywords = new()
    {
        [ShoppingDepartment.FruitsAndVegetables] = [
            "tomato","tomatoes","cucumber","pepper","lettuce","carrot","onion","garlic",
            "potato","apple","banana","lemon","orange","zucchini","broccoli","spinach",
            "parsley","coriander","dill","mint","avocado","eggplant","mushroom",
            // Hebrew
            "עגבנ","מלפ","פלפ","חסה","גזר","בצל","שום","תפוח אדמה","תפוח","בנ","לימ","תפוז",
            "קישוא","ברוקולי","תרד","פטרוזיליה","כוסברה","שמיר","נענע","אבוקדו","חציל","פטריה",
        ],
        [ShoppingDepartment.Dairy] = [
            "milk","cheese","yogurt","butter","cream","sour cream","cottage","feta","mozzarella",
            "cream cheese","whipped cream","custard","egg","eggs",
            // Hebrew
            "חלב","גבינ","יוגורט","חמאה","שמנת","קוטג","פטה","מוצרלה","ביצ",
        ],
        [ShoppingDepartment.MeatAndFish] = [
            "chicken","beef","lamb","turkey","fish","salmon","tuna","shrimp","prawn","steak",
            "mince","ground beef","pork",
            // Hebrew
            "עוף","בשר","כבש","הודו","דג","סלמון","טונה","שרימפס","פרגיות","חזה עוף",
        ],
        [ShoppingDepartment.Bakery] = [
            "bread","pita","roll","bun","challah","baguette","croissant","cake","flour tortilla",
            // Hebrew
            "לחם","פיתה","חלה","כיכר","רול","באגט","קרואסון","עוגה",
        ],
        [ShoppingDepartment.Pantry] = [
            "rice","pasta","oil","olive oil","salt","sugar","flour","semolina","lentil","chickpea",
            "bean","canned","tomato paste","sauce","vinegar","honey","soy sauce","spice","cumin",
            "paprika","turmeric","cinnamon","stock","broth","can","tin",
            // Hebrew
            "אורז","פסטה","שמן","מלח","סוכר","קמח","עדשים","חומוס","שעועית","רסק","רוטב",
            "חומץ","דבש","קטשופ","כמון","פפריקה","כורכום","קינמון","ציר","שימור",
        ],
        [ShoppingDepartment.Frozen] = [
            "frozen","ice cream","gelato",
            "קפוא","גלידה",
        ],
        [ShoppingDepartment.Cleaning] = [
            "soap","detergent","cleaning","bleach","dishwash","laundry","sponge","trash bag",
            "אבקה","סבון","ניקוי","אקונומיקה","ספוג","שקית זבל",
        ],
    };

    private static string GuessShoppingDepartment(string ingredientTitle)
    {
        var lower = ingredientTitle.ToLower();
        foreach (var (dept, keywords) in DeptKeywords)
        {
            if (keywords.Any(k => lower.Contains(k)))
                return dept.ToString().ToLower()[0] + dept.ToString()[1..]; // camelCase first char
        }
        return "other";
    }

    // ── Cooking item mapper ───────────────────────────────────────────────────

    private static CookingItemDto ToCookingItemDto(CookingItem c)
    {
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        var ingredients = c.IngredientsJson is null
            ? Enumerable.Empty<CookingIngredientDto>()
            : JsonSerializer.Deserialize<IEnumerable<CookingIngredientDto>>(c.IngredientsJson, opts)
              ?? Enumerable.Empty<CookingIngredientDto>();

        var tags = c.TagsJson is null
            ? Enumerable.Empty<string>()
            : JsonSerializer.Deserialize<IEnumerable<string>>(c.TagsJson, opts)
              ?? Enumerable.Empty<string>();

        return new CookingItemDto(
            c.Id, c.PersonalListId, c.Title, c.RecipeUrl,
            ingredients, c.Notes, c.PlannedDate, tags,
            c.IsCompleted, c.LinkedShoppingListId, c.LinkedTaskId, c.SortOrder, c.CreatedAt, c.UpdatedAt
        );
    }
}

