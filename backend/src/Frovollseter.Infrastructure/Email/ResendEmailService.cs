using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Frovollseter.Infrastructure.Email;

public class ResendEmailService(HttpClient http, IConfiguration config, ILogger<ResendEmailService> logger) : IEmailService
{
    private readonly string _fromAddress = config["Resend:FromAddress"] ?? "noreply@frovollseter.no";

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var payload = new
        {
            from = _fromAddress,
            to = new[] { to },
            subject,
            html = htmlBody
        };

        var response = await http.PostAsJsonAsync("https://api.resend.com/emails", payload, ct);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Resend API error {Status}: {Error}", response.StatusCode, error);
            throw new InvalidOperationException($"Failed to send email: {response.StatusCode}");
        }
    }
}
