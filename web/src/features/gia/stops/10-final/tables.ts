/**
 * Tables of the stop "Estado final". Only `aceptacion` is defined here: the `pantallas` table is
 * defined once by the architecture stop (it lists built and planned rows) and this stop shows it
 * by id.
 */
import { STATUS_META, countBy, type Status } from '../../model/status';
import type { TableDef } from '../../model/types';
import { ACCEPTANCE } from './acceptance';

const STATUS_ORDER: readonly Status[] = ['done', 'partial', 'planned', 'unknown'];

/** Footer chips: how many criteria are in each status, counted from the rows. */
function footerChips(): { label: string; status: Status }[] {
  const counts = countBy(ACCEPTANCE, (criterion) => criterion.status);
  return STATUS_ORDER.flatMap((status) => {
    const count = counts[status];
    return count === undefined ? [] : [{ label: `${STATUS_META[status].label}: ${count}`, status }];
  });
}

export const tables: readonly TableDef[] = [
  {
    id: 'aceptacion',
    title: 'Criterios de aceptación',
    caption:
      'Los pasos salen de los enunciados de las dos PPS. La columna "Hoy se demuestra por" dice con qué se puede mostrar cada uno ahora.',
    columns: [
      { key: 'criterio', label: 'Criterio' },
      { key: 'hoy', label: 'Hoy se demuestra por' },
      { key: 'falta', label: 'Falta' },
      { key: 'estado', label: 'Estado', align: 'center' },
    ],
    rows: ACCEPTANCE.map((criterion) => ({
      criterio: criterion.criterion,
      hoy: criterion.today,
      falta: criterion.missing,
      estado: { status: criterion.status },
    })),
    footer: {
      criterio: `${ACCEPTANCE.length} criterios`,
      estado: { chips: footerChips() },
    },
    sources: [
      {
        kind: 'doc',
        ref: 'docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf',
        note: 'Sección de aceptación (PPS 1)',
      },
      {
        kind: 'doc',
        ref: 'docs/PPS_02_Gestion_Anotacion_Datasets (1).pdf',
        note: 'Sección de aceptación (PPS 2)',
      },
      {
        kind: 'doc',
        ref: 'docs/arquitectura/06-organizacion-y-roadmap.md:149-158',
        note: 'Criterios y momento en que cada uno queda demostrable',
      },
      {
        kind: 'test',
        ref: 'scripts/test_acceptance_i3.py',
        note: 'Ensayo de aceptación por HTTP, sin interfaz',
      },
      {
        kind: 'code',
        ref: 'api/src/Pps.Api/Controllers/IO/ExportController.cs',
        note: 'Exportación interna y COCO; YOLO responde 422',
      },
      {
        kind: 'doc',
        ref: 'docs/arquitectura/07-pendientes.md:8-12',
        note: 'Servidor (S2), acceso externo (S3), datos de prueba (S4, S6)',
      },
    ],
  },
];
