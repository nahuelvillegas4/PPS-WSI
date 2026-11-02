import { describe, expect, it } from 'vitest';
import { readRepoFile } from '../../drift/repoFiles.testing';
import { COMPOSE_SERVICES, diagrams } from './diagrams';
import { CONTAINERS, tables } from './tables';

interface ComposeService {
  name: string;
  lines: string[];
}

/** Services of `compose.yaml` with the non-comment lines of each one. */
function parseCompose(text: string): ComposeService[] {
  const services: ComposeService[] = [];
  let inServices = false;
  for (const line of text.split('\n')) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices && /^\S/.test(line) && !line.startsWith('#')) inServices = false;
    if (!inServices) continue;
    const name = /^ {2}([a-z][\w-]*):\s*$/.exec(line)?.[1];
    if (name !== undefined) services.push({ name, lines: [] });
    else if (!line.trimStart().startsWith('#')) services.at(-1)?.lines.push(line);
  }
  return services;
}

const IMAGES_MOUNT = /^\s*-\s+.*:\/data\/images(:ro)?\s*$/;

const compose = parseCompose(await readRepoFile('compose.yaml'));
const containersDiagram = diagrams.find((diagram) => diagram.id === 'contenedores');
const containersTable = tables.find((table) => table.id === 'contenedores');

describe('compose.yaml against the containers stop', () => {
  it('defines exactly the four services the page shows', () => {
    const expected = [...COMPOSE_SERVICES].sort();
    expect(compose.map((service) => service.name).sort()).toEqual(expected);
    expect(CONTAINERS.map((container) => container.service).sort()).toEqual(expected);
    expect(containersTable?.rows).toHaveLength(compose.length);
  });

  it('labels the Compose group with the number of services it really has', () => {
    const shown = /Docker Compose: (\d+) contenedores/.exec(containersDiagram?.source ?? '')?.[1];
    expect(Number(shown)).toBe(compose.length);
  });

  it('mounts the image folder read-only only for the tiles service', () => {
    const mounts = compose.map((service) => ({
      name: service.name,
      readOnly: service.lines.some((line) => IMAGES_MOUNT.exec(line)?.[1] === ':ro'),
      mounted: service.lines.some((line) => IMAGES_MOUNT.test(line)),
    }));
    expect(
      mounts
        .filter((mount) => mount.mounted)
        .map((mount) => mount.name)
        .sort(),
    ).toEqual(['api', 'tiles']);
    expect(mounts.filter((mount) => mount.readOnly).map((mount) => mount.name)).toEqual(['tiles']);

    const readOnlyLines = compose.flatMap((service) =>
      service.lines.filter((line) => line.includes(':ro')),
    );
    expect(readOnlyLines).toHaveLength(1);
  });

  it('publishes a port to the host exactly for the services the table marks as published', () => {
    const publishing = compose
      .filter((service) => service.lines.some((line) => /^ {4}ports:\s*$/.test(line)))
      .map((service) => service.name)
      .sort();
    const marked = CONTAINERS.filter((container) => container.published)
      .map((container) => container.service)
      .sort();
    expect(publishing).toEqual(marked);
    expect(publishing).not.toContain('tiles');
  });

  it('still publishes the API and the database on every interface, as the page says', () => {
    for (const name of ['api', 'db']) {
      const lines = compose.find((service) => service.name === name)?.lines ?? [];
      const port = lines.find((line) => /^\s*-\s+"\$\{[A-Z_]+:-\d+\}:\d+"\s*$/.test(line));
      expect(port, `${name} publishes a port`).toBeDefined();
      expect(
        port,
        'El compose ya limita la publicación al equipo local: actualizá la parada de arquitectura',
      ).not.toContain('127.0.0.1');
    }
    const texts = CONTAINERS.filter((container) => container.published).map(
      (container) => container.publishedText,
    );
    expect(texts.filter((text) => text.includes('todas las interfaces'))).toHaveLength(2);
  });

  it('draws the extra publications from the host, not from the browser, and never says dev-only', () => {
    const source = containersDiagram?.source ?? '';
    expect(source).not.toMatch(/\bnav -\.->/);
    expect(source).toMatch(/\bhost -\.->\|"[^"]*"\| api\b/);
    expect(source).toMatch(/\bhost -\.->\|"[^"]*"\| db\b/);
    expect(source).not.toContain('solo en desarrollo');
    expect(source).not.toContain('único punto de entrada');
    expect(JSON.stringify(containersTable)).not.toContain('solo en desarrollo');
    expect(containersDiagram?.summary).toContain('no existe un compose del servidor');
  });

  it('keeps the technology shown in sync with the images the project builds', async () => {
    const pins = [
      {
        service: 'gateway',
        file: 'deploy/gateway/Dockerfile',
        image: 'nginx:1.30.5',
        shown: 'Nginx 1.30.5',
      },
      {
        service: 'api',
        file: 'api/Dockerfile',
        image: 'dotnet/aspnet:10',
        shown: 'ASP.NET Core 10',
      },
      { service: 'tiles', file: 'tiles/Dockerfile', image: 'python:3.13', shown: 'Python 3.13' },
      { service: 'db', file: 'compose.yaml', image: 'postgres:18', shown: 'PostgreSQL 18' },
    ] as const;
    for (const pin of pins) {
      expect(await readRepoFile(pin.file), `${pin.file} must use ${pin.image}`).toContain(
        pin.image,
      );
      const container = CONTAINERS.find((item) => item.service === pin.service);
      expect(container?.tech, `${pin.service} row`).toContain(pin.shown);
    }
    const source = containersDiagram?.source ?? '';
    expect(source).toContain('ASP.NET Core 10');
    expect(source).toContain('PostgreSQL 18');
  });

  it('describes the gateway routes it really has', async () => {
    const nginx = await readRepoFile('deploy/gateway/nginx.conf');
    expect(nginx).toContain('location /api/');
    expect(nginx).toContain('location /tiles/');
    expect(await readRepoFile('deploy/gateway/snippets/tiles-auth.conf')).toContain('auth_request');
  });

  it('gives every container a name, a role and an owner, and no port numbers', () => {
    for (const container of CONTAINERS) {
      expect(container.name).not.toBe('');
      expect(container.role).not.toBe('');
      expect(container.owner).toMatch(/^PPS [12]/);
      expect(JSON.stringify(container)).not.toMatch(/\d{4,5}/);
    }
  });
});
