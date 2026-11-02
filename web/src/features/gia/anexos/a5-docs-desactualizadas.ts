import { evidenceOf } from '../stops/09-avance/evidence';
import { C8 } from '../stops/08-decisiones/copy';
import { SNAPSHOT } from '../model/status';
import type { Section, StopContent, TableDef } from '../model/types';

/** A fragment of a document that the repository still has; the code says something else now. */
export interface DocQuote {
  file: string;
  /** Exact text of the document, checked by a test so the row notices when someone fixes it. */
  text: string;
}

export interface DocRow {
  /** The files, as the column shows them. */
  files: string;
  claims: string;
  reality: string;
  /** Fragments that must still be in the documents for the row to be true. */
  quotes: readonly DocQuote[];
  /** Repo files that show what the code says today. */
  evidence: readonly string[];
}

/**
 * Documents of the repository that no longer match the code, found by comparing them with it at
 * the snapshot. The architecture documents wait for the supervision (ADR-15 lists them); the
 * READMEs of the modules simply describe an earlier state.
 */
export const DOC_ROWS: readonly DocRow[] = [
  {
    files: 'README.md (líneas 15, 18 y 45)',
    claims:
      'El contrato está en v0.1.0, la web es un visor «sin ingreso ni anotaciones todavía» y «la API todavía no tiene ingreso»',
    reality:
      'El contrato es la versión 0.2.0; hay ingreso, catálogo, usuarios, miembros y subida; la web sigue sin anotaciones',
    quotes: [
      { file: 'README.md', text: 'Vigente (v0.1.0)' },
      { file: 'README.md', text: 'sin ingreso ni anotaciones todavía' },
      { file: 'README.md', text: 'la API todavía no tiene ingreso' },
    ],
    evidence: ['contract/openapi/api.v1.yaml', 'web/src/features/auth/LoginPage.tsx'],
  },
  {
    files: 'web/README.md (líneas 3 y 45)',
    claims: 'Todavía no hay catálogo ni anotaciones, y las rutas mínimas son / y /images/{id}',
    reality:
      'Hay catálogo, usuarios, miembros y subida, y el router resuelve también las rutas de miembros de un proyecto y de usuarios',
    quotes: [
      { file: 'web/README.md', text: 'Todavía no hay catálogo ni anotaciones' },
      { file: 'web/README.md', text: 'Puerta de sesión y rutas mínimas: `/` y `/images/{id}`' },
    ],
    evidence: ['web/src/shared/router.ts', 'web/src/features/catalog/CatalogPage.tsx'],
  },
  {
    files: 'tiles/README.md (línea 66)',
    claims: 'Solo PNG y JPEG están probados con archivos reales; falta probar un SVS real',
    reality:
      'Se sirvieron y midieron archivos SVS reales a través de la pasarela (bitácora de la PPS 2, Día 8)',
    quotes: [
      { file: 'tiles/README.md', text: 'Solo PNG y JPEG están probados con archivos reales' },
    ],
    evidence: ['docs/BITACORA_PPS2.md:347', 'scripts/bench-tiles.py'],
  },
  {
    files: 'deploy/README.md (línea 20)',
    claims: 'La API completa llegará «cuando tenga ingreso y registro de imágenes»',
    reality: 'El ingreso y el registro de imágenes ya existen',
    quotes: [{ file: 'deploy/README.md', text: 'cuando tenga ingreso y registro de imágenes' }],
    evidence: [
      'api/src/Pps.Api/Controllers/Auth/AuthController.cs',
      'api/src/Pps.Api/Controllers/Images/ImagesController.cs',
    ],
  },
  {
    files: 'docs/arquitectura/README.md (línea 68)',
    claims: 'El contrato de integración está en la versión 0.1.0',
    reality: 'El contrato está en la versión 0.2.0',
    quotes: [{ file: 'docs/arquitectura/README.md', text: 'versión 0.1.0' }],
    evidence: ['contract/openapi/api.v1.yaml', 'contract/README.md:22'],
  },
  {
    files: 'docs/arquitectura: 01 (restricciones), 04 (§8.2 y §8.4), 05 (§11.2) y 07 (S12)',
    claims:
      'Los roles son admin y annotator, todo usuario autenticado ve todas las imágenes y las altas de usuarios van sin pantalla',
    reality: `Dos niveles de rol (admin o user, y viewer, annotator o project-admin en cada proyecto), tabla de membresías y pantallas de usuarios y de miembros. Documento ${C8}`,
    quotes: [
      {
        file: 'docs/arquitectura/04-despliegue-y-conceptos.md',
        text: 'Roles `admin` y `annotator`',
      },
      {
        file: 'docs/arquitectura/04-despliegue-y-conceptos.md',
        text: 'todo usuario autenticado ve todas las imágenes',
      },
      {
        file: 'docs/arquitectura/05-calidad-y-riesgos.md',
        text: 'Roles mínimos (`admin`, `annotator`)',
      },
      {
        file: 'docs/arquitectura/07-pendientes.md',
        text: '¿Alcanza con altas de usuarios por un administrador, sin pantalla?',
      },
      { file: 'docs/arquitectura/01-introduccion-y-restricciones.md', text: 'ni roles complejos' },
    ],
    evidence: [
      'api/src/Pps.Domain/Access/AccessPolicy.cs',
      'web/src/features/users/UsersPage.tsx',
      'docs/adr/0015-roles-por-proyecto-y-membresia.md:108-115',
    ],
  },
  {
    files: 'docs/arquitectura/03 (líneas 37 y 42) y 02 (línea 31)',
    claims:
      'La pasarela es el único puerto publicado, el volumen de imágenes se monta solo lectura en la API y las imágenes nunca se suben desde el navegador',
    reality:
      'En desarrollo también se publican la base de datos y la API, y la API monta el volumen con escritura porque guarda las subidas del navegador (ADR-17)',
    quotes: [
      {
        file: 'docs/arquitectura/03-bloques-y-ejecucion.md',
        text: 'Montado solo lectura en `api` y `tiles`',
      },
      {
        file: 'docs/arquitectura/03-bloques-y-ejecucion.md',
        text: 'El **único** puerto publicado',
      },
      {
        file: 'docs/arquitectura/02-contexto-y-estrategia.md',
        text: 'nunca subidas desde el navegador',
      },
    ],
    evidence: ['compose.yaml', 'web/src/features/upload/UploadImagesModal.tsx'],
  },
  {
    files: 'docs/BITACORA_PPS2.md (Día 7, líneas 302 y 308)',
    claims: 'Subir imágenes a un dataset lo puede hacer cualquier usuario autenticado',
    reality:
      'Subir exige el permiso image.upload (administración del proyecto o global) y registrar por clave del volumen es solo de la administración global',
    quotes: [{ file: 'docs/BITACORA_PPS2.md', text: 'por cualquier usuario autenticado' }],
    evidence: [
      'api/src/Pps.Domain/Access/Permission.cs',
      'api/src/Pps.Api/Controllers/Images/ImagesController.cs',
    ],
  },
  {
    files: 'docs/arquitectura: 04 (línea 221) y 06 (línea 60)',
    claims: 'Las pruebas de la API corren contra PostgreSQL real con Testcontainers',
    reality:
      'Las pruebas de la API corren sobre SQLite y sin capa HTTP: no hay Testcontainers ni WebApplicationFactory',
    quotes: [
      {
        file: 'docs/arquitectura/04-despliegue-y-conceptos.md',
        text: 'API contra PostgreSQL real (Testcontainers)',
      },
      {
        file: 'docs/arquitectura/06-organizacion-y-roadmap.md',
        text: 'pruebas con Testcontainers',
      },
    ],
    evidence: ['api/tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj'],
  },
];

