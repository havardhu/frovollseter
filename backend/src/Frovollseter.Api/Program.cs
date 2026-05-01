using System.Text;
using System.Text.Json.Serialization;
using Frovollseter.Api.Endpoints;
using Frovollseter.Application.Auth;
using Frovollseter.Infrastructure.Email;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Database — prefer DATABASE_URL (set by Fly.io postgres attach), fall back to config
var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("No database connection string found.");

var connectionString = ConvertDatabaseUrl(rawConnectionString);
builder.Services.AddDbContext<FrovollseterDbContext>(opts =>
    opts.UseNpgsql(connectionString, npgsql =>
        npgsql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null)));

// Auth services
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuthService>();

// Email — register as IEmailService so the typed HttpClient is used correctly
builder.Services.AddHttpClient<IEmailService, ResendEmailService>(http =>
{
    var apiKey = builder.Configuration["Resend:ApiKey"]
        ?? throw new InvalidOperationException("Resend:ApiKey is required");
    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
});

// JWT bearer auth
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.MapInboundClaims = false;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "frovollseter-api",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "frovollseter-app",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS — allow frontend origin
builder.Services.AddCors(opts => opts.AddDefaultPolicy(p =>
    p.WithOrigins(
            builder.Configuration["App:FrontendUrl"] ?? "http://localhost:5173",
            "https://frovollseter.no",
            "https://www.frovollseter.no")
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()));

// JSON — serialize enums as strings
builder.Services.ConfigureHttpJsonOptions(opts =>
    opts.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// Auto-migrate on startup (safe for MVP — idempotent, runs in seconds)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FrovollseterDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Endpoint groups
app.MapSetupEndpoints();
app.MapAuthEndpoints();
app.MapRoadReportEndpoints();
app.MapNewsEndpoints();
app.MapAssociationEndpoints();
app.MapLinksEndpoints();
app.MapWebcamEndpoints();
app.MapAdminEndpoints();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTimeOffset.UtcNow }))
    .AllowAnonymous();

app.Run();

// Converts postgres://user:pass@host:port/db?sslmode=x to Npgsql key=value format
static string ConvertDatabaseUrl(string url)
{
    if (!url.StartsWith("postgres://") && !url.StartsWith("postgresql://"))
        return url;

    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':', 2);
    var sb = new System.Text.StringBuilder();
    sb.Append($"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};");
    sb.Append($"Username={userInfo[0]};Password={userInfo[1]};");

    var query = uri.Query.TrimStart('?');
    foreach (var part in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var kv = part.Split('=', 2);
        if (kv.Length == 2 && kv[0] == "sslmode")
            sb.Append($"SSL Mode={kv[1]};");
    }

    return sb.ToString();
}
