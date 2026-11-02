/**
 * Drift tests of the flows: each claim a diagram makes about behaviour is pinned to the source
 * that implements it, so the page cannot keep describing something the code no longer does.
 */
import { describe, expect, it } from 'vitest';
import { findRepoText, readRepoFile } from '../../drift/repoFiles.testing';
import { FEATURES } from '../../model/features';
import { content } from './index';

const diagram = (id: string): string =>
  content.diagrams.find((item) => item.id === id)?.source ?? '';

/** Text of `source` from the first occurrence of `from` to the end; fails if it is not there. */
function after(source: string, from: string): string {
  const at = source.indexOf(from);
  if (at === -1) throw new Error(`Not found in the source: ${from}`);
  return source.slice(at);
}

/** Positions of `needles` in `source`; each must appear, in the given order. */
function inOrder(source: string, needles: readonly string[]): boolean {
  let at = -1;
  for (const needle of needles) {
    const next = source.indexOf(needle, at + 1);
    if (next === -1 || next <= at) return false;
    at = next;
  }
  return true;
}

describe('tesela: the access check', () => {
  it('answers only 204, 401 and 403, and the diagram shows the same three', async () => {
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs',
    );
    expect(controller).toContain('NoContent()');
    expect(controller).toContain('Unauthorized()');
    expect(controller).toContain('Forbid()');
    expect(controller).not.toMatch(/NotFound\(|Redirect|StatusCode\(/);

    const source = diagram('tesela');
    for (const status of ['204', '401', '403']) expect(source).toContain(status);
    expect(source).not.toMatch(/\b(404|302|500)\b/);
  });

  it('answers 401 for an inactive user and 403 for a missing image or a non-member', async () => {
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs',
    );
    // facts is null (no image) -> Forbid, then inactive -> Unauthorized, then Decide != Allowed -> Forbid.
    expect(
      inOrder(controller, [
        'facts is null',
        'return Forbid();',
        '!facts.UserIsActive',
        'return Unauthorized();',
        'AccessVerdict.Allowed',
        'return Forbid();',
        'return NoContent();',
      ]),
    ).toBe(true);
    expect(diagram('tesela')).toContain('sin sesión o usuario inactivo');
    expect(diagram('tesela')).toContain('sin membresía o imagen inexistente');
  });

  it('lets the global admin through without a membership, and the diagram says so', async () => {
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs',
    );
    expect(controller).toContain('AccessPolicy.Decide(User.IsInRole(GlobalRoles.Admin)');
    const policy = await readRepoFile('api/src/Pps.Domain/Access/AccessPolicy.cs');
    expect(
      inOrder(policy, ['if (isGlobalAdmin)', 'AccessVerdict.Allowed', 'facts.MemberRole']),
    ).toBe(true);
    expect(diagram('tesela')).toContain('la administración global pasa sin ser');
    expect(diagram('tesela')).toContain('de todo proyecto');
    expect(content.diagrams.find((item) => item.id === 'tesela')?.summary).toContain(
      'la administración global pasa sin ser miembro',
    );
  });

  it('asks the API before serving each tile, and lets only 2xx, 401 and 403 through', async () => {
    const snippet = await readRepoFile('deploy/gateway/snippets/tiles-auth.conf');
    expect(snippet).toContain('auth_request');
    expect(snippet).toContain('401/403');
    const nginx = await readRepoFile('deploy/gateway/nginx.conf');
    expect(nginx).toContain('include /etc/nginx/gateway/tiles-auth.conf;');
  });

  it('describes the tile service as it is built: 254 px tiles, overlap 1, private 24 h cache', async () => {
    const slides = await readRepoFile('tiles/app/slides.py');
    expect(slides).toMatch(/^TILE_SIZE = 254$/m);
    expect(slides).toMatch(/^OVERLAP = 1$/m);
    const routes = await readRepoFile('tiles/app/routes.py');
    expect(routes).toContain('CACHE_CONTROL = "private, max-age=86400"');
    const source = diagram('tesela');
    expect(source).toContain('254 px, solape 1');
    expect(source).toContain('caché privada de 24 h');
  });

  it('replaces the check by a fixed key in the development variant only', async () => {
    const overlay = await readRepoFile('compose.dev-sin-login.yaml');
    expect(overlay).toContain('tiles-auth.conf');
    const dev = await readRepoFile('deploy/gateway/dev/tiles-auth-sin-login.conf');
    expect(dev).not.toContain('auth_request');
    expect(dev).toContain('set $storage_key');
    expect(diagram('tesela')).toContain('opt Variante de desarrollo');
  });
});

