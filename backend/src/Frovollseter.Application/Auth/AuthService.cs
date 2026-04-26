using System.Security.Cryptography;
using System.Text;
using Frovollseter.Domain.Entities;
using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Email;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Frovollseter.Application.Auth;

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

    public async Task RequestMagicLinkAsync(string emailAddress, CancellationToken ct)
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
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);

        var appUrl = config["App:BaseUrl"] ?? "https://frovollseter.no";
        var link = $"{appUrl}/auth/verify?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>Her er din innloggingslenke til Frovollseter-portalen:</p>
            <p><a href="{link}">Logg inn</a></p>
            <p>Lenken er gyldig i 15 minutter.</p>
            """;

        await email.SendAsync(emailAddress, "Innloggingslenke til Frovollseter", html, ct);
    }

    public async Task<TokenPair?> VerifyMagicLinkAsync(string rawToken, CancellationToken ct)
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

        return tokenService.Issue(token.User);
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
}
