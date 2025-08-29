using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using CompaticaChallenge.DTOs;
using Dapper;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.SpaServices.Extensions; // to run Angular CLI
using Microsoft.AspNetCore.SpaServices.AngularCli; // to run Angular CLI
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Swagger + compact JSON
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.Configure<JsonOptions>(o =>
{
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// Demo auth: Viewer/Admin via header X-Demo-Role
builder.Services.AddAuthentication("Demo")
    .AddScheme<AuthenticationSchemeOptions, DemoAuth>("Demo", _ => { });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Viewer", p => p.RequireRole("Viewer", "Admin"));
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
});

var app = builder.Build();
var env = app.Environment;

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

// ---------------- Tenants ----------------
var root = app.Environment.ContentRootPath;
var tenantDbs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    ["borden"] = Path.Combine(root, "data", "Project_Borden_TCH_Project_-_Gravel_Database_2025-08-22T08-11-49.sqlite"),
    ["macdougall"] = Path.Combine(root, "data", "Project_MacDougall_Steel_New_Build_Database_2025-08-22T08-13-58.sqlite"),
    ["scottsview"] = Path.Combine(root, "data", "Project_Scottsview_Meadows_Phase_2_Database_2025-08-22T08-16-59.sqlite"),
};

string? ResolveTenantKey(string input)
{
    if (string.IsNullOrWhiteSpace(input)) return null;
    if (tenantDbs.ContainsKey(input)) return input;

    var byKey = tenantDbs.Keys.FirstOrDefault(k => k.Contains(input, StringComparison.OrdinalIgnoreCase));
    if (!string.IsNullOrEmpty(byKey)) return byKey;

    var byFile = tenantDbs.FirstOrDefault(kv =>
        Path.GetFileNameWithoutExtension(kv.Value).Contains(input, StringComparison.OrdinalIgnoreCase));
    if (!string.IsNullOrEmpty(byFile.Key)) return byFile.Key;

    return null;
}
string GetDbPathOrThrow(string tenant)
{
    var key = ResolveTenantKey(tenant) ?? throw new InvalidOperationException(
        $"Unknown tenant '{tenant}'. Available: {string.Join(", ", tenantDbs.Keys)}");
    return tenantDbs[key];
}
SqliteConnection OpenReadOnly(string path)
{
    var cs = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly }.ToString();
    var c = new SqliteConnection(cs);
    c.Open();
    return c;
}

// ---------------- API v1 ----------------
var api = app.MapGroup("/api/v1");

// list tenants
api.MapGet("/tenants", async () =>
{
    var list = new List<TenantInfoDto>();
    foreach (var (key, path) in tenantDbs)
    {
        int? projectId = null; string? projectName = null;

        if (File.Exists(path))
        {
            try
            {
                await using var conn = OpenReadOnly(path);
                var row = await conn.QueryFirstOrDefaultAsync<(int Id, string Name)>(
                    "SELECT id as Id, name as Name FROM Project LIMIT 1;");
                if (!row.Equals(default((int, string)))) { projectId = row.Id; projectName = row.Name; }
            }
            catch { /* demo DB quirks are OK */ }
        }

        list.Add(new TenantInfoDto
        {
            Key = key,
            ProjectId = projectId,
            ProjectName = projectName,
            FileSizeBytes = File.Exists(path) ? new FileInfo(path).Length : (long?)null
        });
    }
    return Results.Ok(list.OrderBy(x => x.Key));
});

