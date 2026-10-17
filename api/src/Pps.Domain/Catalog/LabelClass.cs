namespace Pps.Domain.Catalog;

using Pps.Domain.Common;

public class LabelClass : BaseEntity
{
    public long DatasetId { get; set; }
    public Dataset Dataset { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#FF0000"; // Formato #RRGGBB según contrato
    public int DisplayOrder { get; set; }
}
