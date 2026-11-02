import { useState } from 'react';
import { STATUS_META } from '../model/status';
import type { TableDef } from '../model/types';
import { CellView } from './CellView';
import {
  EMPTY_FILTER,
  type TableFilter,
  filterRows,
  isFilterActive,
  isFilterable,
  statusCounts,
  toggleStatus,
} from './tableFilter';

function FilterBar({
  table,
  filter,
  shown,
  onChange,
}: {
  table: TableDef;
  filter: TableFilter;
  shown: number;
  onChange: (next: TableFilter) => void;
}) {
  return (
    <div className="gia-filter">
      <label className="gia-filter-search">
        <span className="gia-sr">{`Filtrar las filas de ${table.title}`}</span>
        <input
          type="search"
          placeholder="Filtrar filas…"
          value={filter.text}
          onChange={(event) => {
            onChange({ ...filter, text: event.target.value });
          }}
        />
      </label>
      <ul className="gia-filter-chips">
        {statusCounts(table).map(({ status, count }) => (
          <li key={status}>
            <button
              type="button"
              className={`gia-filter-chip gia-st--${status}`}
              aria-pressed={filter.statuses.has(status)}
              onClick={() => {
                onChange({ ...filter, statuses: toggleStatus(filter.statuses, status) });
              }}
            >
              <span aria-hidden="true">{STATUS_META[status].glyph}</span>{' '}
              {STATUS_META[status].label} ({count})
            </button>
          </li>
        ))}
      </ul>
      {isFilterActive(filter) && (
        <button
          type="button"
          className="gia-filter-clear"
          onClick={() => {
            onChange(EMPTY_FILTER);
          }}
        >
          Limpiar filtro
        </button>
      )}
      <p className="gia-filter-count" role="status">
        {`Mostrando ${String(shown)} de ${String(table.rows.length)}`}
      </p>
    </div>
  );
}

function TableSources({ table }: { table: TableDef }) {
  if (table.sources.length === 0) return null;
  return (
    <details className="gia-sources">
      <summary>{`Fuentes (${String(table.sources.length)})`}</summary>
      <ul>
        {table.sources.map((source, index) => (
          <li key={index}>
            <code className="gia-mono">{source.ref}</code>
            {source.note ? ` — ${source.note}` : ''}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Any table of the page: semantic markup, status chips, optional filter, footer and sources. */
export function DataTable({ table }: { table: TableDef }) {
  const [filter, setFilter] = useState<TableFilter>(EMPTY_FILTER);
  const visible = filterRows(table, filter);

  const body = (
    <>
      {isFilterable(table) && (
        <FilterBar table={table} filter={filter} shown={visible.length} onChange={setFilter} />
      )}
      <div
        className="gia-table-wrap"
        role="region"
        aria-label={table.title}
        tabIndex={0}
        data-gia-scroll
      >
        <table className="gia-table">
          <caption className={table.collapsible ? 'gia-sr' : 'gia-table-caption'}>
            <span className="gia-table-title">{table.title}</span>
            {table.caption && <span className="gia-table-subtitle">{table.caption}</span>}
          </caption>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column.key} scope="col" className={`gia-align-${column.align ?? 'left'}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, index }) => (
              <tr key={index}>
                {table.columns.map((column, columnIndex) => {
                  const cell = row[column.key];
                  const content = cell === undefined ? null : <CellView cell={cell} />;
                  const className = `gia-align-${column.align ?? 'left'}`;
                  return columnIndex === 0 ? (
                    <th key={column.key} scope="row" className={className}>
                      {content}
                    </th>
                  ) : (
                    <td key={column.key} className={className}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className="gia-table-empty" colSpan={table.columns.length}>
                  Ninguna fila coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
          {table.footer && (
            <tfoot>
              <tr>
                {table.columns.map((column, columnIndex) => {
                  const cell = table.footer?.[column.key];
                  const content = cell === undefined ? null : <CellView cell={cell} />;
                  const className = `gia-align-${column.align ?? 'left'}`;
                  return columnIndex === 0 ? (
                    <th key={column.key} scope="row" className={className}>
                      {content}
                    </th>
                  ) : (
                    <td key={column.key} className={className}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <TableSources table={table} />
    </>
  );

  if (table.collapsible) {
    return (
      <details className="gia-collapsible">
        <summary>
          {table.title}
          <span className="gia-collapsible-count">{` · ${String(table.rows.length)} filas`}</span>
        </summary>
        {body}
      </details>
    );
  }
  return <div className="gia-table-block">{body}</div>;
}
