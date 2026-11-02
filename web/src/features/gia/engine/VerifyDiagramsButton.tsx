import { useState } from 'react';
import { DIAGRAMS } from '../model/registry';
import { renderDiagramFresh } from './renderDiagram';
import { summaryLine, verifyDiagrams, type VerifySummary } from './verifyDiagrams';
import './diagram.css';

type Run =
  | { phase: 'idle' }
  | { phase: 'running'; done: number; total: number }
  | { phase: 'finished'; summary: VerifySummary };

/**
 * Draws every registered diagram through the real Mermaid, with the status styles and the palette
 * of the current scheme, and lists the ones that fail. It needs no network: Mermaid is bundled.
 * The drawings go into a scratch container off screen (Mermaid measures text, so it must be in
 * the document) that is removed when the run ends.
 */
export function VerifyDiagramsButton() {
  const [run, setRun] = useState<Run>({ phase: 'idle' });

  async function verify() {
    const ids = [...DIAGRAMS.keys()];
    const scratch = document.createElement('div');
    scratch.className = 'gia-verify-scratch';
    scratch.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scratch);
    setRun({ phase: 'running', done: 0, total: ids.length });
    try {
      const summary = await verifyDiagrams(
        ids,
        async (id) => {
          const diagram = DIAGRAMS.get(id);
          if (!diagram) throw new Error('Diagrama inexistente.');
          return (await renderDiagramFresh(diagram, scratch)).svg;
        },
        (done, total) => {
          setRun({ phase: 'running', done, total });
        },
      );
      setRun({ phase: 'finished', summary });
    } finally {
      scratch.remove();
    }
  }

  return (
    <div className="gia-verify">
      <button
        type="button"
        className="gia-verify__button"
        disabled={run.phase === 'running'}
        onClick={() => {
          void verify();
        }}
      >
        Verificar diagramas
      </button>
      <div className="gia-verify__result" role="status" aria-live="polite">
        {run.phase === 'running' ? (
          <p>
            Verificando… {run.done} de {run.total}
          </p>
        ) : null}
        {run.phase === 'finished' ? (
          <>
            <p data-state={run.summary.failures.length === 0 ? 'ok' : 'fail'}>
              {summaryLine(run.summary)}
            </p>
            {run.summary.failures.length > 0 ? (
              <ul className="gia-verify__failures">
                {run.summary.failures.map((failure) => (
                  <li key={failure.id}>
                    <code>{failure.id}</code>: {failure.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
