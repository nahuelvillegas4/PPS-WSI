import { type SyntheticEvent, useState } from 'react';
import { ApiError } from '../../shared/api';

interface CreateItemModalProps {
  title: string;
  nameLabel: string;
  onClose: () => void;
  onSubmit: (name: string, description: string | null) => Promise<void>;
}

export function CreateItemModal({ title, nameLabel, onClose, onSubmit }: CreateItemModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim(), description.trim() === '' ? null : description.trim());
      onClose();
    } catch (caught: unknown) {
      setSubmitting(false);
      if (caught instanceof ApiError) {
        setError(caught.problem?.detail ?? `Error HTTP ${caught.status}`);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <div className="modal-content modal-content-sm">
        <header className="modal-header">
          <h2 id="create-title">{title}</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="form-field">
            {nameLabel}
            <input
              autoFocus
              required
              maxLength={120}
              value={name}
              disabled={submitting}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </label>

          <label className="form-field">
            Descripción (opcional)
            <textarea
              rows={3}
              maxLength={2000}
              value={description}
              disabled={submitting}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
            />
          </label>

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}

          <footer className="modal-footer">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={!canSubmit}>
              {submitting ? 'Guardando…' : 'Crear'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
