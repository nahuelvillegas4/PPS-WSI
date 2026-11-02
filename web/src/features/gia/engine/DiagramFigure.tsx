import { useEffect, useRef, useState } from 'react';
import { DIAGRAMS, SECTIONS } from '../model/registry';
import type { DiagramDef } from '../model/types';
import { DiagramViewer } from './DiagramViewer';
import { siblingDiagramIds } from './diagramSiblings';
import { StaleSchemeError, renderDiagram } from './renderDiagram';
import { renderErrorMessage } from './svgTools';
import { useColorScheme } from './useColorScheme';
import './diagram.css';

interface DiagramFigureProps {
  id: string;
}

/** How the last draw of one `id:scheme` ended; `error` is null when it worked. */
interface Outcome {
  key: string;
  error: string | null;
}

/**
 * A diagram of the guide: Mermaid draws it lazily, in the colours of the current scheme, and it
 * is drawn again when the scheme changes. A failure shows an error card with the source and a
 * "Reintentar" button, never a blank box. The sanitised SVG is injected from the effect, not
 * during render.
 */
export function DiagramFigure({ id }: DiagramFigureProps) {
  const diagram = DIAGRAMS.get(id);
  if (!diagram) return <p role="alert">Diagrama inexistente: {id}</p>;
  return <Figure diagram={diagram} />;
}

function Figure({ diagram }: { diagram: DiagramDef }) {
  const scheme = useColorScheme();
  const host = useRef<HTMLDivElement>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  /** Bumped by "Reintentar": it re-runs the draw effect, which asks the queue again. */
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const key = `${diagram.id}:${scheme}`;

  useEffect(() => {
    let cancelled = false;
    renderDiagram(diagram, scheme).then(
      (rendered) => {
        if (cancelled) return;
        if (host.current) host.current.innerHTML = rendered.svg;
        setOutcome({ key, error: null });
        setRetrying(false);
      },
      (error: unknown) => {
        // A scheme change re-runs this effect, which draws again with the new palette.
        if (cancelled || error instanceof StaleSchemeError) return;
        setOutcome({ key, error: renderErrorMessage(error) });
        setRetrying(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [diagram, scheme, key, attempt]);

  const settled = outcome?.key === key ? outcome : null;
  const error = settled?.error ?? null;
  const loading = settled === null;
  const className = [
    'gia-diagram',
    loading && 'gia-diagram--loading',
    error && 'gia-diagram--error',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <figure className={className} data-diagram={diagram.id}>
      <figcaption className="gia-diagram__caption">
        <strong className="gia-diagram__title">{diagram.title}</strong>
        {diagram.caption ? <span className="gia-diagram__note">{diagram.caption}</span> : null}
      </figcaption>
      <div
        ref={host}
        className="gia-diagram__canvas"
        role="img"
        aria-label={diagram.summary}
        aria-busy={loading}
        hidden={error !== null}
      />
      {loading ? <p className="gia-diagram__status">Dibujando el diagrama…</p> : null}
      {error === null ? null : (
        <div className="gia-diagram__error" role="alert">
          <p>
            <strong>No se pudo dibujar este diagrama.</strong> {error}
          </p>
          <button
            type="button"
            className="gia-diagram__retry"
            aria-disabled={retrying}
            onClick={() => {
              if (retrying) return;
              setRetrying(true);
              setAttempt((count) => count + 1);
            }}
          >
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </button>
          <pre>{diagram.source}</pre>
        </div>
      )}
      {error === null ? (
        <button
          type="button"
          className="gia-diagram__expand"
          data-gia-fullscreen
          disabled={loading}
          aria-label={`Ver «${diagram.title}» en pantalla completa`}
          onClick={() => {
            setViewerOpen(true);
          }}
        >
          Pantalla completa
        </button>
      ) : null}
      {viewerOpen ? (
        <DiagramViewer
          ids={siblingDiagramIds(SECTIONS, diagram.id)}
          initialId={diagram.id}
          onClose={() => {
            setViewerOpen(false);
          }}
        />
      ) : null}
    </figure>
  );
}
