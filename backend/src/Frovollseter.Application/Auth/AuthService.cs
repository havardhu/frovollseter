using System.Security.Cryptography;
using System.Text;
using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Email;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Frovollseter.Application.Auth;

public record MagicLinkVerifyResult(TokenPair Tokens, bool RememberMe);

public record MassInviteCreated(MassInvite Invite, string RawToken);
public record MassInviteRedeemResult(User User, TokenPair Tokens);

public class AuthService(
    FrovollseterDbContext db,
    IEmailService email,
    TokenService tokenService,
    IConfiguration config)
{
    private static string HashToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    private static string GenerateSecureToken(int byteLength = 32) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(byteLength))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

    private static string GenerateOtp() =>
        RandomNumberGenerator.GetInt32(100_000, 1_000_000).ToString();

    public async Task<User> InviteUserAsync(string emailAddress, string displayName, Guid associationId, UserRole role, CancellationToken ct)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == emailAddress, ct);
        if (existing is not null)
            throw new InvalidOperationException("A user with that email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = emailAddress,
            DisplayName = displayName,
            AssociationId = associationId,
            Status = UserStatus.Pending,
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);

        var rawToken = GenerateSecureToken();
        var authToken = new AuthToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            Type = AuthTokenType.MagicLink,
            Channel = AuthChannel.Email,
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(72),
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.AuthTokens.Add(authToken);
        await db.SaveChangesAsync(ct);

        var appUrl = config["App:BaseUrl"] ?? "https://frovollseter.no";
        var link = $"{appUrl}/auth/accept?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>Du er invitert til Frovollseter-portalen.</p>
            <p><a href="{link}">Klikk her for å aktivere din konto</a></p>
            <p>Lenken er gyldig i 72 timer.</p>
            """;

        await email.SendAsync(emailAddress, "Invitasjon til Frovollseter-portalen", html, ct);
        return user;
    }

    public async Task RequestMagicLinkAsync(string emailAddress, bool rememberMe, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == emailAddress && u.Status == UserStatus.Active, ct);
        if (user is null) return; // silent — don't reveal if email exists

        var rawToken = GenerateSecureToken();
        db.AuthTokens.Add(new AuthToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            Type = AuthTokenType.MagicLink,
            Channel = AuthChannel.Email,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15),
            CreatedAt = DateTimeOffset.UtcNow,
            RememberMe = rememberMe
        });
        await db.SaveChangesAsync(ct);

        var appUrl = config["App:BaseUrl"] ?? "https://frovollseter.no";
        var link = $"{appUrl}/auth/verify?token={Uri.EscapeDataString(rawToken)}";
        var rememberLine = rememberMe
            ? "<p>Du forblir innlogget i 30 dager etter at du har klikket lenken.</p>"
            : "";
        var html = $"""
            <p>Her er din innloggingslenke til Frovollseter-portalen:</p>
            <p><a href="{link}">Logg inn</a></p>
            <p>Lenken er gyldig i 15 minutter.</p>
            {rememberLine}
            """;

        await email.SendAsync(emailAddress, "Innloggingslenke til Frovollseter", html, ct);
    }

    public async Task<MagicLinkVerifyResult?> VerifyMagicLinkAsync(string rawToken, CancellationToken ct)
    {
        var hash = HashToken(rawToken);
        var token = await db.AuthTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.Type == AuthTokenType.MagicLink, ct);

        if (token is null || !token.IsValid) return null;

        token.UsedAt = DateTimeOffset.UtcNow;
        token.User.Status = UserStatus.Active;
        token.User.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var pair = tokenService.Issue(token.User, token.RememberMe);
        return new MagicLinkVerifyResult(pair, token.RememberMe);
    }

    public async Task RequestOtpAsync(string emailAddress, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == emailAddress && u.Status == UserStatus.Active, ct);
        if (user is null) return;

        var otp = GenerateOtp();
        db.AuthTokens.Add(new AuthToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(otp),
            Type = AuthTokenType.Otp,
            Channel = AuthChannel.Email,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);

        var html = $"""
            <p>Din engangskode for Frovollseter er:</p>
            <h2 style="letter-spacing:0.3em">{otp}</h2>
            <p>Koden er gyldig i 10 minutter.</p>
            """;

        await email.SendAsync(emailAddress, $"Engangskode: {otp}", html, ct);
    }

    public async Task<TokenPair?> VerifyOtpAsync(string emailAddress, string otp, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == emailAddress && u.Status == UserStatus.Active, ct);
        if (user is null) return null;

        var hash = HashToken(otp);
        var token = await db.AuthTokens
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.TokenHash == hash && t.Type == AuthTokenType.Otp, ct);

        if (token is null || !token.IsValid) return null;

        token.UsedAt = DateTimeOffset.UtcNow;
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return tokenService.Issue(user);
    }

    public async Task<MassInviteCreated> CreateMassInviteAsync(
        Guid associationId,
        Guid createdById,
        DateTimeOffset expiresAt,
        string? note,
        CancellationToken ct)
    {
        if (expiresAt <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Utløpsdato må være i fremtiden.");

        var rawToken = GenerateSecureToken();
        var invite = new MassInvite
        {
            Id = Guid.NewGuid(),
            TokenHash = HashToken(rawToken),
            AssociationId = associationId,
            CreatedById = createdById,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            ExpiresAt = expiresAt,
            CreatedAt = DateTimeOffset.UtcNow,
            RedemptionCount = 0
        };
        db.MassInvites.Add(invite);
        await db.SaveChangesAsync(ct);

        // Re-load with association so callers can show it in the response without an extra round-trip.
        await db.Entry(invite).Reference(i => i.Association).LoadAsync(ct);

        return new MassInviteCreated(invite, rawToken);
    }

    public async Task<MassInvite?> GetMassInviteByTokenAsync(string rawToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return null;
        var hash = HashToken(rawToken);
        return await db.MassInvites
            .Include(i => i.Association)
            .FirstOrDefaultAsync(i => i.TokenHash == hash, ct);
    }

    public async Task<MassInviteRedeemResult?> RedeemMassInviteAsync(
        string rawToken,
        string emailAddress,
        string displayName,
        CancellationToken ct)
    {
        var invite = await GetMassInviteByTokenAsync(rawToken, ct);
        if (invite is null || !invite.IsValid) return null;

        var normalisedEmail = emailAddress.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalisedEmail) || !normalisedEmail.Contains('@'))
            throw new InvalidOperationException("Ugyldig e-postadresse.");

        var trimmedName = displayName?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(trimmedName))
            throw new InvalidOperationException("Navn er påkrevd.");

        var emailTaken = await db.Users.AnyAsync(u => u.Email == normalisedEmail, ct);
        if (emailTaken)
            throw new InvalidOperationException("E-postadressen er allerede i bruk.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalisedEmail,
            DisplayName = trimmedName,
            AssociationId = invite.AssociationId,
            Status = UserStatus.Active,
            Role = UserRole.Member,
            CreatedAt = DateTimeOffset.UtcNow,
            LastLoginAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);

        invite.RedemptionCount += 1;
        await db.SaveChangesAsync(ct);

        // Reload association so the JWT/claims have correct context (Issue only reads ids, but be safe).
        await db.Entry(user).Reference(u => u.Association).LoadAsync(ct);

        var pair = tokenService.Issue(user);
        return new MassInviteRedeemResult(user, pair);
    }

    public async Task<List<MassInvite>> ListMassInvitesAsync(Guid? filterAssociationId, CancellationToken ct)
    {
        var query = db.MassInvites
            .Include(i => i.Association)
            .Include(i => i.CreatedBy)
            .AsQueryable();
        if (filterAssociationId is not null)
            query = query.Where(i => i.AssociationId == filterAssociationId.Value);
        return await query.OrderByDescending(i => i.CreatedAt).ToListAsync(ct);
    }

    public async Task<MassInvite?> GetMassInviteByIdAsync(Guid id, CancellationToken ct) =>
        await db.MassInvites.FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task<bool> DeleteMassInviteAsync(Guid id, CancellationToken ct)
    {
        var invite = await db.MassInvites.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invite is null) return false;
        db.MassInvites.Remove(invite);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
