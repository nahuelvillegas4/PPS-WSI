import { describe, expect, it } from 'vitest';
import { parseRoute, type Route } from './router';

const CATALOG: Route = { name: 'catalog' };

describe('parseRoute', () => {
  it.each<[string, Route]>([
    ['/', CATALOG],
    ['/images/1', { name: 'viewer', imageId: 1 }],
    ['/images/4096', { name: 'viewer', imageId: 4096 }],
    ['/projects/7/members', { name: 'members', projectId: 7 }],
    ['/admin/users', { name: 'users' }],
    ['/gia', { name: 'gia' }],
  ])('maps %s to its route', (pathname, expected) => {
    expect(parseRoute(pathname, '')).toEqual(expected);
  });

  it.each([
    '',
    '/unknown',
    '/images',
    '/images/',
    '/images/0',
    '/images/-3',
    '/images/007',
    '/images/abc',
    '/images/1.5',
    '/images/99999999999999999999',
    '/images/1/extra',
    '/images/1/',
    '/projects',
    '/projects/7',
    '/projects/abc/members',
    '/projects/0/members',
    '/projects/7/members/extra',
    '/projects/7/datasets',
    '/admin',
    '/admin/users/',
    '/admin/users/3',
    '/Images/1',
    '/gia/',
    '/GIA',
    '/gia/x',
    '/gia/1',
  ])('falls back to the catalog for %s', (pathname) => {
    expect(parseRoute(pathname, '')).toEqual(CATALOG);
  });

  it('does not read the query string', () => {
    expect(parseRoute('/', '?project=2&dataset=3')).toEqual(CATALOG);
    expect(parseRoute('/images/5', '?project=2')).toEqual({ name: 'viewer', imageId: 5 });
    expect(parseRoute('/admin/users', '?x=1')).toEqual({ name: 'users' });
    expect(parseRoute('/gia', '?x=1')).toEqual({ name: 'gia' });
  });
});
