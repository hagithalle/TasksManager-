namespace TasksManager.API.DTOs;

public record CreateShareDto(string ResourceType, Guid ResourceId);
public record AcceptShareDto();   // empty – identity from JWT

public record ShareInviteDto(
    string Token,
    string ResourceType,
    Guid   ResourceId,
    string OwnerName,
    string? ResourceTitle
);
