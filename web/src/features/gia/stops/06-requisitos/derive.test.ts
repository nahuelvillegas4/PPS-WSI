import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from '../../data/requirements';
import { FEATURES } from '../../model/features';
import type { ReqState } from '../../model/status';
import type { Block, GapTheme, Requirement } from '../../model/types';
import {
  REQ_STATE_LABEL,
  THEME_NOTE,
  THEME_ORDER,
  THEME_TITLE,
  buildBars,
  buildGapCards,
  buildHeadline,
  buildWaffle,
  pendingCount,
  stateCounts,
  summarizeThemes,
} from './derive';

function req(id: string, pps: 1 | 2, state: ReqState, theme?: GapTheme): Requirement {
  return {
    id,
    pps,
    text: `Requisito ${id}`,
    state,
    evidence: 'compose.yaml',
    ...(theme ? { theme } : {}),
  };
}

const SAMPLE: readonly Requirement[] = [
  req('P1-a', 1, 'partial', 'editor'),
  req('P1-b', 1, 'implemented'),
  req('P1-c', 1, 'not-started', 'editor'),
  req('P1-d', 1, 'planned', 'servidor'),
  req('P2-a', 2, 'implemented'),
  req('P2-b', 2, 'partial', 'pantallas'),
  req('P2-c', 2, 'partial', 'editor'),
];

function block<K extends Block['kind']>(value: Block, kind: K): Extract<Block, { kind: K }> {
  if (value.kind !== kind) throw new Error(`Expected a ${kind} block, got ${value.kind}`);
  return value as Extract<Block, { kind: K }>;
}

describe('stateCounts', () => {
  it('counts each state and treats planned plus not started as pending', () => {
    const counts = stateCounts(SAMPLE);
    expect(counts).toEqual({ implemented: 2, partial: 3, planned: 1, notStarted: 1 });
    expect(pendingCount(counts)).toBe(2);
  });

  it('returns zeros for no rows', () => {
    expect(stateCounts([])).toEqual({ implemented: 0, partial: 0, planned: 0, notStarted: 0 });
  });
});

describe('buildHeadline', () => {
  it('reads the numbers from the rows', () => {
    expect(buildHeadline(SAMPLE)).toBe(
      'De 7 requisitos de las dos PPS: 2 cumplidos, 3 parciales y 2 pendientes.',
    );
  });

  it('is the 39 / 35 / 5 headline of the walk-through for the real data, within 90 characters', () => {
    const headline = buildHeadline(REQUIREMENTS);
    expect(headline).toBe(
      'De 79 requisitos de las dos PPS: 39 cumplidos, 35 parciales y 5 pendientes.',
    );
    expect(headline.length).toBeLessThanOrEqual(90);
  });
});

describe('buildWaffle', () => {
  const waffle = block(buildWaffle(SAMPLE), 'waffle');

  it('makes one group per PPS with one cell per requirement', () => {
    expect(waffle.groups.map((group) => [group.label, group.cells.length])).toEqual([
      ['PPS 1', 4],
      ['PPS 2', 3],
    ]);
  });

  it('lays out built cells first, then partial, then pending', () => {
    const first = waffle.groups[0];
    expect(first?.cells.map((cell) => cell.status)).toEqual([
      'done',
      'partial',
      'planned',
      'planned',
    ]);
  });

  it('names the requirement and its state in the tooltip, keeping not started apart', () => {
    const titles = waffle.groups.flatMap((group) => group.cells.map((cell) => cell.title));
    expect(titles).toContain(`P1-c · ${REQ_STATE_LABEL['not-started']} · Requisito P1-c`);
    expect(titles).toContain(`P1-d · ${REQ_STATE_LABEL.planned} · Requisito P1-d`);
  });

  it('has 39 squares for PPS 1 and 40 for PPS 2 with the real data', () => {
    const real = block(buildWaffle(REQUIREMENTS), 'waffle');
    expect(real.groups.map((group) => group.cells.length)).toEqual([39, 40]);
  });
});