describe('login: session and cookie', () => {
  it('uses an HttpOnly, SameSite=Lax cookie that lasts 8 hours and slides', async () => {
    const program = await readRepoFile('api/src/Pps.Api/Program.cs');
    expect(program).toContain('options.Cookie.HttpOnly = true;');
    expect(program).toContain('options.Cookie.SameSite = SameSiteMode.Lax;');
    expect(program).toContain('options.ExpireTimeSpan = TimeSpan.FromHours(8);');
    expect(program).toContain('options.SlidingExpiration = true;');
    const source = diagram('login');
    expect(source).toContain('HttpOnly, SameSite Lax, 8 h deslizantes');
  });

  it('blocks after 5 failures in 5 minutes for 5 minutes, before looking up the user', async () => {
    const tracker = await readRepoFile('api/src/Pps.Api/Common/Security/LoginAttemptTracker.cs');
    expect(tracker).toContain('int maxFailures = 5');
    expect(tracker).toMatch(/lockoutDuration \?\? TimeSpan\.FromMinutes\(5\)/);
    expect(tracker).toMatch(/attemptWindow \?\? TimeSpan\.FromMinutes\(5\)/);
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Auth/AuthController.cs');
    expect(
      inOrder(controller, [
        'IsBlocked(',
        'TooManyRequestsProblemException',
        'SignInAsync',
        'return NoContent();',
      ]),
    ).toBe(true);
    const source = diagram('login');
    expect(source).toContain('5 fallos separados por menos de 5 min');
    expect(source).toContain('bloquean ese usuario por 5 min (429)');
  });

  it('counts failures per username, in memory, and says anyone can lock a known account', async () => {
    const tracker = await readRepoFile('api/src/Pps.Api/Common/Security/LoginAttemptTracker.cs');
    expect(tracker).toContain('ConcurrentDictionary<string, AttemptRecord>');
    expect(tracker).toContain('StringComparer.OrdinalIgnoreCase');
    expect(tracker).not.toMatch(/RemoteIpAddress|IPAddress/);
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Auth/AuthController.cs');
    expect(controller).toContain('_attemptTracker.IsBlocked(request.Username)');
    expect(controller).not.toMatch(/RemoteIpAddress/);
    const source = diagram('login');
    expect(source).toContain('Se cuenta por nombre de usuario y en');
    expect(source).toContain('cualquiera puede bloquear');
    expect(source).toContain('una cuenta conocida');
  });

  it('says that deactivating a user cuts the cookie only at the tiles and /auth/me', async () => {
    const withIsActive = await findRepoText({
      in: ['api/src/Pps.Api/**/*.cs'],
      except: [
        'api/src/Pps.Api/**/Dtos/**',
        'api/src/Pps.Api/Controllers/Users/**',
        'api/src/Pps.Api/Controllers/Members/**',
      ],
      pattern: '\\.IsActive|UserIsActive',
    });
    expect(
      withIsActive.sort(),
      'Otro archivo de la API lee si el usuario está activo: actualizá la nota PARCIAL del diagrama login',
    ).toEqual([
      'api/src/Pps.Api/Controllers/Auth/AuthController.cs',
      'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs',
    ]);
    const source = diagram('login');
    expect(source).toContain('Desactivar a un usuario tampoco');
    expect(source).toContain('corta su cookie, salvo en las teselas');
    expect(source).toContain('y en /auth/me');
    expect(content.diagrams.find((item) => item.id === 'login')?.summary).toContain(
      'desactivar a un usuario tampoco corta su cookie, salvo en las teselas',
    );
  });

  it('keeps the global role in the cookie and reads the current one only in /auth/me', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Auth/AuthController.cs');
    expect(controller).toContain('ClaimTypes.Role');
    const program = await readRepoFile('api/src/Pps.Api/Program.cs');
    expect(program).not.toContain('OnValidatePrincipal');
    expect(FEATURES.sessionValidator.status).toBe('planned');
  });
});

