import { paragraphs } from '../nav/sectionIndex';

type Tone = 'info' | 'warning' | 'honest';

const TONE_LABELS: Readonly<Record<Tone, string>> = {
  info: 'Nota',
  warning: 'Atención',
  honest: 'Estado real',
};

interface CalloutProps {
  tone: Tone;
  title?: string;
  text: string;
}

/** A highlighted note. The tone shows as a label as well as a style, never as colour alone. */
export function Callout({ tone, title, text }: CalloutProps) {
  return (
    <aside className={`gia-callout gia-callout--${tone}`}>
      <p className="gia-callout-tone">{TONE_LABELS[tone]}</p>
      {title && <p className="gia-callout-title">{title}</p>}
      {paragraphs(text).map((paragraph, index) => (
        <p key={index} className="gia-callout-text">
          {paragraph}
        </p>
      ))}
    </aside>
  );
}
