import { useEffect, useId, useMemo, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { formatBytes } from '../../shared/format';
import { ACCEPT_ATTRIBUTE, type RejectedFile } from './fileFilter';
import { uploadImage } from './uploadApi';
import { createUploadQueue, type UploadItem } from './uploadQueue';
import './UploadImagesModal.css';

interface UploadImagesModalProps {
  datasetId: number;
  datasetName: string;
  onClose: () => void;
  /** Called once when an upload run ends with at least one file registered. */
  onUploaded: () => void;
}

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case 'queued':
      return 'En cola';
    case 'uploading':
      return item.progress >= 100 ? 'Procesando en el servidor…' : `Subiendo… ${item.progress}%`;
    case 'done':
      return 'Subida completa';
    case 'failed':
      return 'Falló';
    case 'cancelled':
      return 'Cancelada';
  }
}

/**
 * Uploads images from the person's computer to a dataset, one file at a time.
 *
 * The queue starts from the "Subir" click, never from an effect; the only effect aborts what is
 * still in flight when the modal goes away. `datasetId` must not change while the modal is open.
 */
export function UploadImagesModal({
  datasetId,
  datasetName,
  onClose,
  onUploaded,
}: UploadImagesModalProps) {
  const titleId = useId();
  const queue = useMemo(
    () => createUploadQueue((file, handlers) => uploadImage(datasetId, file, handlers)),
    [datasetId],
  );
  const { items, running } = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const [rejected, setRejected] = useState<readonly RejectedFile<File>[]>([]);

  useEffect(
    () => () => {
      queue.cancelAll();
    },
    [queue],
  );

  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const doneCount = items.filter((item) => item.status === 'done').length;

  function handlePick(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const picked = Array.from(input.files ?? []);
    // Clear the input so choosing the same file again fires another change event.
    input.value = '';
    setRejected(queue.add(picked));
  }

  function handleUpload(): void {
    setRejected([]);
    void queue.start().then(({ succeeded }) => {
      if (succeeded > 0) onUploaded();
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal-content">
        <header className="modal-header">
          <h2 id={titleId}>Subir imágenes a &quot;{datasetName}&quot;</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            disabled={running}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <p className="modal-subtitle">
          Elegí archivos <code>.svs</code>, <code>.png</code>, <code>.jpg</code> o{' '}
          <code>.jpeg</code> de tu computadora. Se suben de a uno y quedan registrados en el
          dataset.
        </p>

        <label className="form-field">
          Archivos
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            disabled={running}
            onChange={handlePick}
          />
        </label>

        {rejected.length > 0 && (
          <div className="modal-error" role="alert">
            <ul className="upload-rejected">
              {rejected.map(({ file, reason }, index) => (
                <li key={`${file.name}-${index}`}>
                  <strong>{file.name}</strong>: {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 ? (
          <p className="empty-notice">Todavía no elegiste archivos.</p>
        ) : (
          <ul className="upload-list">
            {items.map((item) => (
              <li key={item.id} className={`upload-row upload-row-${item.status}`}>
                <div className="upload-row-head">
                  <span className="upload-name" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="upload-size">{formatBytes(item.file.size)}</span>
                </div>
                <progress
                  className="upload-progress"
                  max={100}
                  value={item.progress}
                  aria-label={`Progreso de ${item.file.name}`}
                />
                <span className="upload-status">{statusLabel(item)}</span>
                {item.error && (
                  <p className="upload-row-error" role="alert">
                    {item.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {!running && doneCount > 0 && queuedCount === 0 && (
          <p className="upload-summary" role="status">
            {doneCount === 1
              ? 'Se subió 1 archivo.'
              : `Se subieron ${doneCount} de ${items.length} archivos.`}
          </p>
        )}

        <footer className="modal-footer">
          <button type="button" onClick={onClose} disabled={running}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              queue.cancelAll();
            }}
            disabled={!running}
          >
            Cancelar subida
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleUpload}
            disabled={running || queuedCount === 0}
          >
            Subir
          </button>
        </footer>
      </div>
    </div>
  );
}
