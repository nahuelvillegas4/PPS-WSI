import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDataset,
  createProject,
  fetchDatasetImages,
  fetchDatasets,
  fetchProjects,
  fetchStorageFiles,
  registerImagesInDataset,
} from './catalogApi';

function stubFetch(response: Response | Error) {
  const mock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('catalogApi', () => {
  it('fetchProjects retrieves project items', async () => {
    const projects = [
      { id: 1, name: 'Piloto', description: null, createdAt: '2026-10-21T00:00:00Z' },
    ];
    stubFetch(Response.json({ items: projects }));

    const result = await fetchProjects();
    expect(result).toEqual(projects);
  });

  it('createProject posts new project input', async () => {
    const newProject = {
      id: 2,
      name: 'Biopsias',
      description: 'Casos SVS',
      createdAt: '2026-10-24T00:00:00Z',
    };
    const mock = stubFetch(Response.json(newProject, { status: 201 }));

    const result = await createProject('Biopsias', 'Casos SVS');
    expect(result).toEqual(newProject);
    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/projects');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Biopsias', description: 'Casos SVS' });
  });

  it('fetchDatasets retrieves dataset items for a project', async () => {
    const datasets = [
      {
        id: 1,
        projectId: 1,
        name: 'Dataset1',
        description: null,
        createdAt: '2026-10-21T00:00:00Z',
      },
    ];
    const mock = stubFetch(Response.json({ items: datasets }));

    const result = await fetchDatasets(1);
    expect(result).toEqual(datasets);
    const [path] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/projects/1/datasets');
  });

  it('createDataset posts new dataset input', async () => {
    const newDataset = {
      id: 3,
      projectId: 1,
      name: 'Cervical',
      description: null,
      createdAt: '2026-10-24T00:00:00Z',
    };
    const mock = stubFetch(Response.json(newDataset, { status: 201 }));

    const result = await createDataset(1, 'Cervical');
    expect(result).toEqual(newDataset);
    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/projects/1/datasets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Cervical', description: null });
  });

  it('fetchDatasetImages fetches paginated images', async () => {
    const page = {
      items: [
        {
          id: 1,
          datasetId: 1,
          storageKey: 'samples/prueba-1376x1020.png',
          name: 'prueba-1376x1020.png',
          kind: 'conventional',
          format: 'png',
          width: 1376,
          height: 1020,
          levelCount: 1,
          mppX: null,
          mppY: null,
          tileSourceUrl: '/tiles/v1/images/1.dzi',
          registeredAt: '2026-10-21T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    };
    const mock = stubFetch(Response.json(page));

    const result = await fetchDatasetImages(1, 1, 50);
    expect(result).toEqual(page);
    const [path] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/datasets/1/images?page=1&pageSize=50');
  });

  it('fetchStorageFiles fetches server storage files', async () => {
    const files = [
      {
        storageKey: 'svs/cmu-1.svs',
        sizeBytes: 150000000,
        kind: 'wsi',
        registeredInDatasets: [],
      },
    ];
    const mock = stubFetch(Response.json({ items: files }));

    const result = await fetchStorageFiles('svs/');
    expect(result).toEqual(files);
    const [path] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/storage/files?prefix=svs%2F');
  });

  it('registerImagesInDataset posts selected storage keys', async () => {
    const registered = [
      {
        id: 2,
        datasetId: 1,
        storageKey: 'svs/cmu-1.svs',
        name: 'cmu-1.svs',
        kind: 'wsi',
        format: 'svs',
        width: 46000,
        height: 32000,
        levelCount: 10,
        mppX: 0.25,
        mppY: 0.25,
        tileSourceUrl: '/tiles/v1/images/2.dzi',
        registeredAt: '2026-10-24T00:00:00Z',
      },
    ];
    const mock = stubFetch(Response.json({ items: registered }, { status: 201 }));

    const result = await registerImagesInDataset(1, ['svs/cmu-1.svs']);
    expect(result).toEqual(registered);
    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/datasets/1/images');
    expect(JSON.parse(init.body as string)).toEqual({ storageKeys: ['svs/cmu-1.svs'] });
  });
});
