using System.Text;
using Frovollseter.Api.Endpoints;
using Frovollseter.Application.Auth;
using Frovollseter.Infrastructure.Email;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Database — prefer DATABASE_URL (set by Fly.io postgres attach), fall back to config
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("No database connection string found.");

builder.Services.AddDbContext<FrovollseterDbContext>(opts => opts.UseNpgsql(connectionString));

// Auth services
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuthService>();

// Email
builder.Services.AddHttpClient<ResendEmailService>(http =>
{
    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {builder.Configuration["Resend:ApiKey"]}");
});
builder.Services.AddScoped<IEmailService, ResendEmailService>();

// JWT bearer auth
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
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

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Endpoint groups
app.MapAuthEndpoints();
app.MapRoadReportEndpoints();
app.MapNewsEndpoints();
app.MapLinksEndpoints();
app.MapWebcamEndpoints();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTimeOffset.UtcNow }))
    .AllowAnonymous();

app.Run();
