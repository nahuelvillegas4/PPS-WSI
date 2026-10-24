import { useEffect, useState } from 'react';
import { ApiError } from '../../shared/api';
import { fetchStorageFiles, registerImagesInDataset, type StorageFile } from './catalogApi';

interface RegisterImagesModalProps {
  datasetId: number;
  datasetName: string;
  onClose: () => void;
  onRegistered: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RegisterImagesModal({
  datasetId,
  datasetName,
  onClose,
  onRegistered,
}: RegisterImagesModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStorageFiles(undefined, controller.signal)
      .then((items) => {
        setFiles(items);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(
          caught instanceof ApiError && caught.status === 403
            ? 'Solo administradores pueden explorar el almacenamiento del servidor.'
            : 'No se pudo listar los archivos del almacenamiento del servidor.',
        );
      });
    return () => {
      controller.abort();
    };
  }, []);

  function toggleFile(key: string): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleRegister(): Promise<void> {
    if (selectedKeys.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerImagesInDataset(datasetId, Array.from(selectedKeys));
      onRegistered();
      onClose();
    } catch (caught: unknown) {
      setSubmitting(false);
      if (caught instanceof ApiError) {
        setError(caught.problem?.detail ?? `Error al registrar imágenes (HTTP ${caught.status})`);
      } else {
        setError('Ocurrió un error inesperado al registrar las imágenes.');
      }
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content">
        <header className="modal-header">
          <h2 id="modal-title">Registrar imágenes en &quot;{datasetName}&quot;</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <p className="modal-subtitle">
          Archivos encontrados en el volumen del servidor (<code>/data/images</code>). La API
          inspeccionará sus dimensiones y niveles con el servicio de teselas.
        </p>

        {loading && <p className="notice">Cargando archivos del servidor…</p>}
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

        {!loading && files.length === 0 && (
          <p className="empty-notice">
            No se encontraron archivos en <code>/data/images</code>. Colocá archivos{' '}
            <code>.svs</code>, <code>.png</code> o <code>.jpg</code> en esa carpeta del servidor.
          </p>
        )}

        {!loading && files.length > 0 && (
          <div className="storage-file-list">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}></th>
                  <th>Archivo (Storage Key)</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const alreadyInDataset = file.registeredInDatasets.includes(datasetId);
                  const isChecked = selectedKeys.has(file.storageKey);
                  return (
                    <tr
                      key={file.storageKey}
                      className={alreadyInDataset ? 'row-disabled' : undefined}
                    >
                      <td>
                        <input
                          type="checkbox"
                          disabled={alreadyInDataset || submitting}
                          checked={isChecked}
                          onChange={() => {
                            toggleFile(file.storageKey);
                          }}
                        />
                      </td>
                      <td>
                        <strong>{file.storageKey}</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${file.kind}`}>
                          {file.kind === 'wsi'
                            ? 'WSI (SVS)'
                            : file.kind === 'conventional'
                              ? 'JPG/PNG'
                              : file.kind}
                        </span>
                      </td>
                      <td>{formatBytes(file.sizeBytes)}</td>
                      <td>
                        {alreadyInDataset ? (
                          <span className="text-muted">Ya registrado</span>
                        ) : file.registeredInDatasets.length > 0 ? (
                          <span className="text-muted">En otros datasets</span>
                        ) : (
                          <span className="text-accent">Disponible</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="modal-footer">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              void handleRegister();
            }}
            disabled={selectedKeys.size === 0 || submitting}
          >
            {submitting
              ? 'Inspeccionando y registrando…'
              : `Registrar seleccionadas (${selectedKeys.size})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
