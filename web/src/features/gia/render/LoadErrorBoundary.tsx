import { Component, type ReactNode } from 'react';

/** What the reader sees when the guide (or its lazy chunk) failed and nothing else can be drawn. */
export const LOAD_ERROR_MESSAGE =
  'No se pudo cargar la guía. Recargue la página para volver a intentarlo.';

interface FallbackProps {
  onBack: () => void;
}

/** The message with the two ways out: reload, or go back to the catalogue. */
export function LoadErrorFallback({ onBack }: FallbackProps) {
  return (
    <div className="app-status" role="alert">
      <p>{LOAD_ERROR_MESSAGE}</p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
      >
        Recargar
      </button>{' '}
      <button type="button" onClick={onBack}>
        Volver al catálogo
      </button>
    </div>
  );
}

interface BoundaryProps extends FallbackProps {
  children?: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/**
 * Catches a failure while loading or drawing its children. It goes around the `Suspense` of the
 * lazily loaded guide: a chunk that fails to load (for example a tab opened before a redeploy,
 * asking for an old hashed file) otherwise unmounts the whole app to a blank page.
 */
export class LoadErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override render(): ReactNode {
    if (this.state.failed) return <LoadErrorFallback onBack={this.props.onBack} />;
    return this.props.children;
  }
}
