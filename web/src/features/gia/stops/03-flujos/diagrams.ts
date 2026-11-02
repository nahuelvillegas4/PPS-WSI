/**
 * Diagrams of the flows stop. Sequence and state diagrams carry no status classes: a partial or
 * planned part is marked with a `Note` that starts with its glyph (`g()`), because a sequence
 * `rect` needs a literal colour and sources never write colours.
 */
import { g } from '../../model/diagramKit';
import type { DiagramDef } from '../../model/types';

const login: DiagramDef = {
  id: 'login',
  kind: 'sequence',
  title: 'Ingreso y sesión',
  summary:
    `El navegador pregunta por la sesión y la API responde 401, así que se muestra la pantalla ` +
    `de ingreso conservando la dirección pedida. Al enviar usuario y contraseña, la API ` +
    `bloquea ese nombre de usuario por cinco minutos tras cinco fallos con menos de cinco ` +
    `minutos entre uno y otro, contados en memoria, de modo que cualquiera puede bloquear una ` +
    `cuenta conocida. Luego busca al usuario, verifica el hash y responde 204 con una cookie de ` +
    `sesión de ocho horas que se renueva con el uso. Una nueva consulta de la sesión devuelve ` +
    `el identificador, el usuario y el rol. Un aviso marca como parcial que el rol global ` +
    `viaja en la cookie y no se revalida en cada pedido, y que desactivar a un usuario tampoco ` +
    `corta su cookie, salvo en las teselas y en la consulta de la sesión.`,
  source: `sequenceDiagram
  participant N as Navegador
  participant A as API vía la pasarela
  participant D as Base de datos
  N->>A: GET /auth/me
  A-->>N: 401 sin sesión
  Note over N: Pantalla de ingreso<br/>y la URL se conserva
  N->>A: POST /auth/login<br/>con usuario y contraseña
  Note over A: 5 fallos separados por menos de 5 min<br/>bloquean ese usuario por 5 min (429).<br/>Se cuenta por nombre de usuario y en<br/>memoria: cualquiera puede bloquear<br/>una cuenta conocida (ADR-16)
  A->>D: busca al usuario
  D-->>A: el usuario o nada
  Note over A: verifica el hash<br/>clave incorrecta, usuario inactivo<br/>o de sistema: 401
  A-->>N: 204 y cookie de sesión<br/>HttpOnly, SameSite Lax, 8 h deslizantes
  N->>A: GET /auth/me
  A-->>N: 200 con id, usuario y rol
  Note over N,A: ${g('partial')} PARCIAL: el rol global viaja<br/>en la cookie y no se revalida.<br/>Desactivar a un usuario tampoco<br/>corta su cookie, salvo en las teselas<br/>y en /auth/me.<br/>SessionValidator ${g('sessionValidator')} (ADR-16, propuesto)`,
  usesStatus: false,
  sources: [
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/Auth/AuthController.cs:42-103',
      note: 'ingreso',
    },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/Auth/AuthController.cs:121-146', note: 'me' },
    { kind: 'code', ref: 'api/src/Pps.Api/Program.cs:43-57', note: 'cookie de sesión' },
    { kind: 'code', ref: 'api/src/Pps.Api/Common/Security/LoginAttemptTracker.cs' },
    { kind: 'code', ref: 'web/src/features/auth/useSession.ts:23-59' },
    { kind: 'adr', ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md' },
  ],
  priority: 'P0',
};

