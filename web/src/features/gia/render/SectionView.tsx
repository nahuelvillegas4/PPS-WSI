import { memo } from 'react';
import { formatMinutes } from '../nav/sectionIndex';
import type { Section } from '../model/types';
import { BlockRenderer } from './BlockRenderer';
import { Legend } from './Legend';
import { Tabs } from './Tabs';

interface SectionViewProps {
  section: Section;
  /** "Parada 3 de 11" or "Anexo 2 de 7", shown above the title. */
  position: string;
  isActive: boolean;
  present: boolean;
  notesOpen: boolean;
  activeTabId: string;
  /** Stable across renders so that memoised sections do not redraw when another one scrolls in. */
  onTabChange: (sectionId: string, tabId: string) => void;
  /** The first stop of the walk-through carries the legend of the status marks. */
  showLegend: boolean;
}

/**
 * One stop or annex: heading, tab bar, only the active tab mounted, footnotes, the extra detail
 * and the speaker notes. Detail and notes are not rendered at all in presentation mode.
 */
export const SectionView = memo(function SectionView({
  section,
  position,
  isActive,
  present,
  notesOpen,
  activeTabId,
  onTabChange,
  showLegend,
}: SectionViewProps) {
  const titleId = `${section.id}-title`;
  const activeTab = section.tabs.find((tab) => tab.id === activeTabId) ?? section.tabs[0];
  const minutes = formatMinutes(section.minutes);
  const [saying, ...rest] = section.notes;

  return (
    <section
      id={section.id}
      className={`gia-stop gia-stop--${section.group}`}
      data-active={isActive ? 'true' : 'false'}
      aria-labelledby={titleId}
    >
      <header className="gia-stop-head">
        <p className="gia-kicker">
          <span>{position}</span>
          {minutes && <span className="gia-kicker-min">{minutes}</span>}
        </p>
        <h2 id={titleId} className="gia-stop-title">
          {section.title}
        </h2>
        <p className="gia-headline">{section.headline}</p>
      </header>

      {showLegend && <Legend />}

      {activeTab && (
        <Tabs
          idPrefix={section.id}
          label={`Vistas de ${section.title}`}
          tabs={section.tabs}
          activeId={activeTab.id}
          onChange={(tabId) => {
            onTabChange(section.id, tabId);
          }}
        >
          {activeTab.blocks.map((block, index) => (
            <BlockRenderer key={`${activeTab.id}-${String(index)}`} block={block} />
          ))}
        </Tabs>
      )}

      {section.footnotes && section.footnotes.length > 0 && (
        <aside className="gia-footnotes" aria-label="Notas al pie">
          <ol>
            {section.footnotes.map((note) => (
              <li key={note.id} id={`${section.id}-nota-${note.id}`}>
                {note.text}
              </li>
            ))}
          </ol>
        </aside>
      )}

      {!present && section.detail && section.detail.length > 0 && (
        <div className="gia-detail">
          <p className="gia-detail-label">Detalle</p>
          {section.detail.map((block, index) => (
            <BlockRenderer key={`detail-${String(index)}`} block={block} />
          ))}
        </div>
      )}

      {!present && notesOpen && saying !== undefined && (
        <aside className="gia-notes" aria-label="Notas del orador">
          <p className="gia-notes-label">Para decir</p>
          <p className="gia-notes-say">{saying}</p>
          {rest.length > 0 && (
            <ul className="gia-notes-more">
              {rest.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </section>
  );
});
