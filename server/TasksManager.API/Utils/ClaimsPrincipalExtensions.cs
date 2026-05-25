using System;
using System.Security.Claims;

namespace TasksManager.API.Utils
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid GetUserId(this ClaimsPrincipal user)
        {
            var id = user.FindFirstValue("sub") ?? user.FindFirstValue("userId");
            if (id == null) throw new Exception("User ID claim not found");
            return Guid.Parse(id);
        }
    }
}
