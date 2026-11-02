import { useEffect, useRef } from 'react';
import { Legend } from '../render/Legend';
import { KEY_HELP, displayKey } from './sectionNav';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  /** Whether the single-character shortcuts (j, k, f, n, p, ?) are on. */
  characterKeys: boolean;
  onCharacterKeysChange: (enabled: boolean) => void;
}

/** Keyboard help (`?`). A native modal dialog: Escape closes it and focus stays inside. */
export function HelpDialog({
  open,
  onClose,
  characterKeys,
  onCharacterKeysChange,
}: HelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="gia-help"
      aria-labelledby="gia-help-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="gia-help-body">
        <h2 id="gia-help-title">Atajos de teclado</h2>
        <table className="gia-help-keys">
          <caption className="gia-sr">Teclas de la guía</caption>
          <tbody>
            {KEY_HELP.map((entry) => (
              <tr key={entry.action}>
                <th scope="row">
                  {entry.keys.map((key) => (
                    <kbd key={key}>{displayKey(key)}</kbd>
                  ))}
                </th>
                <td>{entry.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="gia-help-note">
          Las teclas recorren las paradas; dentro de los anexos recorren los anexos. En una barra de
          pestañas, las flechas cambian de pestaña. En modo presentación se ocultan el índice, las
          notas y el detalle.
        </p>
        <label className="gia-help-toggle">
          <input
            type="checkbox"
            checked={characterKeys}
            onChange={(event) => {
              onCharacterKeysChange(event.target.checked);
            }}
          />
          Atajos de una sola tecla (j, k, f, n, p, ?)
        </label>
        <Legend />
        <div className="gia-help-actions">
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
}
