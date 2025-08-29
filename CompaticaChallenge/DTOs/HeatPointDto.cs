namespace CompaticaChallenge.DTOs;

public sealed class HeatPointDto
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? Cmv { get; set; }
    public double? Evib { get; set; }
    public double? CompactionIndex { get; set; }
    public DateTime? StartTime { get; set; }
}
