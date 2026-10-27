namespace Pps.Domain.Import;

using System.Globalization;
using System.Text.Json;

public record CricParsedRecord(
    string ImageRef,
    string CellId,
    double NucleusX,
    double NucleusY,
    string ClassName
);

public static class CricAnnotationsParser
{
    public static List<CricParsedRecord> Parse(string content, string fileName)
    {
        if (fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            return ParseJson(content);
        }

        return ParseCsv(content);
    }

    private static List<CricParsedRecord> ParseJson(string json)
    {
        var records = new List<CricParsedRecord>();
        using var doc = JsonDocument.Parse(json);

        if (doc.RootElement.ValueKind != JsonValueKind.Array)
        {
            throw new FormatException("El archivo JSON de CRIC debe contener un array de objetos.");
        }

        int index = 0;
        foreach (var elem in doc.RootElement.EnumerateArray())
        {
            index++;
            string imageRef = GetStringProperty(elem, "image", "image_filename", "image_id", "filename")
                ?? throw new FormatException($"Falta la propiedad de imagen en el registro #{index}.");

            string cellId = GetStringProperty(elem, "cellId", "cell_id", "id") ?? index.ToString();

            double x = 0, y = 0;
            if (elem.TryGetProperty("nucleus", out var nuc) && nuc.ValueKind == JsonValueKind.Array && nuc.GetArrayLength() >= 2)
            {
                x = nuc[0].GetDouble();
                y = nuc[1].GetDouble();
            }
            else
            {
                x = GetDoubleProperty(elem, "nucleus_x", "x", "nucleusX");
                y = GetDoubleProperty(elem, "nucleus_y", "y", "nucleusY");
            }

            string className = GetStringProperty(elem, "class", "classification", "bethesda", "bethesda_system") ?? "NILM";

            records.Add(new CricParsedRecord(imageRef, cellId, x, y, className.Trim()));
        }

        return records;
    }

    private static List<CricParsedRecord> ParseCsv(string csv)
    {
        var records = new List<CricParsedRecord>();
        using var reader = new StringReader(csv);

        string? headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            return records;
        }

        char separator = headerLine.Contains(';') ? ';' : ',';
        var headers = headerLine.Split(separator)
            .Select(h => h.Trim().Trim('"').ToLowerInvariant())
            .ToList();

        int imgCol = FindHeaderIndex(headers, "image_filename", "image_id", "image_name", "image", "filename");
        int cellCol = FindHeaderIndex(headers, "cell_id", "id", "cell");
        int xCol = FindHeaderIndex(headers, "nucleus_x", "x");
        int yCol = FindHeaderIndex(headers, "nucleus_y", "y");
        int classCol = FindHeaderIndex(headers, "bethesda_system", "classification", "class", "bethesda");

        if (imgCol < 0 || xCol < 0 || yCol < 0)
        {
            throw new FormatException("El archivo CSV no contiene las columnas mínimas requeridas (image, x, y).");
        }

        string? line;
        int lineNum = 1;
        while ((line = reader.ReadLine()) != null)
        {
            lineNum++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var cols = line.Split(separator).Select(c => c.Trim().Trim('"')).ToArray();
            if (cols.Length <= Math.Max(imgCol, Math.Max(xCol, yCol)))
            {
                continue;
            }

            string imageRef = cols[imgCol];
            string cellId = cellCol >= 0 && cellCol < cols.Length ? cols[cellCol] : lineNum.ToString();

            if (!double.TryParse(cols[xCol], NumberStyles.Float, CultureInfo.InvariantCulture, out double x) ||
                !double.TryParse(cols[yCol], NumberStyles.Float, CultureInfo.InvariantCulture, out double y))
            {
                continue;
            }

            string className = (classCol >= 0 && classCol < cols.Length && !string.IsNullOrWhiteSpace(cols[classCol]))
                ? cols[classCol]
                : "NILM";

            records.Add(new CricParsedRecord(imageRef, cellId, x, y, className));
        }

        return records;
    }

    private static int FindHeaderIndex(List<string> headers, params string[] candidates)
    {
        for (int i = 0; i < headers.Count; i++)
        {
            if (candidates.Contains(headers[i])) return i;
        }
        return -1;
    }

    private static string? GetStringProperty(JsonElement elem, params string[] names)
    {
        foreach (var name in names)
        {
            if (elem.TryGetProperty(name, out var prop))
            {
                return prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
            }
        }
        return null;
    }

    private static double GetDoubleProperty(JsonElement elem, params string[] names)
    {
        foreach (var name in names)
        {
            if (elem.TryGetProperty(name, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number) return prop.GetDouble();
                if (double.TryParse(prop.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out double val)) return val;
            }
        }
        return 0.0;
    }
}
