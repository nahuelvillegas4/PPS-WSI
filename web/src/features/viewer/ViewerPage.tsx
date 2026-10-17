import { useEffect, useRef, useState } from 'react';
import type { Point, Size } from './ImageViewer';
import { OsdImageViewer } from './OsdImageViewer';
import { tileSourceUrl } from './tileSource';

type Status = { kind: 'opening' } | { kind: 'ready' } | { kind: 'failed'; message: string };

/** Failed tiles within the last 5 seconds before the user is warned. */
const TILE_FAILURE_THRESHOLD = 5;

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

interface ViewerPageProps {
  imageId: number;
  onBack: () => void;
}

export function ViewerPage({ imageId, onBack }: ViewerPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OsdImageViewer | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'opening' });
  const [size, setSize] = useState<Size | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [tileFailures, setTileFailures] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const viewer = new OsdImageViewer({ element, imageId, tileSourceUrl: tileSourceUrl(imageId) });
    viewerRef.current = viewer;
    let active = true;

    viewer.ready.then(
      () => {
        if (!active) return;
        setSize(viewer.level0Size);
        setScale(viewer.level0PerScreenPx());
        setStatus({ kind: 'ready' });
      },
      (error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Error desconocido';
        setStatus({ kind: 'failed', message });
      },
    );
    const stopViewChanges = viewer.onViewChange(() => {
      setScale(viewer.level0PerScreenPx());
    });
    const stopTileErrors = viewer.onTileError(setTileFailures);

    return () => {
      active = false;
      stopViewChanges();
      stopTileErrors();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [imageId]);

  function trackCursor(event: React.PointerEvent<HTMLDivElement>): void {
    const viewer = viewerRef.current;
    if (!viewer || status.kind !== 'ready') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor(viewer.toLevel0({ x: event.clientX - rect.left, y: event.clientY - rect.top }));
  }

  return (
    <div className="viewer-page">
      <header className="toolbar">
        <button type="button" onClick={onBack}>
          ← Volver
        </button>
        <h1>Imagen {imageId}</h1>
        <div className="toolbar-actions">
          <button type="button" onClick={() => viewerRef.current?.zoomBy(1.5)}>
            Acercar
          </button>
          <button type="button" onClick={() => viewerRef.current?.zoomBy(1 / 1.5)}>
            Alejar
          </button>
          <button type="button" onClick={() => viewerRef.current?.goHome()}>
            Ver completa
          </button>
        </div>
      </header>

      <div
        className="viewer-stage"
        onPointerMove={trackCursor}
        onPointerLeave={() => {
          setCursor(null);
        }}
      >
        <div ref={containerRef} className="viewer-canvas" />

        {status.kind === 'opening' && <p className="notice">Abriendo la imagen…</p>}
        {status.kind === 'failed' && (
          <div className="notice notice-error" role="alert">
            <strong>No se pudo abrir la imagen.</strong>
            <span>{status.message}</span>
            <span>
              Verificá que la imagen exista, que tengas sesión iniciada y que el servicio de teselas
              esté en funcionamiento.
            </span>
          </div>
        )}
        {status.kind === 'ready' && tileFailures >= TILE_FAILURE_THRESHOLD && (
          <div className="notice notice-warning" role="status">
            Visualización no disponible: varias teselas no cargan. Reintentá en unos segundos.
          </div>
        )}

        {status.kind === 'ready' && size && (
          <dl className="hud" aria-label="Información de la imagen">
            <div>
              <dt>Tamaño (nivel 0)</dt>
              <dd>
                {number.format(size.width)} × {number.format(size.height)} px
              </dd>
            </div>
            <div>
              <dt>Escala</dt>
              <dd>
                {scale === null ? '—' : `1 px de pantalla = ${number.format(scale)} px de nivel 0`}
              </dd>
            </div>
            <div>
              <dt>Cursor (nivel 0)</dt>
              <dd>
                {cursor ? `x ${number.format(cursor.x)} · y ${number.format(cursor.y)}` : '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
