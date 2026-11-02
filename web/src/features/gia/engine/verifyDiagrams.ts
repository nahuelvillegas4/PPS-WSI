/**
 * Pure runner behind the "Verificar diagramas" button: draws every diagram one after another with
 * the function it is given and collects the failures. No network, no DOM of its own.
 */
import { inspectSvg, renderErrorMessage } from './svgTools';

export interface VerifyFailure {
  id: string;
  message: string;
}

export interface VerifySummary {
  total: number;
  passed: number;
  failures: readonly VerifyFailure[];
}

/** Draws each id in order. `draw` resolves to the SVG string and rejects when Mermaid fails. */
export async function verifyDiagrams(
  ids: readonly string[],
  draw: (id: string) => Promise<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<VerifySummary> {
  const failures: VerifyFailure[] = [];
  let done = 0;
  for (const id of ids) {
    try {
      const problem = inspectSvg(await draw(id));
      if (problem) failures.push({ id, message: problem });
    } catch (error) {
      failures.push({ id, message: renderErrorMessage(error) });
    }
    done += 1;
    onProgress?.(done, ids.length);
  }
  return { total: ids.length, passed: ids.length - failures.length, failures };
}

/** The line shown once a run finishes: `N de M diagramas correctos`. */
export function summaryLine(summary: VerifySummary): string {
  return `${String(summary.passed)} de ${String(summary.total)} diagramas correctos`;
}
