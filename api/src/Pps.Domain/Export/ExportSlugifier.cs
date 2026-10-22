namespace Pps.Domain.Export;

using System.Globalization;
using System.Text;

public static class ExportSlugifier
{
    public static string Slugify(string name, long fallbackId)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"dataset-{fallbackId}";
        }

        var normalized = name.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var c in normalized)
        {
            var uc = CharUnicodeInfo.GetUnicodeCategory(c);
            if (uc != UnicodeCategory.NonSpacingMark)
            {
                if (char.IsLetterOrDigit(c))
                {
                    sb.Append(char.ToLowerInvariant(c));
                }
                else if (sb.Length > 0 && sb[^1] != '-')
                {
                    sb.Append('-');
                }
            }
        }

        var result = sb.ToString().Trim('-');
        return string.IsNullOrEmpty(result) ? $"dataset-{fallbackId}" : result;
    }
}
