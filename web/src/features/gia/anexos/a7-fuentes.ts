/**
 * Annex A7, "Fuentes y método": how each family of facts on the page was obtained, and what was
 * not verified. It is also where the page says what it is (C2) and what its footer means (C11).
 */
import { FACTS } from '../model/facts';
import { SNAPSHOT } from '../model/status';
import type { Section, StopContent, TableDef } from '../model/types';

/** C2: what the page is, and what its access restriction is not. */
export const ACCESS_CLAIM =
  'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.';

/**
 * What the restriction of C2 leaves out: the content travels in the files of the interface, which
 * the gateway hands out without asking for a session (`deploy/gateway/nginx.conf`, `/assets/`),
 * and it includes the list of security debt of the progress stop.
 */
export const PUBLIC_CONTENT =
  'El contenido forma parte de los archivos de la interfaz, que la pasarela entrega sin pedir sesión: es público para quien alcance la pasarela e incluye la lista de deuda de seguridad (Avance, pestaña Deuda y seguridad). Esa lista nombra brechas, no valores ni credenciales.';

/** C11: the footer of the page. */
export const FOOTER_TEXT = `Datos al ${SNAPSHOT.label} · commit ${SNAPSHOT.commit} · confeccionado a mano; ver Fuentes y método`;

const table: TableDef = {
  id: 'fuentes',
  title: 'Fuentes y método',
  caption:
    'Una fila por familia de datos. Los resultados de pruebas son el registro de una ejecución con fecha, commit y método; el resto se lee del repositorio.',
  columns: [
    { key: 'dato', label: 'Dato' },
    { key: 'verificado', label: 'Cómo se verificó' },
    { key: 'pendiente', label: 'Qué no se verificó' },
  ],
  rows: [
    {
      dato: `Operaciones de la API (${FACTS.operations}), de las teselas (${FACTS.tileOperations}) y matriz de permisos`,
      verificado: `Se contaron las operaciones de los dos archivos OpenAPI y se compararon una por una con la matriz de autorización y con las acciones de los ${FACTS.controllers} controladores, por revisión estática y sin ejecutar la API. Una prueba de la página falla si cambian.`,
      pendiente:
        'Que cada operación responda como declara el contrato ante HTTP real: las pruebas de la API no atraviesan la capa HTTP.',
    },
    {
      dato: `Modelo de datos (${FACTS.tables} tablas, ${FACTS.migrations} migraciones, claves e invariantes)`,
      verificado:
        'Lectura del contexto de datos, de las migraciones y de su instantánea. Una prueba compara los nombres de tablas y de migraciones con los archivos.',
      pendiente:
        'No se consultó ninguna base en ejecución. La ida y vuelta de la migración la ensayó el equipo a mano el 01/11: no se puede reproducir desde el repositorio.',
    },
    {
      dato: 'Pantallas y rutas de la interfaz',
      verificado:
        'Lectura del enrutador y de App.tsx. Una prueba llama al enrutador con cada URL documentada y comprueba que cada ruta tiene su caso.',
      pendiente:
        'Cómo se ve cada pantalla con cada rol: no hay pruebas de componentes ni de extremo a extremo; el equipo las recorrió en un navegador durante el desarrollo, sin un registro reproducible en el repositorio.',
    },
    {
      dato: 'Qué ve y qué puede hacer cada rol en la interfaz',
      verificado:
        'La tabla se calcula llamando a la función can() de la interfaz, la misma que decide qué botones se muestran.',
      pendiente:
        'can() solo oculta controles; decide el servidor. No se recorrió una sesión real de cada rol para armar esta página.',
    },
    {
      dato: `Requisitos de las dos PPS (${FACTS.requirements}) y su estado`,
      verificado:
        'Se leyeron completos los dos enunciados y se contrastó cada requisito con el código, los ADR y el contrato; el estado de cada fila cita su evidencia.',
      pendiente:
        'Los criterios de evaluación de la cátedra: los enunciados no traen rúbrica ni ponderación.',
    },
    {
      dato: `Decisiones de arquitectura (${FACTS.adrs} ADR)`,
      verificado:
        'Lectura de cada ADR. Una prueba compara el estado de cada uno con docs/adr/README.md; "en código" sale de contrastar cada decisión con el código.',
      pendiente:
        'La aprobación de la supervisión de los ADR propuestos: el repositorio no la registra, por eso figura como no registrada.',
    },
    {
      dato: 'Resultados de las pruebas (API, interfaz, teselas)',
      verificado:
        'Son el registro de una ejecución, no un dato derivado del código: llevan fecha, commit y método. Lo que sí sale del código es el recuento de pruebas declaradas.',
      pendiente:
        'Las pruebas de la API se corrieron el 01/11 en un contenedor (el código de la API no cambió desde el commit 871f574), sobre SQLite y sin capa HTTP. Ninguna prueba automática abre una lámina SVS real. Las comprobaciones manuales del equipo no se pueden reproducir desde el repositorio.',
    },
    {
      dato: 'Despliegue actual: contenedores, volúmenes y pasarela',
      verificado:
        'Lectura de compose.yaml, de la configuración de la pasarela y de los Dockerfile; observación del sistema local en ejecución el 02/11, solo lectura.',
      pendiente:
        'Un despliegue en el servidor del laboratorio (sin fecha ni acceso registrados). La autorización real de teselas de punta a punta, porque el sistema local corre con la variante de desarrollo. El arranque desde cero en otra máquina.',
    },
    {
      dato: 'Estado final propuesto: despliegue, pantallas y criterios de aceptación',
      verificado:
        'Se derivó de los enunciados, del documento de arquitectura v0.9 (28/09/2026) y de los ADR. Cada ítem planificado tiene una alarma: si alguien lo construye, una prueba falla y pide actualizar la página.',
      pendiente:
        'Que la supervisión lo confirme. Faltan la definición del servidor y del acceso externo con TLS (S2, S3) y los datos de aceptación (S4, S6).',
    },
    {
      dato: 'Bocetos de las pantallas propuestas',
      verificado:
        'Cada elemento nombra la operación del contrato que usaría. Una prueba comprueba que esas operaciones existen en el contrato, con el mismo método.',
      pendiente:
        'Cómo deberían verse: no hay especificación de interfaz en el repositorio; lo que no tiene operación figura como propuesta de diseño.',
    },
    {
      dato: 'Hoja de ruta frente a lo hecho',
      verificado:
        'Las fechas del plan salen del documento de arquitectura; las de lo hecho, de las fechas de commit de git.',
      pendiente:
        'La fecha de un commit es una cota superior del trabajo, porque varias tandas se confirmaron juntas. La bitácora de la PPS 2 fecha esas mismas jornadas entre 0 y 5 días después que git, y esta página no concilia esa diferencia. El esfuerzo individual no forma parte de esta página.',
    },
    {
      dato: 'Documentación desactualizada (anexo A5)',
      verificado: 'Se comparó lo que afirma cada documento con el código y el contrato.',
      pendiente:
        'La lista es el resultado de la lectura hecha el 02/11; no se garantiza que sea exhaustiva.',
    },
    {
      dato: 'Cifras de tamaño del repositorio (anexo A4)',
      verificado:
        'Contadas sobre los archivos versionados al 02/11 con git y contadores de líneas y de declaraciones de prueba.',
      pendiente:
        'Son una medición con fecha y commit, no un dato derivado: cambian con cada commit y no incluyen archivos sin versionar.',
    },
  ],
  sources: [
    { kind: 'contract', ref: 'contract/openapi/api.v1.yaml', note: 'Operaciones de la API' },
    { kind: 'contract', ref: 'contract/openapi/tiles.v1.yaml', note: 'Operaciones de las teselas' },
    {
      kind: 'contract',
      ref: 'contract/fixtures/authorization-matrix.json',
      note: 'Matriz de autorización',
    },
    { kind: 'adr', ref: 'docs/adr/README.md', note: 'Estado de cada ADR' },
    { kind: 'config', ref: 'compose.yaml', note: 'Contenedores y volúmenes' },
    {
      kind: 'code',
      ref: 'web/src/features/gia/README.md',
      note: 'Cómo se evita que la página mienta',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/06-organizacion-y-roadmap.md',
      note: 'Fechas del plan',
    },
  ],
};

