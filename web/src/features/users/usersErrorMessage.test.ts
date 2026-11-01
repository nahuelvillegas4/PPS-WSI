import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { describeUserError, usersErrorMessage } from './usersErrorMessage';

describe('usersErrorMessage', () => {
  it.each([
    [409, 'duplicate-name', /Ya existe un usuario con ese nombre/],
    [400, 'validation', /Revisá los datos/],
    [401, 'unauthenticated', /sesión venció/],
    [403, 'forbidden', /administrador global/],
    [409, 'protected-user', /HTTP 409/],
    [404, null, /HTTP 404/],
    [500, null, /no está disponible/],
    [503, null, /no está disponible/],
  ])('maps %i %s', (status, slug, expected) => {
    expect(usersErrorMessage(status, slug)).toMatch(expected);
  });
});

describe('describeUserError', () => {
  function apiError(status: number, slug: string): ApiError {
    return new ApiError(status, {
      type: `urn:gia:problem:${slug}`,
      title: slug,
      status,
      traceId: 't-1',
    });
  }

  it.each([
    [apiError(409, 'duplicate-name'), /Ya existe un usuario con ese nombre/],
    [apiError(403, 'forbidden'), /administrador global/],
    [new ApiError(400, null), /Revisá los datos/],
    [new NetworkError(), /No se pudo contactar/],
    [new Error('x'), 'Ocurrió un error inesperado.'],
  ])('maps %s', (error, expected) => {
    expect(describeUserError(error)).toMatch(expected);
  });
});
