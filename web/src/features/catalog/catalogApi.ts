import { apiFetch } from '../../shared/api';
import type { ProjectRole } from '../access/access';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  /** Role of the session user in this project (the global admin is `project-admin` in all). */
  myRole: ProjectRole;
}

export interface Dataset {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export type ImageKind = 'wsi' | 'conventional';
export type ImageFormat = 'svs' | 'png' | 'jpeg';

export interface ImageItem {
  id: number;
  datasetId: number;
  storageKey: string;
  name: string;
  kind: ImageKind;
  format: ImageFormat;
  width: number;
  height: number;
  levelCount: number;
  mppX: number | null;
  mppY: number | null;
  tileSourceUrl: string;
  registeredAt: string;
}

export interface ImagePage {
  items: ImageItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StorageFile {
  storageKey: string;
  sizeBytes: number;
  kind: 'wsi' | 'conventional' | 'other';
  registeredInDatasets: number[];
}

interface ListResponse<T> {
  items: T[];
}

/** `GET /api/v1/projects`: proyectos visibles para la sesión (todos para el admin global; el resto, solo sus membresías). */
export async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  const response = await apiFetch('/api/v1/projects', signal ? { signal } : {});
  const data = (await response.json()) as ListResponse<Project>;
  return data.items;
}

/** `POST /api/v1/projects`: crea un nuevo proyecto (solo el administrador global). */
export async function createProject(name: string, description?: string | null): Promise<Project> {
  const response = await apiFetch('/api/v1/projects', {
    method: 'POST',
    body: { name, description: description ?? null },
  });
  return (await response.json()) as Project;
}

/** `GET /api/v1/projects/{projectId}/datasets`: lista datasets de un proyecto. */
export async function fetchDatasets(projectId: number, signal?: AbortSignal): Promise<Dataset[]> {
  const response = await apiFetch(
    `/api/v1/projects/${projectId}/datasets`,
    signal ? { signal } : {},
  );
  const data = (await response.json()) as ListResponse<Dataset>;
  return data.items;
}

/** `POST /api/v1/projects/{projectId}/datasets`: crea un dataset en un proyecto (administrador del proyecto). */
export async function createDataset(
  projectId: number,
  name: string,
  description?: string | null,
): Promise<Dataset> {
  const response = await apiFetch(`/api/v1/projects/${projectId}/datasets`, {
    method: 'POST',
    body: { name, description: description ?? null },
  });
  return (await response.json()) as Dataset;
}

/** `GET /api/v1/datasets/{datasetId}/images`: lista paginada de imágenes registradas en un dataset. */
export async function fetchDatasetImages(
  datasetId: number,
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<ImagePage> {
  const response = await apiFetch(
    `/api/v1/datasets/${datasetId}/images?page=${page}&pageSize=${pageSize}`,
    signal ? { signal } : {},
  );
  return (await response.json()) as ImagePage;
}

/** `GET /api/v1/storage/files`: archivos disponibles en el disco del servidor (solo el administrador global). */
export async function fetchStorageFiles(
  prefix?: string,
  signal?: AbortSignal,
): Promise<StorageFile[]> {
  const query = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  const response = await apiFetch(`/api/v1/storage/files${query}`, signal ? { signal } : {});
  const data = (await response.json()) as ListResponse<StorageFile>;
  return data.items;
}

/** `POST /api/v1/datasets/{datasetId}/images`: registra archivos físicos en un dataset (solo el administrador global). */
export async function registerImagesInDataset(
  datasetId: number,
  storageKeys: string[],
): Promise<ImageItem[]> {
  const response = await apiFetch(`/api/v1/datasets/${datasetId}/images`, {
    method: 'POST',
    body: { storageKeys },
  });
  const data = (await response.json()) as ListResponse<ImageItem>;
  return data.items;
}
