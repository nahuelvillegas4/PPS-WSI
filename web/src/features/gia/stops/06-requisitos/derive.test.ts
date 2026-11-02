import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from '../../data/requirements';
import { FEATURES } from '../../model/features';
import type { ReqState } from '../../model/status';
import type { Block, GapTheme, Requirement } from '../../model/types';
import {
  PENDING_LABELS,
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
      'De 7 requisitos (desglose propio): 2 cumplidos, 3 parciales y 2 pendientes.',
    );
  });

  it('is the 37 / 39 / 3 headline of the walk-through for the real data, within 90 characters', () => {
    const headline = buildHeadline(REQUIREMENTS);
    expect(headline).toBe(
      'De 79 requisitos (desglose propio): 37 cumplidos, 39 parciales y 3 pendientes.',
    );
    expect(headline.length).toBeLessThanOrEqual(90);
  });

  it('does not say the 79 are requirements numbered by the two statements', () => {
    expect(buildHeadline(REQUIREMENTS)).not.toContain('de las dos PPS');
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

  it('names the planned squares "pendiente" in the captions, as the headline does', () => {
    expect(waffle.statusLabels).toBe(PENDING_LABELS);
    expect(PENDING_LABELS.planned).toEqual({ singular: 'pendiente', plural: 'pendientes' });
    // Only the status that holds planned and not started requirements is renamed.
    expect(Object.keys(PENDING_LABELS)).toEqual(['planned']);
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

  it('shows 16 / 21 / 2 for PPS 1 and 21 / 18 / 1 for PPS 2 with the real data', () => {
    const bars = block(buildBars(REQUIREMENTS), 'bars');
    const values = (index: number) => bars.rows[index]?.segments.map((segment) => segment.value);
    expect(values(0)).toEqual([16, 21, 2]);
    expect(values(1)).toEqual([21, 18, 1]);
    expect(values(2)).toEqual([37, 39, 3]);
  });

  it('names the planned segment "pendiente" like the waffle, so the bars agree with the headline', () => {
    const bars = block(buildBars(REQUIREMENTS), 'bars');
    expect(bars.statusLabels).toBe(PENDING_LABELS);
    const total = bars.rows[2]?.segments.find((segment) => segment.status === 'planned');
    expect(total?.value).toBe(pendingCount(stateCounts(REQUIREMENTS)));
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
    expect(editor?.body).toContain('3 requisitos abiertos (2 parciales, 1 pendiente).');
    expect(editor?.chips).toEqual(['P1-a', 'P1-c', 'P2-c']);
  });

  it('marks a theme as planned only when none of it exists in part and something is planned', () => {
    const cards = block(buildGapCards(SAMPLE), 'cards');
    const byTitle = new Map(cards.items.map((item) => [item.title, item.status]));
    expect(byTitle.get(THEME_TITLE.editor)).toBe('partial');
    expect(byTitle.get(THEME_TITLE.servidor)).toBe('planned');
  });

  it('gives a theme whose requirements are all not started no state: nothing is planned there', () => {
    const rows = [
      req('P1-a', 1, 'not-started', 'informe'),
      req('P2-a', 2, 'not-started', 'informe'),
    ];
    const [card] = block(buildGapCards(rows), 'cards').items;
    expect(card?.status).toBeUndefined();
    expect(card?.body).toContain('2 requisitos abiertos (0 parciales, 2 pendientes).');
    const real = block(buildGapCards(REQUIREMENTS), 'cards');
    const informe = real.items.find((item) => item.title === THEME_TITLE.informe);
    expect(informe?.status).toBeUndefined();
  });

  it('accounts for the 42 open requirements of the real data across eight themes', () => {
    const summaries = summarizeThemes(REQUIREMENTS);
    expect(summaries).toHaveLength(8);
    expect(summaries.reduce((sum, summary) => sum + summary.rows.length, 0)).toBe(42);
    expect(summaries.map((summary) => [summary.theme, summary.rows.length])).toEqual([
      ['editor', 15],
      ['pantallas', 6],
      ['datos-de-prueba', 5],
      ['documentacion', 5],
      ['servidor', 4],
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

  it('says the command of the API tests is undocumented, as the requirements rows do', () => {
    expect(THEME_NOTE.documentacion).toContain('el comando de pruebas de la API');
  });
});
