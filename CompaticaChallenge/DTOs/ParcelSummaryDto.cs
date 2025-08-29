namespace CompaticaChallenge.DTOs;

public sealed class ParcelSummaryDto
{
    public int ParcelId { get; set; }
    public int PassCount { get; set; }
    public double? AvgCmv { get; set; }
    public double? AvgEvib { get; set; }
    public double? AvgCompactionIndex { get; set; }
    public DateTime? FirstPass { get; set; }
    public DateTime? LastPass { get; set; }
}