const tesela: DiagramDef = {
  id: 'tesela',
  kind: 'sequence',
  title: 'Pedido de una tesela',
  summary:
    `Cada tesela que pide el visor pasa por la pasarela, que consulta a la API si la sesión ` +
    `puede ver esa imagen. La API busca la imagen, su proyecto y la pertenencia del usuario en ` +
    `la base. Si hay acceso responde 204 con la clave del archivo y la pasarela se la pide al ` +
    `servicio de teselas, que devuelve el descriptor o la tesela JPEG de 254 píxeles con una ` +
    `caché privada de 24 horas. Sin sesión o con el usuario inactivo la respuesta es 401, y sin ` +
    `pertenencia al proyecto o con una imagen inexistente es 403; la administración global ` +
    `pasa sin ser miembro, porque actúa como administrador de todo proyecto. En la variante de ` +
    `desarrollo no hay consulta y se usa una clave fija.`,
  caption:
    'El 401 y el 403 los genera la pasarela, no la API: el navegador ve una página de Nginx.',
  source: `sequenceDiagram
  participant N as Navegador con OpenSeadragon
  participant P as Pasarela
  participant A as API
  participant D as Base de datos
  participant T as Teselas
  N->>P: pide una tesela, con la cookie
  P->>A: consulta de acceso<br/>(auth_request)
  A->>D: imagen, proyecto y membresía
  D-->>A: clave, estado del usuario y rol
  alt sesión válida y con acceso
    A-->>P: 204 y la clave de almacenamiento
    Note over A: la administración global pasa sin ser<br/>miembro: actúa como administrador<br/>de todo proyecto
    P->>T: pide el descriptor o la tesela
    T-->>P: 200 con DZI o JPEG<br/>tesela de 254 px, solape 1
    P-->>N: 200, caché privada de 24 h
  else sin sesión o usuario inactivo
    A-->>P: 401
    P-->>N: 401
  else sin membresía o imagen inexistente
    A-->>P: 403
    P-->>N: 403
  end
  opt Variante de desarrollo (ver recuadro)
    P->>T: sin consulta de acceso<br/>con una clave fija
  end`,
  usesStatus: false,
  sources: [
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs:29-74',
      note: 'respuestas 204, 401 y 403',
    },
    { kind: 'config', ref: 'deploy/gateway/snippets/tiles-auth.conf' },
    { kind: 'config', ref: 'deploy/gateway/nginx.conf:40-48', note: 'ruta de teselas' },
    { kind: 'config', ref: 'compose.dev-sin-login.yaml', note: 'variante de desarrollo' },
    { kind: 'doc', ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:190-216' },
  ],
  priority: 'P0',
};

const subida: DiagramDef = {
  id: 'subida',
  kind: 'sequence',
  title: 'Subida desde el navegador',
  summary:
    `El administrador del proyecto elige archivos y la interfaz los sube de a uno, en una ` +
    `cola. La API comprueba el permiso de subida, que responde 404 a quien no es miembro y 403 ` +
    `a un rol menor, y rechaza con 404 o 400 un dataset inexistente o archivos ausentes, vacíos ` +
    `o repetidos. Verifica que la imagen no esté registrada, escribe el archivo en el ` +
    `volumen, lo hace inspeccionar por el servicio de teselas y registra todo en una ` +
    `transacción. Si falla la inspección o el registro, borra los archivos ya escritos y ` +
    `devuelve el error; si se corta la copia de un archivo, puede quedar uno parcial en el ` +
    `volumen. Un aviso marca como planificado lo propuesto en el ADR-17: chequeo previo de ` +
    `tamaño y espacio, escritura sin sobrescribir, reintentos y una espera de 1800 s en la ` +
    `pasarela, que hoy es de 300 s.`,
  source: `sequenceDiagram
  participant U as Administrador del proyecto
  participant S as SPA
  participant A as API
  participant V as Volumen de imágenes
  participant T as Teselas
  participant D as Base de datos
  U->>S: elige archivos (svs, png o jpg)
  Note over S: cola de a un archivo por vez
  S->>A: POST de subida (multipart)
  Note over A: permiso image.upload<br/>(404 no miembro, 403 rol menor)
  Note over A: antes de escribir: 404 sin dataset,<br/>400 sin archivos, vacíos o repetidos
  A->>D: verifica que no esté registrada (409)
  A->>V: escribe el archivo
  A->>T: inspecciona tipo, tamaño y niveles
  A->>D: registra todo en una transacción
  alt falla la inspección o el registro
    A->>V: borra los archivos ya escritos
    A-->>S: error (por ejemplo 422 o 503)
  else todo bien
    A-->>S: 201 con las imágenes registradas
  end
  Note over A,V: ${g('partial')} PARCIAL: si se corta la copia de un<br/>archivo, puede quedar uno parcial<br/>en el volumen
  Note over S,V: ${g('planned')} PLANIFICADO (ADR-17, propuesto)<br/>chequeo previo 413/507, escribir .part<br/>sin sobrescribir, reintentos y espera<br/>de 1800 s en la pasarela (hoy 300 s)`,
  usesStatus: false,
  sources: [
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/Images/ImagesController.cs:120-264',
      note: 'UploadImages',
    },
    { kind: 'code', ref: 'api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs:95-110' },
    {
      kind: 'config',
      ref: 'deploy/gateway/nginx.conf:27-38',
      note: 'tiempo de espera de la pasarela para /api/',
    },
    {
      kind: 'code',
      ref: 'web/src/features/upload/uploadQueue.ts:91-118',
      note: 'un archivo por vez',
    },
    { kind: 'code', ref: 'web/src/features/upload/fileFilter.ts' },
    { kind: 'adr', ref: 'docs/adr/0017-subida-de-imagenes-desde-el-navegador.md' },
  ],
  priority: 'P1',
};

