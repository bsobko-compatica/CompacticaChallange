namespace CompaticaChallenge.DTOs;

public sealed class TenantInfoDto
{
    public string Key { get; set; } = default!;
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public long? FileSizeBytes { get; set; }
}
