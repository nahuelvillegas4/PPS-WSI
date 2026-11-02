import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { DIAGRAMS } from '../model/registry';
import { neighbour } from './diagramSiblings';
import { StaleSchemeError, renderDiagram } from './renderDiagram';
import { describeRenderError, parseViewBox, retagSvgIds } from './svgTools';
import { useColorScheme } from './useColorScheme';
import {
  IDENTITY,
  KEY_ZOOM_FACTOR,
  MIN_ZOOM,
  centreOf,
  fit,
  panBy,
  toCssTransform,
  wheelFactor,
  zoomAt,
  zoomFloor,
  type Size,
  type Transform,
} from './viewTransform';

interface DiagramViewerProps {
  /** The diagrams the previous and next buttons walk through, normally those of one stop. */
  ids: readonly string[];
  initialId: string;
  onClose: () => void;
}

/** What the stage shows for one `id:scheme`: the drawing's natural size and its pan and zoom. */
interface View {
  key: string;
  natural: Size;
  transform: Transform;
  /** Lowest zoom the user may reach: 0.5, or the fitted scale of a diagram larger than the screen. */
  minZoom: number;
  error: string | null;
}

const NO_SIZE: Size = { width: 0, height: 0 };

/**
 * Fullscreen viewer in a native modal `<dialog>`: wheel zoom at the cursor, drag to pan, the keys
 * `+` `-` `0`, `←` `→` for the other diagrams of the stop and `Esc` to close. It draws a copy of
 * the figure's SVG with its ids retagged, so the page never holds the same id twice.
 */
export function DiagramViewer({ ids, initialId, onClose }: DiagramViewerProps) {
  const titleId = useId();
  const scheme = useColorScheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [currentId, setCurrentId] = useState(initialId);
  const [view, setView] = useState<View | null>(null);
  const diagram = DIAGRAMS.get(currentId);
  const key = `${currentId}:${scheme}`;

  // Opens the modal. Removing the element later (unmount) also leaves the modal state.
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  useEffect(() => {
    if (!diagram) return;
    let cancelled = false;
    renderDiagram(diagram, scheme).then(
      (rendered) => {
        if (cancelled) return;
        const svg = retagSvgIds(rendered.svg, rendered.elementId, `viewer-${rendered.elementId}`);
        const natural = parseViewBox(svg);
        const host = content.current;
        const area = stage.current;
        if (!host || !area) return;
        if (!natural) {
          setView({
            key,
            natural: NO_SIZE,
            transform: IDENTITY,
            minZoom: MIN_ZOOM,
            error: 'El dibujo no declara su tamaño.',
          });
          return;
        }
        host.innerHTML = svg;
        const element = host.querySelector('svg');
        if (element) {
          // Natural size in pixels: the transform scales it, not the container.
          element.style.maxWidth = 'none';
          element.setAttribute('width', String(natural.width));
          element.setAttribute('height', String(natural.height));
        }
        const viewport = { width: area.clientWidth, height: area.clientHeight };
        const fitted = fit(natural, viewport);
        setView({ key, natural, transform: fitted, minZoom: zoomFloor(fitted), error: null });
      },
      (error: unknown) => {
        if (cancelled || error instanceof StaleSchemeError) return;
        setView({
          key,
          natural: NO_SIZE,
          transform: IDENTITY,
          minZoom: MIN_ZOOM,
          error: describeRenderError(error),
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [diagram, scheme, key]);

  // The wheel listener must be non-passive to stop the page behind from scrolling.
  useEffect(() => {
    const area = stage.current;
    if (!area) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = area.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = wheelFactor(event.deltaY, event.deltaMode);
      setView((current) =>
        current
          ? { ...current, transform: zoomAt(current.transform, cursor, factor, current.minZoom) }
          : current,
      );
    };
    area.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      area.removeEventListener('wheel', onWheel);
    };
  }, []);

  const settled = view?.key === key ? view : null;
  const loading = settled === null;
  const error = settled?.error ?? null;
  const transform = view?.transform ?? IDENTITY;
  const index = ids.indexOf(currentId);

  function zoomBy(factor: number) {
    const area = stage.current;
    if (!area) return;
    const centre = centreOf({ width: area.clientWidth, height: area.clientHeight });
    setView((current) =>
      current
        ? { ...current, transform: zoomAt(current.transform, centre, factor, current.minZoom) }
        : current,
    );
  }

  function refit() {
    const area = stage.current;
    if (!area) return;
    const viewport = { width: area.clientWidth, height: area.clientHeight };
    setView((current) => {
      if (!current) return current;
      const fitted = fit(current.natural, viewport);
      return { ...current, transform: fitted, minZoom: zoomFloor(fitted) };
    });
  }

  function go(step: 1 | -1) {
    setCurrentId(neighbour(ids, currentId, step));
  }

  function close() {
    dialog.current?.close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case '+':
      case '=':
        zoomBy(KEY_ZOOM_FACTOR);
        break;
      case '-':
      case '_':
        zoomBy(1 / KEY_ZOOM_FACTOR);
        break;
      case '0':
        refit();
        break;
      case 'ArrowRight':
        go(1);
        break;
      case 'ArrowLeft':
        go(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    lastPointer.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const last = lastPointer.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setView((current) =>
      current ? { ...current, transform: panBy(current.transform, dx, dy) } : current,
    );
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    lastPointer.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // A click on the dialog element itself is a click on its backdrop.
  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <dialog
      ref={dialog}
      className="gia-viewer"
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={onDialogClick}
    >
      <header className="gia-viewer__bar">
        <div className="gia-viewer__heading">
          <strong id={titleId} className="gia-viewer__title">
            {diagram?.title ?? `Diagrama inexistente: ${currentId}`}
          </strong>
          {ids.length > 1 && index >= 0 ? (
            <span className="gia-viewer__count">
              {index + 1} de {ids.length}
            </span>
          ) : null}
        </div>
        <div className="gia-viewer__actions">
          <button
            type="button"
            disabled={ids.length < 2}
            onClick={() => {
              go(-1);
            }}
          >
            ← Anterior
          </button>
          <button
            type="button"
            disabled={ids.length < 2}
            onClick={() => {
              go(1);
            }}
          >
            Siguiente →
          </button>
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => {
              zoomBy(1 / KEY_ZOOM_FACTOR);
            }}
          >
            −
          </button>
          <span className="gia-viewer__zoom" aria-live="polite">
            {Math.round(transform.k * 100)} %
          </span>
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => {
              zoomBy(KEY_ZOOM_FACTOR);
            }}
          >
            +
          </button>
          <button type="button" onClick={refit}>
            Ajustar
          </button>
          <button type="button" onClick={close}>
            Cerrar
          </button>
        </div>
      </header>
      <div
        ref={stage}
        className="gia-viewer__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          ref={content}
          className="gia-viewer__content"
          role="img"
          aria-label={diagram?.summary}
          style={{ transform: toCssTransform(transform) }}
          hidden={error !== null}
        />
        {loading ? <p className="gia-viewer__status">Dibujando el diagrama…</p> : null}
        {error === null ? null : (
          <p className="gia-viewer__status" role="alert">
            No se pudo dibujar este diagrama. {error}
          </p>
        )}
      </div>
      <p className="gia-viewer__hint">
        Rueda: acercar · Arrastrar: mover · + − 0: zoom · ← →: otro diagrama · Esc: cerrar
      </p>
    </dialog>
  );
}
