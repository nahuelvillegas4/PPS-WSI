import type { Block } from '../model/types';
import { DecisionChip } from './CellView';
import { buildQuadrantGrid } from './chartMath';

type QuadrantsBlock = Extract<Block, { kind: 'quadrants' }>;

const ROW_LABELS = {
  realizado: 'Realizado en el código',
  parcial: 'Parcial en el código',
} as const;

/** What was decided against what was built: a 2 x 2 table, each square with its count and items. */
export function Quadrants({ cells }: { cells: QuadrantsBlock['cells'] }) {
  const grid = buildQuadrantGrid(cells);
  return (
    <div
      className="gia-table-wrap"
      role="region"
      aria-label="Decisión frente a código"
      tabIndex={0}
      data-gia-scroll
    >
      <table className="gia-quadrants">
        <caption className="gia-sr">
          Decisión de arquitectura frente a lo construido en el código
        </caption>
        <thead>
          <tr>
            <td className="gia-quadrants-corner" />
            {grid.columns.map((decision) => (
              <th key={decision} scope="col">
                <DecisionChip decision={decision} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((realised, rowIndex) => (
            <tr key={realised}>
              <th scope="row">{ROW_LABELS[realised]}</th>
              {grid.columns.map((decision, columnIndex) => {
                const slot = grid.slots[rowIndex]?.[columnIndex];
                return (
                  <td key={decision} className="gia-quadrant">
                    <span className="gia-quadrant-count">{slot?.count ?? 0}</span>
                    {slot && slot.items.length > 0 && (
                      <ul className="gia-quadrant-items">
                        {slot.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
