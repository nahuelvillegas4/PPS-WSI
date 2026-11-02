/**
 * Text helpers for measured numbers: Spanish number and date formats, the sentence that explains
 * a measurement, and copy C4 (the execution record of the test suites), always built from the
 * `MEASURED` entries so the page cannot show a number without its date, commit and method.
 */
import { MEASURED } from '../../data/measured';
import type { Measured } from '../../model/status';

/** 1234.5 -> "1.234,5"; text is returned as it is. */
export function formatNumber(value: number | string): string {
  if (typeof value === 'string') return value;
  const [integer = '', fraction] = String(value).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

/** "2026-11-02" -> "02/11/2026". */
export function formatDate(isoDate: string): string {
  const [year = '', month = '', day = ''] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** "Method. Measured on dd/mm/yyyy · commit abc1234. Caveat." for the "how it was measured" cells. */
export function describeMeasured(measured: Measured): string {
  const stamp = `Medido el ${formatDate(measured.asOf)} · commit ${measured.commit}.`;
  return [`${measured.method}. ${stamp}`, measured.caveat].filter(Boolean).join(' ');
}

/**
 * Copy C4. The number of cases of the API is never shown without the explanation that it counts
 * executions of 152 methods, because a data-driven test method runs once per row of data.
 */
export function executionRecord(): string {
  const { apiTestCases, apiTestMethods, webTestCases, tilesTestFunctions } = MEASURED;
  const date = formatDate(apiTestCases.asOf);
  const web = formatNumber(webTestCases.value);
  const tiles = formatNumber(tilesTestFunctions.value);
  return (
    `Ejecutado el ${date} sobre HEAD ${apiTestCases.commit}: ` +
    `API ${formatNumber(apiTestCases.value)} casos (${formatNumber(apiTestMethods.value)} métodos; ` +
    'binario compilado el 01/11 en contenedor, nombres de pruebas idénticos a HEAD) · ' +
    `Web ${web}/${web} · Tiles ${tiles}/${tiles}. Pruebas de API sobre SQLite, sin capa HTTP.`
  );
}
