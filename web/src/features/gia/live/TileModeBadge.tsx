import { useEffect, useState } from 'react';
import { STATUS_META } from '../model/status';
import { BADGE_STATUS, type BadgeState, TILE_MODE_MESSAGES } from './tileMessages';
import { probeTileMode } from './tileProbe';

/** Tells which way this instance serves tiles; the request is made once, when it mounts. */
export function TileModeBadge() {
  const [state, setState] = useState<BadgeState>('checking');

  useEffect(() => {
    const controller = new AbortController();
    void probeTileMode(controller.signal).then((mode) => {
      if (!controller.signal.aborted) setState(mode);
    });
    return () => {
      controller.abort();
    };
  }, []);

  const status = BADGE_STATUS[state];
  return (
    <p className={`gia-live gia-st--${status}`} role="status" data-mode={state}>
      <span className="gia-live-glyph" aria-hidden="true">
        {STATUS_META[status].glyph}
      </span>
      <span>{TILE_MODE_MESSAGES[state]}</span>
    </p>
  );
}