const anotar: DiagramDef = {
  id: 'anotar',
  kind: 'sequence',
  title: 'Anotar una imagen',
  summary:
    `Un anotador dibuja en el editor, que convierte cada punto a coordenadas del nivel 0 con el ` +
    `visor y envía la anotación a la API. La API valida la geometría en el dominio, con límites, ` +
    `cierre, autointersección y área, y responde 422 si es inválida; si no, la guarda con el ` +
    `autor de la sesión y devuelve 201 con una versión. Para modificarla, la API exige la ` +
    `versión: responde 428 si falta, 403 si quien edita no es el autor y 412 si la versión no ` +
    `coincide. Un aviso marca como pendiente el editor, que no existe en la interfaz.`,
  source: `sequenceDiagram
  participant U as Anotador
  participant E as Editor
  participant V as Visor OsdImageViewer
  participant A as API
  participant G as Dominio GeometryValidator
  participant D as Base de datos
  Note over U,V: ${g('editor')} PENDIENTE: editor en la SPA
  U->>E: dibuja un rectángulo o polígono
  E->>V: toLevel0 de cada punto
  V-->>E: coordenadas en el nivel 0
  E->>A: POST de la anotación<br/>con clase y geometría
  A->>G: valida límites, cierre,<br/>autointersección y área
  alt geometría inválida
    A-->>E: 422
  else geometría válida
    A->>D: guarda, con el autor de la sesión
    A-->>E: 201 y ETag
  end
  E->>A: PATCH con If-Match
  alt falta If-Match
    A-->>E: 428
  else no es el autor
    A-->>E: 403
  else la versión no coincide
    A-->>E: 412
  else todo en orden
    A-->>E: 200 y ETag nuevo
  end`,
  usesStatus: false,
  sources: [
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs:37-101',
      note: 'crear',
    },
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs:209-262',
      note: 'modificar con If-Match',
    },
    { kind: 'code', ref: 'api/src/Pps.Domain/Annotations/GeometryValidator.cs' },
    { kind: 'code', ref: 'web/src/features/viewer/ImageViewer.ts:19-38', note: 'toLevel0' },
    { kind: 'adr', ref: 'docs/adr/0006-geometrias-y-coordenadas.md' },
    { kind: 'adr', ref: 'docs/adr/0007-modelo-de-datos-y-autoria.md' },
  ],
  priority: 'P0',
};

