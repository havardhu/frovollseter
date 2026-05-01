using Frovollseter.Domain.Enums;
using Frovollseter.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Frovollseter.Application.Cabins;

// Centralised authorization checks for cabin endpoints. Keeps role logic
// out of inline endpoint lambdas.
public class CabinAccess(FrovollseterDbContext db)
{
    public Task<CabinRole?> GetRoleAsync(Guid userId, Guid cabinId, CancellationToken ct = default) =>
        db.CabinMemberships
            .Where(m => m.CabinId == cabinId && m.UserId == userId)
            .Select(m => (CabinRole?)m.Role)
            .FirstOrDefaultAsync(ct);

    public async Task<bool> IsMemberAsync(Guid userId, Guid cabinId, CancellationToken ct = default) =>
        await GetRoleAsync(userId, cabinId, ct) is not null;

    public async Task<bool> IsOwnerAsync(Guid userId, Guid cabinId, CancellationToken ct = default) =>
        await GetRoleAsync(userId, cabinId, ct) is CabinRole.Owner;

    public Task<int> CountOwnersAsync(Guid cabinId, CancellationToken ct = default) =>
        db.CabinMemberships
            .Where(m => m.CabinId == cabinId && m.Role == CabinRole.Owner)
            .CountAsync(ct);
}
