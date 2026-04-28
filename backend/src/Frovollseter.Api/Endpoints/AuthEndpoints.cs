using Frovollseter.Application.Auth;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/invite", InviteUser).RequireAuthorization();
        group.MapPost("/request-magic-link", RequestMagicLink).AllowAnonymous();
        group.MapPost("/verify-magic-link", VerifyMagicLink).AllowAnonymous();
        group.MapPost("/request-otp", RequestOtp).AllowAnonymous();
        group.MapPost("/verify-otp", VerifyOtp).AllowAnonymous();
        group.MapPost("/refresh", RefreshToken).AllowAnonymous();
        group.MapPost("/logout", Logout).AllowAnonymous();
        group.MapGet("/me", GetMe).RequireAuthorization();

        // Mass-invite (one shared link, many self-registering users)
        group.MapPost("/mass-invite", CreateMassInvite).RequireAuthorization();
        group.MapGet("/mass-invite", ListMassInvites).RequireAuthorization();
        group.MapDelete("/mass-invite/{id:guid}", DeleteMassInvite).RequireAuthorization();
        group.MapGet("/mass-invite/{token}", LookupMassInvite).AllowAnonymous();
        group.MapPost("/mass-invite/redeem", RedeemMassInvite).AllowAnonymous();

        return app;
    }

    private static async Task<IResult> InviteUser(
        [FromBody] InviteRequest req,
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin"))
            return Results.Forbid();

        Guid associationId;
        if (role == "systemadmin")
        {
            if (req.AssociationId is null)
                return Results.BadRequest(new { error = "AssociationId er påkrevd for SystemAdmin." });
            associationId = req.AssociationId.Value;
        }
        else
        {
            if (!Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out associationId))
                return Results.Unauthorized();
        }

        var inviteRole = UserRole.Member;
        if (req.Role is not null)
        {
            if (!Enum.TryParse<UserRole>(req.Role, ignoreCase: true, out inviteRole) || inviteRole == UserRole.SystemAdmin)
                return Results.BadRequest(new { error = "Ugyldig rolle. Tillatte verdier: Member, Admin." });
        }

        try
        {
            var user = await authService.InviteUserAsync(req.Email, req.DisplayName, associationId, inviteRole, ct);
            return Results.Ok(new { user.Id, user.Email, user.DisplayName, user.Role, user.Status });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { error = ex.Message });
        }
    }

    private static async Task<IResult> RequestMagicLink(
        [FromBody] MagicLinkRequest req,
        AuthService authService,
        CancellationToken ct)
    {
        await authService.RequestMagicLinkAsync(req.Email, req.RememberMe ?? false, ct);
        return Results.Ok(new { message = "If that email exists, a link has been sent." });
    }

    private static async Task<IResult> VerifyMagicLink(
        [FromBody] VerifyTokenRequest req,
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        var result = await authService.VerifyMagicLinkAsync(req.Token, ct);
        if (result is null) return Results.Unauthorized();

        SetRefreshCookie(ctx, result.Tokens.RefreshToken, result.RememberMe);
        return Results.Ok(new { accessToken = result.Tokens.AccessToken, rememberMe = result.RememberMe });
    }

    private static async Task<IResult> RequestOtp(
        [FromBody] MagicLinkRequest req,
        AuthService authService,
        CancellationToken ct)
    {
        await authService.RequestOtpAsync(req.Email, ct);
        return Results.Ok(new { message = "If that email exists, a code has been sent." });
    }

    private static async Task<IResult> VerifyOtp(
        [FromBody] VerifyOtpRequest req,
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        var pair = await authService.VerifyOtpAsync(req.Email, req.Code, ct);
        if (pair is null) return Results.Unauthorized();

        SetRefreshCookie(ctx, pair.RefreshToken, rememberMe: false);
        return Results.Ok(new { accessToken = pair.AccessToken });
    }

    private static IResult RefreshToken(HttpContext ctx, TokenService tokenService, FrovollseterDbContext db)
    {
        // Refresh token rotation is a v2 concern for MVP.
        // For now, return 501 to signal it exists but isn't wired yet.
        return Results.StatusCode(501);
    }

    private static IResult Logout(HttpContext ctx)
    {
        ctx.Response.Cookies.Delete("refresh_token");
        return Results.Ok();
    }

    private static async Task<IResult> GetMe(HttpContext ctx, FrovollseterDbContext db, CancellationToken ct)
    {
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var userId))
            return Results.Unauthorized();

        var user = await db.Users
            .Include(u => u.Association)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null) return Results.NotFound();

        return Results.Ok(new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role,
            user.Status,
            Association = new { user.Association.Id, user.Association.Name, user.Association.Type }
        });
    }

    private static void SetRefreshCookie(HttpContext ctx, string refreshToken, bool rememberMe)
    {
        ctx.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(rememberMe ? 30 : 7),
            Path = "/api/auth/refresh"
        });
    }

    private static async Task<IResult> CreateMassInvite(
        [FromBody] CreateMassInviteRequest req,
        AuthService authService,
        IConfiguration config,
        HttpContext ctx,
        FrovollseterDbContext db,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();
        if (!Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var callerId))
            return Results.Unauthorized();

        Guid associationId;
        if (role == "systemadmin")
        {
            if (req.AssociationId is null)
                return Results.BadRequest(new { error = "AssociationId er påkrevd for SystemAdmin." });
            associationId = req.AssociationId.Value;
            var assocExists = await db.Associations.AnyAsync(a => a.Id == associationId, ct);
            if (!assocExists) return Results.BadRequest(new { error = "Ugyldig forening." });
        }
        else
        {
            if (!Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out associationId))
                return Results.Unauthorized();
        }

        // Default to 14 days if no expiration provided.
        var expiresAt = req.ExpiresAt ?? DateTimeOffset.UtcNow.AddDays(14);

        try
        {
            var created = await authService.CreateMassInviteAsync(associationId, callerId, expiresAt, req.Note, ct);
            var appUrl = config["App:BaseUrl"] ?? "https://frovollseter.no";
            var link = $"{appUrl}/auth/join/{Uri.EscapeDataString(created.RawToken)}";
            var callerName = ctx.User.FindFirst("name")?.Value ?? "";
            return Results.Ok(new
            {
                created.Invite.Id,
                Token = created.RawToken,
                Url = link,
                created.Invite.ExpiresAt,
                created.Invite.CreatedAt,
                created.Invite.RedemptionCount,
                created.Invite.Note,
                IsExpired = created.Invite.IsExpired,
                Association = new { created.Invite.Association.Id, created.Invite.Association.Name },
                CreatedBy = new { Id = callerId, DisplayName = callerName }
            });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> ListMassInvites(
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        Guid? filter = null;
        if (role == "admin")
        {
            if (!Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var assocId))
                return Results.Unauthorized();
            filter = assocId;
        }

        var invites = await authService.ListMassInvitesAsync(filter, ct);
        return Results.Ok(invites.Select(i => new
        {
            i.Id,
            i.ExpiresAt,
            i.CreatedAt,
            i.RedemptionCount,
            i.Note,
            IsExpired = i.IsExpired,
            Association = new { i.Association.Id, i.Association.Name },
            CreatedBy = new { i.CreatedBy.Id, i.CreatedBy.DisplayName }
        }));
    }

    private static async Task<IResult> LookupMassInvite(
        string token,
        AuthService authService,
        CancellationToken ct)
    {
        var invite = await authService.GetMassInviteByTokenAsync(token, ct);
        if (invite is null) return Results.NotFound(new { error = "Ugyldig invitasjon." });
        if (invite.IsExpired) return Results.BadRequest(new { error = "Invitasjonen er utløpt." });

        return Results.Ok(new
        {
            invite.ExpiresAt,
            Association = new { invite.Association.Id, invite.Association.Name, invite.Association.Type }
        });
    }

    private static async Task<IResult> DeleteMassInvite(
        Guid id,
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        var role = ctx.User.FindFirst("role")?.Value;
        if (role is not ("admin" or "systemadmin")) return Results.Forbid();

        var invite = await authService.GetMassInviteByIdAsync(id, ct);
        if (invite is null) return Results.NotFound();

        // Admin can only delete invites for their own association.
        if (role == "admin")
        {
            if (!Guid.TryParse(ctx.User.FindFirst("assoc")?.Value, out var callerAssocId))
                return Results.Unauthorized();
            if (invite.AssociationId != callerAssocId) return Results.Forbid();
        }

        await authService.DeleteMassInviteAsync(id, ct);
        return Results.NoContent();
    }

    private static async Task<IResult> RedeemMassInvite(
        [FromBody] RedeemMassInviteRequest req,
        AuthService authService,
        HttpContext ctx,
        CancellationToken ct)
    {
        try
        {
            var result = await authService.RedeemMassInviteAsync(req.Token, req.Email, req.DisplayName, ct);
            if (result is null) return Results.BadRequest(new { error = "Ugyldig eller utløpt invitasjon." });

            // Mass-invite registrants are immediately logged in (no remember-me; they can opt in next time).
            SetRefreshCookie(ctx, result.Tokens.RefreshToken, rememberMe: false);
            return Results.Ok(new
            {
                accessToken = result.Tokens.AccessToken,
                user = new { result.User.Id, result.User.Email, result.User.DisplayName }
            });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { error = ex.Message });
        }
    }

    private record InviteRequest(string Email, string DisplayName, Guid? AssociationId, string? Role);
    private record MagicLinkRequest(string Email, bool? RememberMe);
    private record VerifyTokenRequest(string Token);
    private record VerifyOtpRequest(string Email, string Code);
    private record CreateMassInviteRequest(Guid? AssociationId, DateTimeOffset? ExpiresAt, string? Note);
    private record RedeemMassInviteRequest(string Token, string Email, string DisplayName);
}
