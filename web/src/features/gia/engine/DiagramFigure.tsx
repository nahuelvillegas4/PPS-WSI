import { DIAGRAMS } from '../model/registry';

interface DiagramFigureProps {
  id: string;
}

/** Stub from unit U0: shows the Mermaid source. Unit U2 replaces the body, keeping the props. */
export function DiagramFigure({ id }: DiagramFigureProps) {
  const diagram = DIAGRAMS.get(id);
  if (!diagram) return <p role="alert">Diagrama inexistente: {id}</p>;
  return (
    <figure className="gia-diagram">
      <figcaption>{diagram.title}</figcaption>
      <pre>{diagram.source}</pre>
    </figure>
  );
}
