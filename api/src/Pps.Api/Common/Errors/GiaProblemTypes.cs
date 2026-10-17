namespace Pps.Api.Common.Errors;

public static class GiaProblemTypes
{
    public const string Prefix = "urn:gia:problem:";

    // 400
    public const string Validation = "urn:gia:problem:validation";

    // 401 & 403
    public const string Unauthenticated = "urn:gia:problem:unauthenticated";
    public const string Forbidden = "urn:gia:problem:forbidden";

    // 404
    public const string NotFound = "urn:gia:problem:not-found";

    // 409
    public const string DuplicateName = "urn:gia:problem:duplicate-name";
    public const string ClassInUse = "urn:gia:problem:class-in-use";
    public const string NotEmpty = "urn:gia:problem:not-empty";
    public const string AlreadyRegistered = "urn:gia:problem:already-registered";
    public const string AlreadyImported = "urn:gia:problem:already-imported";

    // 412 & 428
    public const string VersionMismatch = "urn:gia:problem:version-mismatch";
    public const string PreconditionRequired = "urn:gia:problem:precondition-required";

    // 415
    public const string UnsupportedMediaType = "urn:gia:problem:unsupported-media-type";

    // 422
    public const string GeometryOutOfBounds = "urn:gia:problem:geometry-out-of-bounds";
    public const string GeometryDegenerate = "urn:gia:problem:geometry-degenerate";
    public const string GeometrySelfIntersection = "urn:gia:problem:geometry-self-intersection";
    public const string ClassNotInDataset = "urn:gia:problem:class-not-in-dataset";
    public const string InvalidStorageKey = "urn:gia:problem:invalid-storage-key";
    public const string UnsupportedImageFormat = "urn:gia:problem:unsupported-image-format";
    public const string ImportTooLarge = "urn:gia:problem:import-too-large";

    // 429
    public const string TooManyRequests = "urn:gia:problem:too-many-requests";

    // 503
    public const string DependencyUnavailable = "urn:gia:problem:dependency-unavailable";

    // 500
    public const string InternalServerError = "urn:gia:problem:internal";

    public static string ForStatus(int statusCode) => statusCode switch
    {
        400 => Validation,
        401 => Unauthenticated,
        403 => Forbidden,
        404 => NotFound,
        409 => "urn:gia:problem:conflict",
        412 => VersionMismatch,
        415 => UnsupportedMediaType,
        428 => PreconditionRequired,
        422 => "urn:gia:problem:unprocessable-entity",
        429 => TooManyRequests,
        503 => DependencyUnavailable,
        _ => InternalServerError
    };
}
