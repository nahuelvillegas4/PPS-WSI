import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { describeMembersError, membersErrorMessage } from './membersErrorMessage';

describe('membersErrorMessage', () => {
  it.each([
    [404, 'user-not-found', /No se encontró un usuario que se pueda asignar/],
    [409, 'already-member', /ya es miembro del proyecto/],
    [403, 'forbidden', /No tenés permiso para administrar los miembros/],
    [404, 'not-found', /No se encontró el proyecto o el miembro/],
    [404, null, /No se encontró el proyecto o el miembro/],
    [400, 'validation', /Revisá los datos/],
    [401, 'unauthenticated', /sesión venció/],
    [409, 'conflict', /HTTP 409/],
    [500, null, /no está disponible/],
    [503, null, /no está disponible/],
  ])('maps %i %s', (status, slug, expected) => {
    expect(membersErrorMessage(status, slug)).toMatch(expected);
  });

  it('does not take a slug for another status as its own', () => {
    expect(membersErrorMessage(403, 'user-not-found')).toMatch(/No tenés permiso/);
    expect(membersErrorMessage(404, 'already-member')).toMatch(/No se encontró el proyecto/);
  });
});

describe('describeMembersError', () => {
  function apiError(status: number, slug: string): ApiError {
    return new ApiError(status, {
      type: `urn:gia:problem:${slug}`,
      title: slug,
      status,
      traceId: 't-1',
    });
  }

  it.each([
    [apiError(404, 'user-not-found'), /No se encontró un usuario que se pueda asignar/],
    [apiError(409, 'already-member'), /ya es miembro del proyecto/],
    [apiError(403, 'forbidden'), /No tenés permiso/],
    [new ApiError(404, null), /No se encontró el proyecto o el miembro/],
    [new NetworkError(), /No se pudo contactar/],
    [new Error('x'), 'Ocurrió un error inesperado.'],
  ])('maps %s', (error, expected) => {
    expect(describeMembersError(error)).toMatch(expected);
  });
});