describe('subida: upload', () => {
  it('requires the upload permission, which is the project-admin level', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    const upload = after(
      controller,
      '[HttpPost("api/v1/datasets/{datasetId:long}/images/upload")]',
    );
    expect(upload.slice(0, 200)).toContain('[RequirePermission(Permission.ImageUpload)]');
    const matrix = JSON.parse(
      await readRepoFile('contract/fixtures/authorization-matrix.json'),
    ) as { permissions: Record<string, string> };
    expect(matrix.permissions['image.upload']).toBe('project-admin');
  });

  it('checks for an existing registration, then writes, inspects, registers and rolls back on failure', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    const upload = after(
      controller,
      'public async Task<ActionResult<RegisterImagesResponse>> UploadImages',
    );
    expect(
      inOrder(upload, [
        '"already-registered"',
        'SaveFileAsync',
        'InspectAsync',
        'BeginTransactionAsync',
        'CommitAsync',
        'catch',
        'DeleteFile',
      ]),
    ).toBe(true);
  });

  it('uploads one file at a time and accepts the four extensions the diagram names', async () => {
    const queue = await readRepoFile('web/src/features/upload/uploadQueue.ts');
    expect(queue).not.toContain('Promise.all');
    expect(queue).toMatch(/for \(let item = nextQueued\(\)/);
    const filter = await readRepoFile('web/src/features/upload/fileFilter.ts');
    expect(filter).toContain("['.svs', '.png', '.jpg', '.jpeg']");
    expect(diagram('subida')).toContain('svs, png o jpg');
  });

  it('rolls back only the files already saved, so a cut copy can leave a partial file', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    const upload = after(
      controller,
      'public async Task<ActionResult<RegisterImagesResponse>> UploadImages',
    );
    // The key joins savedKeys only after SaveFileAsync returns, and the catch deletes only savedKeys.
    expect(
      inOrder(upload, [
        'await _storageService.SaveFileAsync(storageKey, stream, cancellationToken);',
        'savedKeys.Add(storageKey);',
        'catch',
        'foreach (var key in savedKeys)',
        '_storageService.DeleteFile(key);',
      ]),
    ).toBe(true);
    const storage = await readRepoFile(
      'api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs',
    );
    expect(storage).toContain('FileMode.Create');
    const source = diagram('subida');
    expect(source).toContain('alt falla la inspección o el registro');
    expect(source).toContain('borra los archivos ya escritos');
    expect(source).toContain('si se corta la copia de un');
    expect(source).not.toContain('alt falla un paso');
    expect(content.diagrams.find((item) => item.id === 'subida')?.summary).not.toContain(
      'Si un paso falla, borra los archivos escritos',
    );
  });

  it('lists the errors raised before writing and the gateway wait the page mentions', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    const upload = after(
      controller,
      'public async Task<ActionResult<RegisterImagesResponse>> UploadImages',
    );
    expect(
      inOrder(upload, [
        'NotFoundProblemException',
        'ValidationProblemException',
        'ConflictProblemException',
        'SaveFileAsync',
      ]),
    ).toBe(true);
    const source = diagram('subida');
    expect(source).toContain('antes de escribir: 404 sin dataset');
    expect(source).toContain('400 sin archivos, vacíos o repetidos');
    const nginx = await readRepoFile('deploy/gateway/nginx.conf');
    const gatewayApi = after(nginx, 'location /api/ {').slice(0, 400);
    expect(gatewayApi).toContain('proxy_read_timeout 300s;');
    expect(gatewayApi).toContain('proxy_send_timeout 300s;');
    expect(source).toContain('espera');
    expect(source).toContain('de 1800 s en la pasarela (hoy 300 s)');
    const callout = content.section.tabs
      .find((tab) => tab.id === 'subir')
      ?.blocks.flatMap((block) => (block.kind === 'callout' ? [block.text] : []))
      .join(' ');
    expect(callout).toContain('300 s');
    expect(callout).toContain('1800 s');
    expect(callout).toContain('puede quedar uno parcial');
  });

  it('does not yet have the ADR-17 hardening it marks as planned', async () => {
    const storage = await readRepoFile(
      'api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs',
    );
    expect(
      storage,
      'Escribir .part ya existe: actualizá la nota PLANIFICADO del diagrama subida',
    ).not.toContain('.part');
    expect(storage).toContain('FileMode.Create');
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    expect(controller).not.toContain('UploadPreflight');
    const nginx = await readRepoFile('deploy/gateway/nginx.conf');
    expect(nginx).not.toContain('1800s');
  });
});

describe('anotar: annotations', () => {
  it('validates the geometry before saving and answers with a version', async () => {
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs',
    );
    const create = after(controller, '[HttpPost("api/v1/images/{imageId:long}/annotations")]');
    expect(
      inOrder(create, [
        'Permission.AnnotationWrite',
        'GeometryValidator.ValidateAgainstImage',
        'AuthorId = userId',
        'Response.Headers.ETag',
      ]),
    ).toBe(true);
  });

  it('answers 428, then 403 for a non-author, then 412 for a stale version when updating', async () => {
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs',
    );
    const update = after(controller, '[HttpPatch("api/v1/annotations/{annotationId:long}")]');
    expect(
      inOrder(update, [
        'PreconditionRequiredProblemException',
        'annotation.AuthorId != userId',
        'ForbiddenProblemException',
        'PreconditionFailedProblemException',
      ]),
    ).toBe(true);
    const source = diagram('anotar');
    expect(
      inOrder(source, [
        'falta If-Match',
        '428',
        'no es el autor',
        '403',
        'la versión no coincide',
        '412',
      ]),
    ).toBe(true);
  });

  it('checks limits, closing, degenerate shapes and self-intersection in the domain', async () => {
    const validator = await readRepoFile('api/src/Pps.Domain/Annotations/GeometryValidator.cs');
    for (const rule of [
      'GeometryOutOfBoundsException',
      'GeometryDegenerateException',
      'GeometrySelfIntersectionException',
      'cierre explícito',
    ]) {
      expect(validator, rule).toContain(rule);
    }
  });

  it('keeps the editor out of the SPA, as the pending note says', () => {
    expect(FEATURES.editor.status).toBe('planned');
    expect(diagram('anotar')).toContain('PENDIENTE: editor en la SPA');
  });
});

