import { useCallback, useEffect, useRef, useState } from 'react';
import { VerifyDiagramsButton } from './engine/VerifyDiagramsButton';
import { SECTIONS } from './model/registry';
import { SNAPSHOT } from './model/status';
import { HelpDialog } from './nav/HelpDialog';
import { SideToc } from './nav/SideToc';
import { navScope, positionLabel, progressLabel, tocEntries } from './nav/sectionIndex';
import { type NavAction, isMoveAction, moveDestination } from './nav/sectionNav';
import { isSnapshotStale, snapshotAgeDays } from './nav/snapshotAge';
import { useActiveSection } from './nav/useActiveSection';
import { scrollToAndHold } from './nav/scrollHold';
import { useGiaKeys } from './nav/useGiaKeys';
import { useHashChange, useHashWriter, useInitialHashAlignment } from './nav/useHashNavigation';
import { NavigateContext } from './render/NavigateContext';
import { SectionView } from './render/SectionView';
import {
  ACCESS_NOTICE,
  FOOTER_LINK_TEXT,
  footerLead,
  snapshotBadge,
  staleMessage,
} from './render/copy';
import './GiaPage.css';

interface GiaPageProps {
  onBack: () => void;
  onNavigate: (target: 'catalog' | 'users') => void;
}

const PAGE_TITLE = 'GIA · Guía del sistema';

/** How long a jump keeps correcting its position while diagrams change the page height. */
const JUMP_HOLD_MS = 3000;

/** Computed once: the section list does not change while the page is open. */
const SECTION_IDS = SECTIONS.map((section) => section.id);
const ENTRIES = tocEntries(SECTIONS);
const FIRST_STOP_ID = SECTIONS.find((section) => section.group === 'recorrido')?.id;
const SOURCES_ID = SECTIONS.find((section) => section.id === 'fuentes')?.id;

/** When the page was opened; the staleness banner compares the snapshot against it. */
const OPENED_AT = Date.now();

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Guide to the system (global admin only, interface-level restriction). Renders every section of
 * the registry, with the shell around it: header, table of contents, presentation mode, keys.
 */