export function docsDesactualizadasTable(rows: readonly DocRow[] = DOC_ROWS): TableDef {
  return {
    id: 'docs-desactualizadas',
    title: 'Documentos que ya no coinciden con el código',
    caption: `Comparados con el código al ${SNAPSHOT.label} (commit ${SNAPSHOT.commit}). Cuando hay diferencia, vale el código y el ADR.`,
    columns: [
      { key: 'files', label: 'Archivo' },
      { key: 'claims', label: 'Afirma' },
      { key: 'reality', label: 'El código dice' },
    ],
    rows: rows.map((row) => ({
      files: row.files,
      claims: row.claims,
      reality: row.reality,
    })),
    sources: evidenceOf(
      rows.flatMap((row) => [...row.evidence, ...row.quotes.map((quote) => quote.file)]),
    ),
  };
}

const section: Section = {
  id: 'a5-docs-desactualizadas',
  group: 'anexo',
  title: 'Documentos desactualizados',
  headline: 'Referencia: documentos del repositorio que ya no coinciden con el código.',
  tabs: [
    {
      id: 'documentos',
      label: 'Documentos',
      blocks: [
        {
          kind: 'callout',
          tone: 'info',
          text: 'Los documentos de arquitectura se actualizan cuando la supervisión resuelva el cambio de alcance (lista del ADR-15). Los README de cada módulo describen un estado anterior de ese módulo.',
        },
        { kind: 'table', id: 'docs-desactualizadas' },
      ],
    },
  ],
  notes: [
    'Si alguien abre uno de estos documentos, la diferencia con el código ya está explicada en esta página.',
    'Cada fila cita lo que el documento afirma y lo que dice el código hoy.',
    'Los documentos de arquitectura esperan la respuesta de la supervisión (ADR-15, lista de documentos a actualizar).',
  ],
};

export const content: StopContent = {
  section,
  diagrams: [],
  tables: [docsDesactualizadasTable()],
};