const importExport: DiagramDef = {
  id: 'import-export',
  kind: 'sequence',
  title: 'Importar CRIC y exportar',
  summary:
    `La importación y la exportación existen en la API, pero la pantalla que las usaría está ` +
    `planificada. Para importar, la administración envía un pedido que por defecto es una ` +
    `simulación: la API verifica que la carpeta no se haya importado, lee las anotaciones CRIC ` +
    `del volumen y hace inspeccionar cada imagen nueva por el servicio de teselas, también en la ` +
    `simulación, y responde 200 con un informe sin escribir. Si la inspección de una imagen ` +
    `falla, esa imagen se omite con un aviso. Una importación real registra en una ` +
    `transacción única las imágenes nuevas, las clases que falten y las anotaciones, con el ` +
    `autor import-cric, y responde 201. Para exportar, la API lee ` +
    `las anotaciones vigentes y devuelve un archivo JSON interno o COCO; el formato YOLO ` +
    `responde 422 porque no está construido.`,
  source: `sequenceDiagram
  participant G as Administración
  participant P as Pantalla de importar y exportar
  participant A as API
  participant V as Volumen de imágenes
  participant T as Teselas
  participant D as Base de datos
  Note over P: ${g('importScreen')} PLANIFICADA: hoy solo por la API
  G->>P: elige el dataset y la carpeta
  P->>A: POST de importación (dryRun por defecto)
  A->>D: verifica que no esté importada (409)
  A->>V: lee las anotaciones CRIC
  A->>T: inspecciona cada imagen nueva
  Note over A,T: también en la simulación. Si falla,<br/>omite la imagen con un aviso
  alt dryRun
    A-->>P: 200 con el informe, sin escribir
  else importación real
    A->>D: una transacción: imágenes nuevas,<br/>clases que faltan y anotaciones<br/>con autor import-cric
    A-->>P: 201 con el informe
  end
  Note over A: importar: solo admin global<br/>exportar: admin del proyecto o global
  G->>P: elige formato y autores
  P->>A: GET de exportación (internal o coco)
  A->>D: lee las anotaciones vigentes
  A-->>P: archivo JSON
  Note over A: ${g('yolo')} yolo: 422 unsupported-format`,
  usesStatus: false,
  sources: [
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Controllers/IO/ImportsController.cs:11',
      note: 'solo administración global',
    },
    { kind: 'code', ref: 'api/src/Pps.Infrastructure/Import/CricImporter.cs:50-72' },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/IO/ExportController.cs:27-70' },
    { kind: 'adr', ref: 'docs/adr/0009-importacion-por-adaptadores.md' },
    { kind: 'adr', ref: 'docs/adr/0010-exportacion.md' },
  ],
  priority: 'P1',
};

const sesionSpa: DiagramDef = {
  id: 'sesion-spa',
  kind: 'state',
  title: 'Sesión de la SPA',
  summary:
    `La interfaz arranca comprobando la sesión. Si la API responde 200 pasa a con sesión; si ` +
    `responde 401, a sin sesión; si no hay red o el error es otro, queda en servidor sin ` +
    `respuesta y vuelve a comprobar al apretar Reintentar. Desde sin sesión se ingresa y desde ` +
    `con sesión se sale. No existe la transición por vencimiento con el visor abierto: está ` +
    `planificada.`,
  source: `stateDiagram-v2
  state "Comprobando la sesión" as checking
  state "Sin sesión" as anonymous
  state "Con sesión" as authenticated
  state "Servidor sin respuesta" as unavailable
  [*] --> checking
  checking --> authenticated: auth/me responde 200
  checking --> anonymous: auth/me responde 401
  checking --> unavailable: sin red o error distinto de 401
  unavailable --> checking: Reintentar
  anonymous --> authenticated: ingresa
  authenticated --> anonymous: sale
  note right of authenticated
    ${g('planned')} vencimiento con el visor abierto:
    planificado (QS-7)
  end note`,
  usesStatus: false,
  sources: [
    { kind: 'code', ref: 'web/src/features/auth/useSession.ts:4-59' },
    { kind: 'code', ref: 'web/src/app/App.tsx', note: 'pantalla según el estado de la sesión' },
  ],
  priority: 'P2',
};

export const diagrams: readonly DiagramDef[] = [
  login,
  tesela,
  subida,
  anotar,
  importExport,
  sesionSpa,
];
