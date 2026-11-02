import type { Measured } from '../model/status';

/**
 * Numbers that come from running or counting something: each one is a record of a measurement,
 * not a fact derived from the code, so each carries its date, the commit it was taken on and the
 * method. Owner: U5. Source: `odd/gia-mapas/map-progress.md` section 4, re-counted on 02/11/2026
 * over an export of commit 2584cfc.
 *
 * Rules kept by `stops/07-calidad/measured.test.ts`:
 * - no figure per person and no hours (individual evaluation data stays out of the bundle);
 * - an entry measured on the snapshot date carries the SNAPSHOT commit, so bumping `SNAPSHOT`
 *   without re-measuring fails a test instead of silently re-dating old numbers.
 *
 * To refresh: export the new commit, repeat each `method`, and update value, `asOf` and `commit`.
 */

const SNAPSHOT_DATE = '2026-11-02';
const SNAPSHOT_COMMIT = '2584cfc';

const LINES = {
  apiSource: 8349,
  apiTests: 4801,
  webSource: 3540,
  webStyles: 1140,
  webTests: 1700,
  tilesApp: 597,
  tilesTests: 387,
  scripts: 1346,
} as const;

/** A measurement whose value is a number, so sums and comparisons type-check. */
type NumericMeasured = Measured & { readonly value: number };

/** Entry measured on the snapshot date and commit. */
function atSnapshot(value: number, method: string, caveat?: string): NumericMeasured {
  return {
    value,
    asOf: SNAPSHOT_DATE,
    commit: SNAPSHOT_COMMIT,
    method,
    ...(caveat === undefined ? {} : { caveat }),
  };
}

const GIT_FILES = 'Archivos versionados contados con git sobre 2584cfc';

export const MEASURED = {
  // Repository ---------------------------------------------------------------------------------
  commits: atSnapshot(41, 'git rev-list --count sobre 2584cfc'),
  trackedFiles: atSnapshot(289, 'git ls-tree -r sobre 2584cfc: todos los archivos versionados'),

  // Code size: tracked files only, so build output and dependencies are left out ---------------
  apiSourceFiles: atSnapshot(
    103,
    `${GIT_FILES}: archivos .cs de api/src`,
    'Sin los .Designer.cs generados por las migraciones.',
  ),
  apiSourceLines: atSnapshot(
    LINES.apiSource,
    `${GIT_FILES}: líneas de los .cs de api/src`,
    'Sin los .Designer.cs generados por las migraciones.',
  ),
  apiTestFiles: atSnapshot(17, `${GIT_FILES}: archivos .cs de api/tests`),
  apiTestLines: atSnapshot(LINES.apiTests, `${GIT_FILES}: líneas de los .cs de api/tests`),
  webSourceFiles: atSnapshot(
    36,
    `${GIT_FILES}: archivos .ts y .tsx de web/src`,
    'Sin las pruebas.',
  ),
  webSourceLines: atSnapshot(
    LINES.webSource,
    `${GIT_FILES}: líneas de los .ts y .tsx de web/src`,
    'Sin las pruebas.',
  ),
  webStyleFiles: atSnapshot(4, `${GIT_FILES}: archivos .css de web/src`),
  webStyleLines: atSnapshot(LINES.webStyles, `${GIT_FILES}: líneas de los .css de web/src`),
  webTestFiles: atSnapshot(17, `${GIT_FILES}: archivos de prueba .test.ts de web/src`),
  webTestLines: atSnapshot(LINES.webTests, `${GIT_FILES}: líneas de los .test.ts de web/src`),
  tilesAppFiles: atSnapshot(8, `${GIT_FILES}: archivos .py de tiles/app`),
  tilesAppLines: atSnapshot(LINES.tilesApp, `${GIT_FILES}: líneas de los .py de tiles/app`),
  tilesTestFiles: atSnapshot(5, `${GIT_FILES}: archivos .py de tiles/tests`),
  tilesTestLines: atSnapshot(LINES.tilesTests, `${GIT_FILES}: líneas de los .py de tiles/tests`),
  scriptFiles: atSnapshot(6, `${GIT_FILES}: archivos .py de scripts`),
  scriptLines: atSnapshot(LINES.scripts, `${GIT_FILES}: líneas de los .py de scripts`),
  docFiles: atSnapshot(33, `${GIT_FILES}: archivos .md de docs`),
  docLines: atSnapshot(2463, `${GIT_FILES}: líneas de los .md de docs`),
  totalLines: atSnapshot(
    Object.values(LINES).reduce((sum, lines) => sum + lines, 0),
    'Suma de las líneas de código, estilos y pruebas de api, web, tiles y scripts',
    'No incluye documentación ni contrato.',
  ),

  // Automated tests: declarations are counted, executions are recorded --------------------------
  apiTestMethods: atSnapshot(
    152,
    'Conteo de [Fact] (121) y [Theory] (31) en api/tests con git grep sobre 2584cfc',
    'Son declaraciones, no casos: un [Theory] corre una vez por fila de datos.',
  ),
  apiTestCases: atSnapshot(
    292,
    'Ejecución del binario de pruebas compilado el 01/11/2026 en contenedor; los nombres de las pruebas son idénticos a los de 2584cfc',
    'Las pruebas de la API corren sobre SQLite y no atraviesan la capa HTTP.',
  ),
  webTestCases: atSnapshot(
    284,
    'npm test (Vitest) sobre una copia exportada de 2584cfc: 284 de 284 casos en 17 archivos',
    'Solo lógica pura: no hay pruebas de componentes ni de navegador.',
  ),
  tilesTestFunctions: atSnapshot(
    24,
    'Conteo de funciones test_ en tiles/tests con git grep sobre 2584cfc (sin parametrize: una función, un caso); resultado 24 de 24 según la corrida del equipo',
    'Solo imágenes PNG y JPG sintéticas.',
  ),

  // Performance: measured earlier, before tile access depended on project membership -------------
  tileColdOpenMs: {
    value: 11.62,
    asOf: '2026-10-28',
    commit: '9dac6d7',
    method:
      'scripts/bench-tiles.py: primer pedido del descriptor de una WSI de 132 MB a través de la pasarela con la consulta de acceso; registro de la bitácora de la PPS 2 (Día 8)',
    caveat:
      'Medido antes de que el acceso a las teselas dependiera de la membresía al proyecto (ADR-16); falta volver a medir. El commit es el que agrega el benchmark y su registro.',
  },
  tileP95Ms: {
    value: 110.9,
    asOf: '2026-10-28',
    commit: '9dac6d7',
    method:
      'scripts/bench-tiles.py: 500 teselas al azar con 8 pedidos concurrentes a través de la pasarela con la consulta de acceso; registro de la bitácora de la PPS 2 (Día 8)',
    caveat:
      'Medido antes de que el acceso a las teselas dependiera de la membresía al proyecto (ADR-16); falta volver a medir. El commit es el que agrega el benchmark y su registro.',
  },
} satisfies Record<string, Measured>;