export function GiaPage({ onBack, onNavigate }: GiaPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const presentButtonRef = useRef<HTMLButtonElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const [present, setPresent] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [characterKeys, setCharacterKeys] = useState(true);
  const [tabBySection, setTabBySection] = useState<Readonly<Record<string, string>>>({});
  const { activeId, activate } = useActiveSection(SECTION_IDS);
  /** Ends the hold of the last jump, so only one jump steers the scroll at a time. */
  const endHold = useRef<(() => void) | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(
    () => () => {
      endHold.current?.();
    },
    [],
  );

  const goTo = useCallback(
    (id: string) => {
      activate(id);
      const target = document.getElementById(id);
      if (target === null) return;
      endHold.current?.();
      endHold.current = scrollToAndHold(target, {
        smooth: !prefersReducedMotion(),
        maxMs: JUMP_HOLD_MS,
      });
    },
    [activate],
  );

  useInitialHashAlignment(SECTION_IDS);
  useHashChange(SECTION_IDS, goTo);
  useHashWriter(activeId, SECTION_IDS);

  const handleTabChange = useCallback((sectionId: string, tabId: string) => {
    setTabBySection((current) => ({ ...current, [sectionId]: tabId }));
  }, []);

  /**
   * Runs a keyboard action; returns true when the key was used. A move that would not change the
   * stop (past the first or last one) is not used, so the key keeps its native paging.
   */
  function handleAction(action: NavAction): boolean {
    if (isMoveAction(action)) {
      const target = moveDestination(navScope(SECTIONS, activeId), activeId, action);
      if (target === null) return false;
      goTo(target);
      return true;
    }
    switch (action) {
      case 'fullscreen':
        rootRef.current
          ?.querySelector<HTMLElement>('[data-active="true"] [data-gia-fullscreen]')
          ?.click();
        return true;
      case 'notes':
        setNotesOpen((open) => !open);
        return true;
      case 'present':
        togglePresent();
        return true;
      case 'help':
        setHelpOpen(true);
        return true;
      case 'close':
        if (!present) return false;
        togglePresent();
        return true;
    }
  }

  /**
   * Switching mode changes every stop's height, so bring the active stop back to the top. The
   * button that was used disappears with its bar, so focus moves to its counterpart ("Salir"
   * when entering, "Presentar" when leaving) once the new layout is in place.
   */
  function togglePresent() {
    const entering = !present;
    setPresent(entering);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(activeId);
      if (target !== null) {
        endHold.current?.();
        endHold.current = scrollToAndHold(target, { smooth: false, maxMs: JUMP_HOLD_MS });
      }
      (entering ? exitButtonRef : presentButtonRef).current?.focus({ preventScroll: true });
    });
  }

  useGiaKeys(handleAction, { characterKeys });

  const stale = isSnapshotStale(SNAPSHOT.date, OPENED_AT);
  const progress = progressLabel(SECTIONS, activeId);

  return (
    <NavigateContext.Provider value={onNavigate}>
      <div ref={rootRef} className="gia-root" data-present={present ? 'true' : undefined}>
        <header className="gia-header">
          <button type="button" onClick={onBack}>
            ← Volver
          </button>
          <h1 className="gia-title">{PAGE_TITLE}</h1>
          <span className="gia-badge" title={ACCESS_NOTICE}>
            {snapshotBadge(SNAPSHOT)}
            <span className="gia-sr">. {ACCESS_NOTICE}</span>
          </span>
          <div className="gia-header-actions">
            <VerifyDiagramsButton />
            <button
              type="button"
              aria-pressed={notesOpen}
              onClick={() => {
                setNotesOpen((open) => !open);
              }}
            >
              Notas
            </button>
            <button ref={presentButtonRef} type="button" onClick={togglePresent}>
              Presentar
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setHelpOpen(true);
              }}
            >
              Atajos
            </button>
          </div>
        </header>

        {stale && (
          <p className="gia-banner" role="status">
            {staleMessage(SNAPSHOT, snapshotAgeDays(SNAPSHOT.date, OPENED_AT))}
          </p>
        )}

        <div className="gia-layout">
          <SideToc entries={ENTRIES} activeId={activeId} onSelect={goTo} />
          <main className="gia-main" id="gia-main">
            {SECTIONS.map((section) => (
              <SectionView
                key={section.id}
                section={section}
                position={positionLabel(SECTIONS, section.id)}
                isActive={section.id === activeId}
                present={present}
                notesOpen={notesOpen}
                activeTabId={tabBySection[section.id] ?? section.tabs[0]?.id ?? ''}
                onTabChange={handleTabChange}
                showLegend={section.id === FIRST_STOP_ID}
              />
            ))}
          </main>
        </div>

        <footer className="gia-footer">
          <p>
            {footerLead(SNAPSHOT)}
            {SOURCES_ID ? (
              <a
                href={`#${SOURCES_ID}`}
                onClick={(event) => {
                  event.preventDefault();
                  goTo(SOURCES_ID);
                }}
              >
                {FOOTER_LINK_TEXT}
              </a>
            ) : (
              FOOTER_LINK_TEXT
            )}
          </p>
        </footer>

        {present && (
          <div className="gia-present-bar">
            <span className="gia-progress" aria-live="polite">
              {progress}
            </span>
            <button ref={exitButtonRef} type="button" onClick={togglePresent}>
              Salir
            </button>
          </div>
        )}

        <HelpDialog
          open={helpOpen}
          onClose={() => {
            setHelpOpen(false);
          }}
          characterKeys={characterKeys}
          onCharacterKeysChange={setCharacterKeys}
        />
      </div>
    </NavigateContext.Provider>
  );
}