describe('import-export: exchange', () => {
  it('limits the import to the global admin and makes dryRun the default', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/IO/ImportsController.cs');
    expect(controller).toContain('[RequireGlobalAdmin]');
    const models = await readRepoFile('api/src/Pps.Domain/Import/ImportModels.cs');
    expect(models).toContain('public bool DryRun { get; set; } = true;');
    expect(diagram('import-export')).toContain('dryRun por defecto');
  });

  it('refuses a folder that was already imported before reading it, then writes in one transaction', async () => {
    const importer = await readRepoFile('api/src/Pps.Infrastructure/Import/CricImporter.cs');
    expect(
      inOrder(importer, [
        'AlreadyImportedException',
        '_storage.ListFiles',
        'request.DryRun',
        'BeginTransactionAsync',
      ]),
    ).toBe(true);
    expect(importer).toContain('"import-cric"');
  });

  it('inspects each new image through the tiles service, also in dryRun, before one transaction writes everything', async () => {
    const importer = await readRepoFile('api/src/Pps.Infrastructure/Import/CricImporter.cs');
    // The inspection runs before the dryRun branch and a failure is skipped with a warning.
    expect(
      inOrder(importer, [
        '_inspector.InspectAsync',
        'image-inspection-failed',
        'if (request.DryRun)',
        'BeginTransactionAsync',
        '_db.Users.Add(syntheticUser)',
        '_db.LabelClasses.AddRange',
        '_db.Images.AddRange',
        '_db.Imports.Add(importRecord)',
      ]),
    ).toBe(true);
    const source = diagram('import-export');
    expect(source).toContain('participant T as Teselas');
    expect(source).toContain('A->>T: inspecciona cada imagen nueva');
    expect(source).toContain('también en la simulación');
    expect(source).toContain('clases que faltan y anotaciones');
    const summary = content.diagrams.find((item) => item.id === 'import-export')?.summary ?? '';
    expect(summary).toContain('inspeccionar cada imagen nueva por el servicio de teselas');
    expect(summary).toContain('las clases que falten');
  });

  it('exports with the dataset.export permission and refuses yolo', async () => {
    const controller = await readRepoFile('api/src/Pps.Api/Controllers/IO/ExportController.cs');
    expect(controller).toContain('[RequirePermission(Permission.DatasetExport)]');
    expect(controller).toMatch(/normalizedFormat == "yolo"[\s\S]*"unsupported-format"/);
    const matrix = JSON.parse(
      await readRepoFile('contract/fixtures/authorization-matrix.json'),
    ) as { permissions: Record<string, string> };
    expect(matrix.permissions['dataset.export']).toBe('project-admin');
    expect(FEATURES.yolo.status).toBe('planned');
    expect(diagram('import-export')).toContain('yolo: 422 unsupported-format');
  });

  it('has no import or export screen yet, as the planned note says', () => {
    expect(FEATURES.importScreen.status).toBe('planned');
    expect(FEATURES.exportScreen.status).toBe('planned');
  });
});

describe('sesion-spa: client session', () => {
  it('draws the four states and the transitions of useSession', async () => {
    const hook = await readRepoFile('web/src/features/auth/useSession.ts');
    const source = diagram('sesion-spa');
    for (const kind of ['checking', 'anonymous', 'authenticated', 'unavailable']) {
      expect(hook, kind).toContain(`kind: '${kind}'`);
      expect(source, kind).toContain(` as ${kind}`);
    }
    expect(hook).toContain("setSession({ kind: 'checking' })");
    expect(source).toContain('unavailable --> checking: Reintentar');
  });

  it('has no transition for an expired session, which the diagram marks as planned (QS-7)', async () => {
    const api = await readRepoFile('web/src/shared/api.ts');
    expect(api, 'apiFetch ya trata el 401: actualizá el diagrama sesion-spa').not.toContain('401');
    expect(diagram('sesion-spa')).toContain('planificado (QS-7)');
  });
});
