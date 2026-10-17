/**
 * Deep Zoom descriptor URL of an image.
 *
 * Temporary: once the API serves `GET /api/v1/images/{imageId}`, the SPA will use the
 * `tileSourceUrl` it returns (contract/openapi/api.v1.yaml). The convention below is the one
 * that response documents.
 */
export function tileSourceUrl(imageId: number): string {
  if (!Number.isSafeInteger(imageId) || imageId < 1) {
    throw new RangeError(`imageId must be a positive integer, got ${imageId}`);
  }
  return `/tiles/v1/images/${imageId}.dzi`;
}