const section: Section = {
  id: 'a7-fuentes',
  group: 'anexo',
  title: 'Fuentes y método',
  headline: 'Cómo se obtuvo cada dato de esta página y qué no se verificó.',
  tabs: [
    {
      id: 'metodo',
      label: 'Método',
      blocks: [
        { kind: 'callout', tone: 'info', title: 'Qué es esta página', text: ACCESS_CLAIM },
        {
          kind: 'callout',
          tone: 'honest',
          title: 'Quién puede leerla',
          text: PUBLIC_CONTENT,
        },
        {
          kind: 'callout',
          tone: 'honest',
          title: 'Un número medido no es un número derivado',
          text: 'Los resultados de pruebas son el registro de una ejecución: llevan fecha, commit y método, y cambian cuando se vuelven a correr. Los conteos de operaciones, tablas, ADR y requisitos se leen del repositorio, y una prueba falla si dejan de coincidir.',
        },
        {
          kind: 'list',
          items: [
            `Corte de los datos: ${SNAPSHOT.label}, commit ${SNAPSHOT.commit}. La página se confeccionó a mano sobre ese corte.`,
            `Pie de la página: "${FOOTER_TEXT}".`,
            'Si cambió un número del sistema: editar model/facts.ts y correr las pruebas; la que falla indica de dónde sale el valor real.',
            'Si se construyó algo que figuraba como planificado: actualizar su entrada en model/features.ts y el contenido que lo menciona.',
            'Siempre: actualizar el corte (SNAPSHOT en model/status.ts) y los valores medidos de data/measured.ts.',
          ],
        },
      ],
    },
    { id: 'fuentes', label: 'Tabla de fuentes', blocks: [{ kind: 'table', id: 'fuentes' }] },
  ],
  notes: [
    'Cada dato de la página dice cómo se verificó y qué quedó sin verificar.',
    'Los números de pruebas son el registro de una ejecución, no un dato derivado del código.',
  ],
};

export const content: StopContent = { section, diagrams: [], tables: [table] };
