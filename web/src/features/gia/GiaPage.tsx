import { SECTIONS } from './model/registry';

interface GiaPageProps {
  onBack: () => void;
  onNavigate: (target: 'catalog' | 'users') => void;
}

/** Stub from unit U0: unit U1 replaces it with the real page (shell, table of contents, tabs). */
export function GiaPage({ onBack }: GiaPageProps) {
  return (
    <div>
      <button type="button" onClick={onBack}>
        ← Volver
      </button>
      <h1>Guía del sistema</h1>
      <ol>
        {SECTIONS.map((section) => (
          <li key={section.id}>{section.title}</li>
        ))}
      </ol>
    </div>
  );
}
