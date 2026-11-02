import type { KeyboardEvent, ReactNode } from 'react';
import { nextTab } from './tabKeys';

interface TabsProps {
  /** Unique per section; ties each tab to the panel it controls. */
  idPrefix: string;
  label: string;
  tabs: readonly { id: string; label: string }[];
  activeId: string;
  onChange: (tabId: string) => void;
  /** The content of the active tab only: hidden panels are never mounted. */
  children: ReactNode;
}

/** WAI-ARIA tabs: roving tabindex, arrows wrap around, Home and End. Activation follows focus. */
export function Tabs({ idPrefix, label, tabs, activeId, onChange, children }: TabsProps) {
  const panelId = `${idPrefix}-panel`;

  if (tabs.length <= 1) {
    return <div className="gia-tabpanel">{children}</div>;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = nextTab(
      tabs.map((tab) => tab.id),
      activeId,
      event.key,
    );
    if (target === null) return;
    event.preventDefault();
    onChange(target);
    event.currentTarget
      .querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(target)}"]`)
      ?.focus();
  }

  return (
    <div className="gia-tabs">
      <div className="gia-tablist" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              data-tab-id={tab.id}
              className="gia-tab"
              aria-selected={selected}
              aria-controls={selected ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                onChange(tab.id);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="gia-tabpanel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${idPrefix}-tab-${activeId}`}
      >
        {children}
      </div>
    </div>
  );
}
