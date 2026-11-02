/**
 * Pinned numbers of the system. Prose, stats and diagram labels read these and never repeat a
 * literal; each one is checked against the repository by the test of the unit that owns it
 * (see `README.md` in this folder), so a change in the system fails a test instead of drifting.
 */
export const FACTS = {
  /** Operations of `contract/openapi/api.v1.yaml` and rows of the authorization matrix. */
  operations: 40,
  /** Operations of `contract/openapi/tiles.v1.yaml`. */
  tileOperations: 5,
  /** Tables of the persistence model. */
  tables: 8,
  migrations: 4,
  controllers: 13,
  /** Built product screens: login, catalog, viewer, users, members (the guide is not counted). */
  screens: 5,
  adrs: 17,
  requirements: 79,
  /** Operations the SPA calls today. */
  inSpa: 18,
} as const;
