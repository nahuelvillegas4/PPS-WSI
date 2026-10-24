import { useEffect, useState } from 'react';
import type { CurrentUser } from '../auth/authApi';
import {
  type Dataset,
  type ImageItem,
  type Project,
  canManageCatalog,
  createDataset,
  createProject,
  fetchDatasetImages,
  fetchDatasets,
  fetchProjects,
} from './catalogApi';
import { CreateItemModal } from './CreateItemModal';
import { RegisterImagesModal } from './RegisterImagesModal';

interface CatalogPageProps {
  user: CurrentUser;
  onOpenImage: (imageId: number) => void;
  onSignOut: () => Promise<void>;
}

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  admin: 'administrador',
  annotator: 'anotador',
};

export function CatalogPage({ user, onOpenImage, onSignOut }: CatalogPageProps) {
  const isAdmin = canManageCatalog(user.role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger para recargar
  const [projectReloadKey, setProjectReloadKey] = useState(0);
  const [datasetReloadKey, setDatasetReloadKey] = useState(0);
  const [imageReloadKey, setImageReloadKey] = useState(0);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateDataset, setShowCreateDataset] = useState(false);
  const [showRegisterImages, setShowRegisterImages] = useState(false);

  // Carga de proyectos
  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal)
      .then((items) => {
        setProjects(items);
        setLoadingProjects(false);
        setSelectedProjectId((prev) =>
          prev && items.some((p) => p.id === prev) ? prev : (items[0]?.id ?? null),
        );
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setLoadingProjects(false);
        setError('No se pudieron cargar los proyectos desde la API.');
        console.error(caught);
      });
    return () => {
      controller.abort();
    };
  }, [projectReloadKey]);

  // Carga de datasets cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    const controller = new AbortController();
    fetchDatasets(selectedProjectId, controller.signal)
      .then((items) => {
        setDatasets(items);
        setLoadingDatasets(false);
        setSelectedDatasetId((prev) =>
          prev && items.some((d) => d.id === prev) ? prev : (items[0]?.id ?? null),
        );
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setLoadingDatasets(false);
        setError('No se pudieron cargar los datasets del proyecto.');
        console.error(caught);
      });
    return () => {
      controller.abort();
    };
  }, [selectedProjectId, datasetReloadKey]);

  // Carga de imágenes cuando cambia el dataset seleccionado
  useEffect(() => {
    if (!selectedDatasetId) {
      return;
    }
    const controller = new AbortController();
    fetchDatasetImages(selectedDatasetId, 1, 50, controller.signal)
      .then((page) => {
        setImages(page.items);
        setLoadingImages(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setLoadingImages(false);
        setError('No se pudieron cargar las imágenes del dataset.');
        console.error(caught);
      });
    return () => {
      controller.abort();
    };
  }, [selectedDatasetId, imageReloadKey]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="catalog-layout">
      <header className="catalog-navbar">
        <div className="catalog-brand">
          <h1>GIA · Catálogo de Imágenes</h1>
          <span className="brand-subtitle">Plataforma de anotación de imágenes médicas WSI</span>
        </div>

        <div className="session-info">
          <span>
            Sesión de <strong>{user.username}</strong> ({ROLE_LABELS[user.role]})
          </span>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              void onSignOut();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {error && (
        <div className="catalog-alert" role="alert">
          {error}
        </div>
      )}

      <main className="catalog-body">
        {/* Barra superior de proyectos */}
        <section className="catalog-section">
          <div className="section-header">
            <div>
              <h2>Proyectos</h2>
              <span className="section-desc">
                Seleccioná un proyecto de investigación o diagnóstico
              </span>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setShowCreateProject(true);
                }}
              >
                + Nuevo Proyecto
              </button>
            )}
          </div>

          {loadingProjects && <p className="notice">Cargando proyectos…</p>}

          {!loadingProjects && projects.length === 0 && (
            <div className="empty-panel">
              <p>No hay proyectos registrados en la plataforma.</p>
              {isAdmin && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setShowCreateProject(true);
                  }}
                >
                  Crear primer proyecto
                </button>
              )}
            </div>
          )}

          {!loadingProjects && projects.length > 0 && (
            <div className="project-chips">
              {projects.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`chip ${selectedProjectId === p.id ? 'chip-active' : ''}`}
                  onClick={() => {
                    if (selectedProjectId !== p.id) {
                      setLoadingDatasets(true);
                      setDatasets([]);
                      setSelectedDatasetId(null);
                      setImages([]);
                      setSelectedProjectId(p.id);
                    }
                  }}
                >
                  <strong>{p.name}</strong>
                  {p.description && <small>{p.description}</small>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Datasets del proyecto seleccionado */}
        {selectedProjectId && (
          <section className="catalog-section">
            <div className="section-header">
              <div>
                <h2>Datasets de &quot;{selectedProject?.name}&quot;</h2>
                <span className="section-desc">
                  Conjuntos de imágenes agrupadas para etiquetado
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setShowCreateDataset(true);
                  }}
                >
                  + Nuevo Dataset
                </button>
              )}
            </div>

            {loadingDatasets && <p className="notice">Cargando datasets…</p>}

            {!loadingDatasets && datasets.length === 0 && (
              <div className="empty-panel">
                <p>Este proyecto todavía no tiene datasets asociados.</p>
                {isAdmin && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setShowCreateDataset(true);
                    }}
                  >
                    Crear dataset
                  </button>
                )}
              </div>
            )}

            {!loadingDatasets && datasets.length > 0 && (
              <div className="dataset-tabs">
                {datasets.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className={`dataset-tab ${selectedDatasetId === d.id ? 'tab-active' : ''}`}
                    onClick={() => {
                      if (selectedDatasetId !== d.id) {
                        setLoadingImages(true);
                        setImages([]);
                        setSelectedDatasetId(d.id);
                      }
                    }}
                  >
                    <span className="tab-name">{d.name}</span>
                    {d.description && <span className="tab-desc">{d.description}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Galería de imágenes del dataset seleccionado */}
        {selectedDatasetId && selectedDataset && (
          <section className="catalog-section">
            <div className="section-header">
              <div>
                <h2>Imágenes registradas en &quot;{selectedDataset.name}&quot;</h2>
                <span className="section-desc">
                  {images.length === 1
                    ? '1 imagen disponible'
                    : `${images.length} imágenes disponibles`}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="accent-btn"
                  onClick={() => {
                    setShowRegisterImages(true);
                  }}
                >
                  + Registrar imágenes del servidor
                </button>
              )}
            </div>

            {loadingImages && <p className="notice">Cargando imágenes del dataset…</p>}

            {!loadingImages && images.length === 0 && (
              <div className="empty-panel">
                <p>No hay imágenes registradas en este dataset.</p>
                {isAdmin ? (
                  <button
                    type="button"
                    className="accent-btn"
                    onClick={() => {
                      setShowRegisterImages(true);
                    }}
                  >
                    Registrar archivos disponibles en el servidor
                  </button>
                ) : (
                  <p className="text-muted">
                    Un administrador debe registrar imágenes en este dataset para poder anotarlas.
                  </p>
                )}
              </div>
            )}

            {!loadingImages && images.length > 0 && (
              <div className="image-grid">
                {images.map((image) => {
                  const isWsi = image.kind === 'wsi';
                  return (
                    <article key={image.id} className="image-card">
                      <div className="image-card-header">
                        <span className={`badge badge-${image.kind}`}>
                          {isWsi ? 'WSI · SVS' : 'Convencional · PNG/JPG'}
                        </span>
                        <span className="image-id">ID: {image.id}</span>
                      </div>

                      <div className="image-card-body">
                        <h3 className="image-filename" title={image.storageKey}>
                          {image.name}
                        </h3>
                        <dl className="image-meta">
                          <div>
                            <dt>Nivel 0:</dt>
                            <dd>
                              {image.width.toLocaleString()} × {image.height.toLocaleString()} px
                            </dd>
                          </div>
                          {isWsi && (
                            <div>
                              <dt>Pirámide:</dt>
                              <dd>{image.levelCount} niveles</dd>
                            </div>
                          )}
                          <div>
                            <dt>Ruta:</dt>
                            <dd className="meta-storage-key" title={image.storageKey}>
                              {image.storageKey}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="image-card-footer">
                        <button
                          type="button"
                          className="primary open-btn"
                          onClick={() => {
                            onOpenImage(image.id);
                          }}
                        >
                          Abrir en visor →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Modales */}
      {showCreateProject && (
        <CreateItemModal
          title="Nuevo Proyecto"
          nameLabel="Nombre del proyecto"
          onClose={() => {
            setShowCreateProject(false);
          }}
          onSubmit={async (name, description) => {
            const created = await createProject(name, description);
            setSelectedProjectId(created.id);
            setProjectReloadKey((k) => k + 1);
          }}
        />
      )}

      {showCreateDataset && selectedProjectId && (
        <CreateItemModal
          title={`Nuevo Dataset en "${selectedProject?.name ?? ''}"`}
          nameLabel="Nombre del dataset"
          onClose={() => {
            setShowCreateDataset(false);
          }}
          onSubmit={async (name, description) => {
            const created = await createDataset(selectedProjectId, name, description);
            setSelectedDatasetId(created.id);
            setDatasetReloadKey((k) => k + 1);
          }}
        />
      )}

      {showRegisterImages && selectedDatasetId && (
        <RegisterImagesModal
          datasetId={selectedDatasetId}
          datasetName={selectedDataset?.name ?? ''}
          onClose={() => {
            setShowRegisterImages(false);
          }}
          onRegistered={() => {
            setLoadingImages(true);
            setImageReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