// heatmap points — no aggressive normalization (always render something)
api.MapGet("/{tenant}/roller-passes/heatmap",
    async (string tenant, string? from, string? to, int? projectId) =>
    {
        string db; try { db = GetDbPathOrThrow(tenant); } catch (Exception ex) { return Results.BadRequest(ex.Message); }
        if (!File.Exists(db)) return Results.NotFound($"Database for '{tenant}' not found.");

        await using var conn = OpenReadOnly(db);
        DateTime? fromDt = DateTime.TryParse(from, out var f) ? f : null;
        DateTime? toDt = DateTime.TryParse(to, out var t) ? t : null;

        var sql = @"
SELECT startLatitude   as Latitude,
       startLongitude  as Longitude,
       cmv            as Cmv,
       evib           as Evib,
       compactionIndex as CompactionIndex,
       startTime      as StartTime
FROM ProjectRollerPass
WHERE 1=1
" + (projectId.HasValue ? " AND projectId = @projectId" : "") +
          (fromDt.HasValue ? " AND startTime >= @from" : "") +
          (toDt.HasValue ? " AND startTime <= @to" : "") + @"
ORDER BY startTime
LIMIT 10000;";

        var rows = await conn.QueryAsync<HeatPointDto>(sql, new { projectId, from = fromDt, to = toDt });
        return Results.Ok(rows);
    }).RequireAuthorization("Viewer");

// parcel summary + simple KPI for table
api.MapGet("/{tenant}/parcels/summary",
    async (string tenant, string? from, string? to, int? projectId, int? limit) =>
    {
        string db; try { db = GetDbPathOrThrow(tenant); } catch (Exception ex) { return Results.BadRequest(ex.Message); }
        if (!File.Exists(db)) return Results.NotFound($"Database for '{tenant}' not found.");

        await using var conn = OpenReadOnly(db);
        DateTime? fromDt = DateTime.TryParse(from, out var f) ? f : null;
        DateTime? toDt = DateTime.TryParse(to, out var t) ? t : null;
        var top = (limit is > 0 and <= 5000) ? limit!.Value : 500;

        var sql = @"
SELECT projectLotParcelId AS ParcelId,
       COUNT(*)           AS PassCount,
       AVG(cmv)           AS AvgCmv,
       AVG(evib)          AS AvgEvib,
       AVG(compactionIndex) AS AvgCompactionIndex,
       MIN(startTime)     AS FirstPass,
       MAX(startTime)     AS LastPass
FROM ProjectLotParcelLiftPass
WHERE 1=1
" + (projectId.HasValue ? " AND projectId = @projectId" : "") +
          (fromDt.HasValue ? " AND startTime >= @from" : "") +
          (toDt.HasValue ? " AND startTime <= @to" : "") + @"
GROUP BY projectLotParcelId
ORDER BY LastPass DESC
LIMIT @top;";

        var rows = await conn.QueryAsync<ParcelSummaryDto>(sql, new { projectId, from = fromDt, to = toDt, top });
        return Results.Ok(rows);
    }).RequireAuthorization("Viewer");

// admin-only ping
api.MapGet("/admin/health", () => Results.Ok(new { ok = true, time = DateTime.UtcNow }))
   .RequireAuthorization("AdminOnly");

// ---------------- SPA hosting -----------------
if (env.IsDevelopment())
{
    // All non-/api go to Angular CLI (npm start). VS F5 autostarts it.
    app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spaApp =>
    {
        spaApp.UseSpa(spa =>
        {
            spa.Options.SourcePath = "ClientApp";
            spa.UseAngularCliServer(npmScript: "start");
        });
    });
}
else
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Run();

// --------- Demo auth handler: X-Demo-Role: Admin/Viewer ----------
public sealed class DemoAuth : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public DemoAuth(IOptionsMonitor<AuthenticationSchemeOptions> opts, ILoggerFactory log, UrlEncoder enc, ISystemClock clk)
        : base(opts, log, enc, clk) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var role = Request.Headers.TryGetValue("X-Demo-Role", out var v) ? v.ToString() : "Viewer";
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "demo"),
            new Claim(ClaimTypes.Role, role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "Viewer")
        };
        var id = new ClaimsIdentity(claims, "Demo");
        var principal = new ClaimsPrincipal(id);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Demo")));
    }
}

public partial class Program { }

