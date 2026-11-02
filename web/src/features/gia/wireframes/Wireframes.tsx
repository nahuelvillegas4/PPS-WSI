export interface WireframeProps {
  id: 'editor' | 'import' | 'export' | 'classes';
}

/** Stub from unit U0: unit U7 draws the proposed screens. Props are the contract with the renderer. */
export function Wireframe({ id }: WireframeProps) {
  return <p>Boceto pendiente: {id}</p>;
}
