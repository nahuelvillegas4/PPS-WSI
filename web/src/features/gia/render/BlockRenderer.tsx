import { useContext } from 'react';
import { assertNever } from '../../../shared/assertNever';
import { DiagramFigure } from '../engine/DiagramFigure';
import { TileModeBadge } from '../live/TileModeBadge';
import { TABLES } from '../model/registry';
import type { Block } from '../model/types';
import { Wireframe } from '../wireframes/Wireframes';
import { Bars } from './Bars';
import { Callout } from './Callout';
import { Cards } from './Cards';
import { DataTable } from './DataTable';
import { NavigateContext } from './NavigateContext';
import { Quadrants } from './Quadrants';
import { Stats } from './Stats';
import { Stepper } from './Stepper';
import { Waffle } from './Waffle';

function LiveLink({ target, label }: { target: 'catalog' | 'users'; label: string }) {
  const navigate = useContext(NavigateContext);
  return (
    <button
      type="button"
      className="gia-livelink"
      onClick={() => {
        navigate(target);
      }}
    >
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}

function BlockBody({ block }: { block: Block }) {
  switch (block.kind) {
    case 'diagram':
      return <DiagramFigure id={block.id} />;
    case 'table': {
      const table = TABLES.get(block.id);
      return table ? (
        <DataTable table={table} />
      ) : (
        <p className="gia-missing" role="alert">
          Tabla inexistente: {block.id}
        </p>
      );
    }
    case 'callout':
      return <Callout tone={block.tone} title={block.title} text={block.text} />;
    case 'stats':
      return <Stats items={block.items} />;
    case 'stepper':
      return <Stepper steps={block.steps} />;
    case 'waffle':
      return <Waffle groups={block.groups} />;
    case 'bars':
      return <Bars rows={block.rows} />;
    case 'quadrants':
      return <Quadrants cells={block.cells} />;
    case 'cards':
      return <Cards items={block.items} />;
    case 'list':
      return (
        <ul className="gia-list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'wireframe':
      return <Wireframe id={block.id} />;
    case 'live':
      return <TileModeBadge />;
    case 'liveLink':
      return <LiveLink target={block.target} label={block.label} />;
    default:
      return assertNever(block);
  }
}

/** Draws one block of a tab. The switch is exhaustive: a new block kind will not compile here. */
export function BlockRenderer({ block }: { block: Block }) {
  return (
    <div className={`gia-block gia-block--${block.kind}`}>
      <BlockBody block={block} />
    </div>
  );
}
