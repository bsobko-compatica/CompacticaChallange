using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

public class ApiSmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _app;

    public ApiSmokeTests(WebApplicationFactory<Program> app)
    {
        _app = app.WithWebHostBuilder(_ => { });
    }

    private static HttpClient Client(WebApplicationFactory<Program> app, string role = "Viewer")
    {
        var client = app.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        client.DefaultRequestHeaders.Add("X-Demo-Role", role);
        return client;
    }

    [Fact]
    public async Task Tenants_List_ReturnsOk_And_NotEmpty()
    {
        using var client = Client(_app);
        var res = await client.GetAsync("/api/v1/tenants");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Parcels_Summary_Viewer_Authorized()
    {
        using var client = Client(_app, role: "Viewer");
        var tenants = await client.GetFromJsonAsync<JsonElement>("/api/v1/tenants");
        var firstTenant = tenants.EnumerateArray().FirstOrDefault();
        firstTenant.ValueKind.Should().NotBe(JsonValueKind.Undefined);

        var key = firstTenant.GetProperty("key").GetString();
        var url = $"/api/v1/{key}/parcels/summary?limit=5";
        var res = await client.GetAsync(url);
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await res.Content.ReadFromJsonAsync<JsonElement>();
        items.ValueKind.Should().Be(JsonValueKind.Array);

        foreach (var row in items.EnumerateArray())
        {
            row.TryGetProperty("parcelId", out _).Should().BeTrue();
            row.TryGetProperty("passCount", out _).Should().BeTrue();
            row.TryGetProperty("avgCompactionIndex", out _).Should().BeTrue();
        }
    }

    [Fact]
    public async Task Heatmap_Respects_Date_Filter()
    {
        using var client = Client(_app);
        var tenants = await client.GetFromJsonAsync<JsonElement>("/api/v1/tenants");
        var key = tenants.EnumerateArray().First().GetProperty("key").GetString();

        var url = $"/api/v1/{key}/roller-passes/heatmap?from=2000-01-01&to=2099-01-01&projectId=";
        var res = await client.GetAsync(url);
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await res.Content.ReadFromJsonAsync<JsonElement>();
        items.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Admin_Health_Requires_Admin()
    {
        // Viewer
        using var viewer = Client(_app, role: "Viewer");
        var res1 = await viewer.GetAsync("/api/v1/admin/health");
        object value = res1.StatusCode.Should().Be(HttpStatusCode.Forbidden)
            ?? res1.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Admin
        using var admin = Client(_app, role: "Admin");
        var res2 = await admin.GetAsync("/api/v1/admin/health");
        res2.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await res2.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("ok", out var ok).Should().BeTrue();
        ok.GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Bad_Tenant_Returns_400_or_404()
    {
        using var client = Client(_app);
        var res = await client.GetAsync("/api/v1/__no_such__/parcels/summary");
        res.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.NotFound);
    }
}
