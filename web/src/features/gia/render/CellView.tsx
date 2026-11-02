import type { ReactNode } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { Approval, Decision } from '../model/status';
import type { Cell } from '../model/types';
import { StatusChip } from './StatusChip';
import { APPROVAL_LABELS, formatNumber, yesLabel } from './tableFormat';

/** ADR decision. Solid, dashed or dotted outline as well as the word, so it survives greyscale. */
export function DecisionChip({ decision }: { decision: Decision }) {
  return <span className={`gia-decision gia-decision--${decision.toLowerCase()}`}>{decision}</span>;
}

/** Approval of the scope change. "NO REGISTRADA" is a fact about the repository, not a verdict. */
export function ApprovalChip({ approval }: { approval: Approval }) {
  const modifier = approval.toLowerCase().replace('_', '-');
  return (
    <span className={`gia-approval gia-approval--${modifier}`}>{APPROVAL_LABELS[approval]}</span>
  );
}

function YesMark({ value }: { value: boolean | 'partial' | 'own' }) {
  const label = yesLabel(value);
  if (value === 'own') {
    return (
      <span className="gia-mark gia-mark--own">
        <span aria-hidden="true">✓</span> solo autor
      </span>
    );
  }
  const glyph = value === true ? '✓' : value === false ? '—' : '◐';
  const modifier = value === true ? 'yes' : value === false ? 'no' : 'partial';
  return (
    <span className={`gia-mark gia-mark--${modifier}`} role="img" aria-label={label} title={label}>
      {glyph}
    </span>
  );
}

/** One table cell, drawn according to its variant. */
export function CellView({ cell }: { cell: Cell }): ReactNode {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return formatNumber(cell);
  if ('status' in cell) return <StatusChip status={cell.status} text={cell.text} />;
  if ('decision' in cell) return <DecisionChip decision={cell.decision} />;
  if ('approval' in cell) return <ApprovalChip approval={cell.approval} />;
  if ('chips' in cell) {
    return (
      <ul className="gia-chip-list">
        {cell.chips.map((chip) => (
          <li key={chip.label}>
            <StatusChip status={chip.status} text={chip.label} />
          </li>
        ))}
      </ul>
    );
  }
  if ('mono' in cell) return <code className="gia-mono">{cell.mono}</code>;
  if ('yes' in cell) return <YesMark value={cell.yes} />;
  return assertNever(cell);
}
