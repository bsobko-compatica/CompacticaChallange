using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Playwright;
using Xunit;
using Assert = Xunit.Assert;

public class ApiSmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiSmokeTests(WebApplicationFactory<Program> factory)
    {
        // фабрика сама підніме ваш API в пам'яті
        _client = factory.CreateClient();
        // демо-автентифікація з Program.cs — роль Viewer за замовчуванням
        _client.DefaultRequestHeaders.Add("X-Demo-Role", "Viewer");
    }

    [Fact]
    public async Task Tenants_ReturnsOk_AndNonEmpty()
    {
        var resp = await _client.GetAsync("/api/v1/tenants");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        Assert.False(string.IsNullOrWhiteSpace(json));

        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.ValueKind == JsonValueKind.Array);
        Assert.True(doc.RootElement.GetArrayLength() > 0);
    }

    [Fact]
    public async Task Parcels_Summary_ReturnsOk_ForKnownTenant()
    {
        var resp = await _client.GetAsync("/api/v1/scottsview/parcels/summary?limit=5");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Admin_Health_RequiresAdmin()
    {
        // without admin role – 403
        var notAdmin = await _client.GetAsync("/api/v1/admin/health");
        Assert.Equal(HttpStatusCode.Forbidden, notAdmin.StatusCode);

        // with admin role – 200
        using var admin = new HttpClient(new HttpClientHandler(), disposeHandler: true)
        {
            BaseAddress = _client.BaseAddress
        };
        admin.DefaultRequestHeaders.Add("X-Demo-Role", "Admin");
        var ok = await admin.GetAsync("/api/v1/admin/health");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }
}
