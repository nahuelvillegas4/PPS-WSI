// @vitest-environment jsdom
// The last test mounts a real React tree to see the boundary catch a lazy chunk that fails.
import { Suspense, act, createElement, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LOAD_ERROR_MESSAGE, LoadErrorBoundary, LoadErrorFallback } from './LoadErrorBoundary';

describe('LoadErrorFallback', () => {
  const html = renderToStaticMarkup(createElement(LoadErrorFallback, { onBack: () => undefined }));

  it('is an alert with a Spanish message and no technical detail', () => {
    expect(html).toContain('role="alert"');
    expect(html).toContain(LOAD_ERROR_MESSAGE);
    expect(html).not.toMatch(/https?:|\.js|Failed to fetch/);
  });

  it('offers a way to reload and a way back to the catalogue', () => {
    expect(html).toContain('>Recargar<');
    expect(html).toContain('>Volver al catálogo<');
  });
});

describe('LoadErrorBoundary', () => {
  it('renders its children while nothing fails', () => {
    const html = renderToStaticMarkup(
      createElement(
        LoadErrorBoundary,
        { onBack: () => undefined },
        createElement('p', null, 'contenido'),
      ),
    );
    expect(html).toBe('<p>contenido</p>');
  });

  it('turns a failure into the fallback state', () => {
    expect(LoadErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });
});

describe('LoadErrorBoundary around a lazy chunk', () => {
  it('shows the fallback instead of a blank page when the chunk fails to load', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Broken = lazy(() =>
      Promise.reject<{ default: () => null }>(
        new TypeError('Failed to fetch dynamically imported module'),
      ),
    );
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          LoadErrorBoundary,
          { onBack: () => undefined },
          createElement(Suspense, { fallback: null }, createElement(Broken)),
        ),
      );
      await Promise.resolve();
    });
    expect(container.textContent).toContain(LOAD_ERROR_MESSAGE);
    expect(container.textContent).not.toContain('Failed to fetch');
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    quiet.mockRestore();
  });
});