describe('buildBars', () => {
  it('has a row per PPS and one for both, each segment counted from the rows', () => {
    const bars = block(buildBars(SAMPLE), 'bars');
    expect(bars.rows.map((row) => row.label)).toEqual(['PPS 1', 'PPS 2', 'Ambas PPS']);
    expect(bars.rows[0]?.segments).toEqual([
      { status: 'done', value: 1 },
      { status: 'partial', value: 1 },
      { status: 'planned', value: 2 },
    ]);
    expect(bars.rows[2]?.segments).toEqual([
      { status: 'done', value: 2 },
      { status: 'partial', value: 3 },
      { status: 'planned', value: 2 },
    ]);
  });

  it('drops segments with no requirements', () => {
    const bars = block(buildBars(SAMPLE), 'bars');
    expect(bars.rows[1]?.segments.map((segment) => segment.status)).toEqual(['done', 'partial']);
  });

  it('shows 17 / 19 / 3 for PPS 1 and 22 / 16 / 2 for PPS 2 with the real data', () => {
    const bars = block(buildBars(REQUIREMENTS), 'bars');
    const values = (index: number) => bars.rows[index]?.segments.map((segment) => segment.value);
    expect(values(0)).toEqual([17, 19, 3]);
    expect(values(1)).toEqual([22, 16, 2]);
    expect(values(2)).toEqual([39, 35, 5]);
  });
});

describe('summarizeThemes and buildGapCards', () => {
  it('groups only open requirements by theme, largest group first', () => {
    const summaries = summarizeThemes(SAMPLE);
    expect(summaries.map((summary) => [summary.theme, summary.rows.length])).toEqual([
      ['editor', 3],
      ['pantallas', 1],
      ['servidor', 1],
    ]);
    const editor = summaries[0];
    expect(editor?.partial).toBe(2);
    expect(editor?.pending).toBe(1);
  });

  it('keeps the theme order for groups of the same size', () => {
    const tied = [
      req('P1-a', 1, 'partial', 'documentacion'),
      req('P1-b', 1, 'partial', 'servidor'),
    ];
    expect(summarizeThemes(tied).map((summary) => summary.theme)).toEqual([
      'servidor',
      'documentacion',
    ]);
  });

  it('builds one card per theme with the counts in the body and the ids as chips', () => {
    const cards = block(buildGapCards(SAMPLE), 'cards');
    const editor = cards.items[0];
    expect(editor?.title).toBe(THEME_TITLE.editor);
    expect(editor?.body).toContain('3 requisitos abiertos (2 parciales, 1 pendientes).');
    expect(editor?.chips).toEqual(['P1-a', 'P1-c', 'P2-c']);
  });

  it('marks a theme as planned only when none of its requirements exists in part', () => {
    const cards = block(buildGapCards(SAMPLE), 'cards');
    const byTitle = new Map(cards.items.map((item) => [item.title, item.status]));
    expect(byTitle.get(THEME_TITLE.editor)).toBe('partial');
    expect(byTitle.get(THEME_TITLE.servidor)).toBe('planned');
  });

  it('accounts for the 40 open requirements of the real data across eight themes', () => {
    const summaries = summarizeThemes(REQUIREMENTS);
    expect(summaries).toHaveLength(8);
    expect(summaries.reduce((sum, summary) => sum + summary.rows.length, 0)).toBe(40);
    expect(summaries.map((summary) => [summary.theme, summary.rows.length])).toEqual([
      ['editor', 15],
      ['pantallas', 6],
      ['servidor', 4],
      ['datos-de-prueba', 4],
      ['documentacion', 4],
      ['alcance', 3],
      ['ci-calidad', 2],
      ['informe', 2],
    ]);
  });
});

describe('theme notes', () => {
  it('has a title and a sentence for every theme', () => {
    for (const theme of THEME_ORDER) {
      expect(THEME_TITLE[theme].trim(), theme).not.toBe('');
      expect(THEME_NOTE[theme].trim(), theme).not.toBe('');
    }
  });

  it('reads what is missing from the tripwire entries, which are still planned today', () => {
    // If one of these is built, features.test.ts fails first; this keeps the sentences honest.
    for (const id of [
      'editor',
      'classesScreen',
      'importScreen',
      'exportScreen',
      'composeServer',
      'smoke',
      'backup',
      'ci',
      'codeowners',
    ] as const) {
      expect(FEATURES[id].status, id).not.toBe('done');
    }
    expect(THEME_NOTE.pantallas).toContain('pantalla de clases');
    expect(THEME_NOTE.pantallas).toContain('pantalla de exportación');
    expect(THEME_NOTE.editor).toBe(FEATURES.editor.gap);
  });
});
