import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { TocEntry } from './sectionIndex';

interface SideTocProps {
  entries: readonly TocEntry[];
  activeId: string;
  onSelect: (id: string) => void;
}

const GROUP_LABELS = { recorrido: 'Recorrido', anexo: 'Anexos' } as const;
const GROUPS = ['recorrido', 'anexo'] as const;

/** A click that the browser would treat as "open this link in the same tab". */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Table of contents. One list serves two layouts: a sticky left rail from 1100 px wide, and a
 * row of chips under the header below that (the CSS decides). Links are real anchors.
 */
export function SideToc({ entries, activeId, onSelect }: SideTocProps) {
  const navRef = useRef<HTMLElement>(null);

  // Keep the active entry visible inside the rail or the chip row, without moving the page.
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="location"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  return (
    <nav ref={navRef} className="gia-toc" aria-label="Índice de la guía">
      {GROUPS.map((group) => {
        const inGroup = entries.filter((entry) => entry.group === group);
        if (inGroup.length === 0) return null;
        return (
          <div key={group} className="gia-toc-group">
            <p className="gia-toc-label">{GROUP_LABELS[group]}</p>
            <ol className="gia-toc-list">
              {inGroup.map((entry) => (
                <li key={entry.id}>
                  <a
                    className="gia-toc-link"
                    href={`#${entry.id}`}
                    aria-current={entry.id === activeId ? 'location' : undefined}
                    onClick={(event) => {
                      if (!isPlainClick(event)) return;
                      event.preventDefault();
                      onSelect(entry.id);
                    }}
                  >
                    <span className="gia-toc-ord">{entry.ordinal}</span>
                    <span className="gia-toc-title">{entry.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </nav>
  );
}
