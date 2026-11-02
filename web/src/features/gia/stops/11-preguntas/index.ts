/**
 * Stop 11, "Preguntas": the closing slide of the talk. Exactly five numbered cards, one per
 * decision the team needs from the supervision, each saying what it blocks.
 */
import type { Section, StopContent } from '../../model/types';
import { QUESTIONS } from './questions';

const section: Section = {
  id: 'preguntas',
  group: 'recorrido',
  title: 'Preguntas',
  headline: 'Cinco decisiones que necesitamos de la supervisión.',
  minutes: 1,
  tabs: [
    {
      id: 'preguntas',
      label: 'Las cinco preguntas',
      blocks: [
        {
          kind: 'cards',
          items: QUESTIONS.map((question) => ({
            title: `Pregunta ${question.n}`,
            body: question.text,
            status: question.status,
            chips: question.refs,
          })),
        },
      ],
    },
  ],
  notes: [
    'Esto es lo que necesitamos de ustedes.',
    'Ninguna de las cinco tiene una respuesta registrada en el repositorio.',
    'Cada tarjeta dice qué queda bloqueado hasta tener la respuesta.',
  ],
};

export const content: StopContent = { section, diagrams: [], tables: [] };
