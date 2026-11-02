import { MEASURED } from '../../data/measured';
import { statusOf } from '../../model/diagramKit';
import type { TableDef } from '../../model/types';
import { formatDate } from './measuredText';

/**
 * Risks R1..R15 of the architecture document (section 11.1). The indicator of the last column is
 * the state of the planned mitigation, not the severity of the risk. Items that depend on a
 * tripwire of `model/features.ts` read their status from there.
 */
export const riesgosTable: TableDef = {
  id: 'riesgos',
  title: 'Riesgos del plan y su estado observable',
  caption:
    'El indicador muestra el estado de la mitigación prevista, no la gravedad del riesgo. P / I es probabilidad e impacto según el documento de arquitectura (v0.9).',
  columns: [
    { key: 'r', label: 'R' },
    { key: 'risk', label: 'Riesgo' },
    { key: 'pi', label: 'P / I' },
    { key: 'state', label: 'Estado observable', filterable: true },
  ],
  rows: [
    {
      r: 'R1',
      risk: 'Integración tardía: las dos propuestas integraban al final',
      pi: 'Alta / Alto',
      state: {
        status: 'partial',
        text: 'Compose integrado; el esqueleto completo no está cerrado',
      },
    },
    {
      r: 'R2',
      risk: 'La aceptación de la PPS 2 depende del visor y del editor de la PPS 1',
      pi: 'Media / Alto',
      state: {
        status: statusOf('editor'),
        text: 'En curso: la API llegó al incremento 3, el editor no existe',
      },
    },
    {
      r: 'R3',
      risk: 'Deriva del contrato, sobre todo en coordenadas',
      pi: 'Media / Alto',
      state: {
        status: 'partial',
        text: 'Verificación local con check_contract.py; sin integración continua',
      },
    },
    {
      r: 'R4',
      risk: 'Configuración de auth_request (códigos, cabeceras, redirecciones)',
      pi: 'Media / Medio',
      state: {
        status: 'partial',
        text: 'Probado el 17/10 en contenedores; sin prueba de humo automática',
      },
    },
    {
      r: 'R5',
      risk: 'Rendimiento de teselas con WSI reales',
      pi: 'Media / Medio',
      state: {
        status: 'partial',
        text: `Medido el ${formatDate(MEASURED.tileP95Ms.asOf)}, antes de la autorización por membresía`,
      },
    },
    {
      r: 'R6',
      risk: 'La capa SVG se vuelve lenta con muchas anotaciones',
      pi: 'Baja / Medio',
      state: { status: 'unknown', text: 'No se puede medir: no existe la capa de dibujo' },
    },
    {
      r: 'R7',
      risk: 'Fuga de datos sensibles (imágenes asociadas, nombres, metadatos)',
      pi: 'Baja / Alto',
      state: {
        status: 'partial',
        text: 'Mitigaciones en el código; falta anonimizar las imágenes asociadas',
      },
    },
    {
      r: 'R8',
      risk: 'Claves de sesión no persistidas: cada reinicio cierra las sesiones',
      pi: 'Media / Bajo',
      state: { status: 'done', text: 'Mitigado con un volumen para las claves' },
    },
    {
      r: 'R9',
      risk: 'Diferencias entre Windows, WSL y Linux (fin de línea, volúmenes)',
      pi: 'Media / Bajo',
      state: { status: 'planned', text: 'No existe .gitattributes' },
    },
    {
      r: 'R10',
      risk: 'Crecimiento del alcance (YOLO, extras)',
      pi: 'Media / Medio',
      state: {
        status: 'partial',
        text: 'Materializado: roles por proyecto y subida (ADR-15 a 17) sin aprobación registrada',
      },
    },
    {
      r: 'R11',
      risk: 'La PPS 2 termina antes: errores de la API sin dueño',
      pi: 'Alta / Medio',
      state: { status: 'planned', text: 'El incremento 4 (API congelada y documentada) no empezó' },
    },
    {
      r: 'R12',
      risk: 'Versiones recién publicadas de las dependencias',
      pi: 'Media / Bajo',
      state: {
        status: 'partial',
        text: 'ADR-14 fija la línea base; sin integración continua que lo vigile',
      },
    },
    {
      r: 'R13',
      risk: 'El servidor del laboratorio no está disponible a tiempo',
      pi: 'Media / Alto',
      state: {
        status: 'unknown',
        text: 'Sin decisión registrada sobre el acceso al servidor (S2)',
      },
    },
    {
      r: 'R14',
      risk: 'La evaluación individual se vuelve difusa',
      pi: 'Media / Medio',
      state: {
        status: statusOf('codeowners'),
        text: 'No existe el archivo de responsables por carpeta',
      },
    },
    {
      r: 'R15',
      risk: 'Datos de prueba sin licencia clara',
      pi: 'Media / Medio',
      state: { status: 'unknown', text: 'Licencia de las WSI de prueba sin verificar' },
    },
  ],
  sources: [
    { kind: 'doc', ref: 'docs/arquitectura/05-calidad-y-riesgos.md:24-40' },
    { kind: 'doc', ref: 'docs/arquitectura/07-pendientes.md:8', note: 'S2: acceso al servidor' },
    { kind: 'config', ref: 'compose.yaml', note: 'Volumen para las claves de sesión' },
  ],
};
