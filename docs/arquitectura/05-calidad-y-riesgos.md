## 10. Escenarios de calidad

Cada escenario tiene un estímulo, una respuesta esperada y una **medida de aceptación**: algo que se puede comprobar con un sí o un no. Los umbrales de rendimiento son objetivos iniciales; si la medición en el incremento I2 muestra que no son realistas, se ajustan con un ADR, no en silencio.

| ID | Atributo | Escenario | Medida de aceptación | Cómo y cuándo se verifica |
|---|---|---|---|---|
| QS-1 | Corrección | Los adaptadores del visor convierten los puntos de los casos C1 a C3 del contrato | Error ≤ 1e-6 px de nivel 0; ida y vuelta ≤ 0,5 px de pantalla entre zoom 1:64 y 4:1 | Vitest en la CI, con ambos adaptadores (I1) |
| QS-2 | Independencia del zoom | Se crea un polígono con un zoom y se reabre con otro zoom y otra resolución de pantalla | JSON guardado idéntico byte a byte; desplazamiento visual ≤ 1 px de pantalla | Prueba de integración y paso del guion manual (I2) |
| QS-3 | Autoría | El usuario B modifica o borra una anotación de A, o envía `authorId` o `createdAt` en el cuerpo | 403 o 400 según el caso; la anotación de A no cambia | xUnit con PostgreSQL real (I2) |
| QS-4 | Fluidez | 500 teselas al azar de CMU-1.svs, 8 pedidos concurrentes, a través de la pasarela y con `auth_request`, con el slide ya abierto | p95 ≤ 150 ms por tesela; apertura en frío (primer DZI) ≤ 1 s | `scripts/bench-tiles.py` en la máquina de referencia (I2) |
| QS-5 | Instalación | Una persona con Docker y Git sigue el README en una máquina limpia | Sistema con datos de prueba y prueba de humo en verde en ≤ 30 min, sin contar descargas; ningún paso fuera del README | CI en cada PR (≤ 10 min) y ensayo real al cierre de I1, I4 e I5 |
| QS-6 | Degradación | Se detiene `tiles` durante una sesión; o se detiene `api` con una edición pendiente | Aviso en ≤ 5 s y el catálogo sigue funcionando; ninguna figura se marca como guardada sin 2xx y lo pendiente se puede reintentar | Guion manual (I3) |
| QS-7 | Sesión | La cookie vence con el visor abierto | Pantalla de ingreso y regreso a la misma imagen; sin bucles de redirección y sin perder lo pendiente | Guion (I3) y prueba de integración de `tile-access` |
| QS-8 | Confidencialidad | Pedidos sin sesión a cada ruta del contrato y a las teselas; pedido de imágenes asociadas | 401 en todo salvo ingreso y salud; ninguna ruta entrega `label` ni `macro` | Prueba automática que recorre las rutas de la OpenAPI (I2) |
| QS-9 | Extensibilidad | Se agrega un segundo formato de exportación o de importación | Una clase nueva, su registro y sus casos; cero archivos modificados en los otros exportadores y en el esquema de geometría | Revisión del PR del segundo formato (I3) |
| QS-10 | Mantenibilidad | Una persona nueva quiere correr las pruebas de un módulo | Un comando documentado en el README del módulo; pruebas en verde en ≤ 15 min desde el clon | Ensayo al cierre (I5) |

## 11. Riesgos y deuda técnica

### 11.1 Riesgos

Probabilidad (P) e impacto (I): alto, medio o bajo. El disparador es la señal concreta que obliga a actuar; sin disparador, un riesgo es solo una preocupación.

| ID | Riesgo | P | I | Mitigación | Disparador · dueño |
|---|---|---|---|---|---|
| R1 | Integración tardía: las dos propuestas integraban al final | Alta | Alto | Compose y esqueleto de punta a punta (I0, I1) antes que cualquier funcionalidad; demostración integrada cada semana | I1 sin cerrar al final de la semana 3: se congela el trabajo nuevo hasta cerrarlo · ambos |
| R2 | La aceptación de la PPS 2 depende del visor y del editor de la PPS 1 | Media | Alto | Visor y editor antes que las pantallas de gestión; gestión provisoria con la interfaz de la OpenAPI y datos semilla | Al cierre de I2, el editor no persiste en WSI · Gino |
| R3 | Deriva del contrato, sobre todo en coordenadas | Media | Alto | ADR-05; los mismos casos numéricos en los tres módulos; job de deriva en la CI | Un job de deriva en rojo más de un día · ambos |
| R4 | Configuración de `auth_request` (códigos, cabeceras, redirecciones) | Media | Medio | Se prueba en el esqueleto con los casos 204, 401 y 403; forma parte de la prueba de humo | Falla de la prueba de humo en `/tiles` · ambos |
| R5 | Rendimiento de teselas con WSI reales | Media | Medio | Medir en I2 (QS-4); caché de slides; más workers; caché de autorización en Nginx; pregeneración como extensión | QS-4 no se cumple · Gino |
| R6 | La capa SVG se vuelve lenta con muchas anotaciones | Baja | Medio | Medir con 1.000 polígonos de 50 vértices; carga por región visible como extensión | Arrastre por debajo de 30 cuadros por segundo · Gino |
| R7 | Fuga de datos sensibles (imágenes asociadas, nombres, metadatos, datos en el repositorio) | Baja | Alto | ADR-12, prueba automática de rutas, revisión de los datos de prueba | Cualquier hallazgo · ambos |
| R8 | Claves de sesión no persistidas: cada reinicio cierra todas las sesiones | Media | Bajo | Volumen `dpkeys`; paso de reinicio en el guion | Sesiones perdidas tras un reinicio · Nahuel |
| R9 | Diferencias entre Windows, WSL y Linux (fin de línea, rendimiento de volúmenes) | Media | Bajo | `.gitattributes` con LF; datos dentro del sistema de archivos de WSL; documentación | Script que falla en una sola máquina · ambos |
| R10 | Crecimiento del alcance (YOLO, extras) | Media | Medio | PPS 1 §10 y PPS 2 §9; backlog; YOLO condicional | Una historia fuera de §14 entra al tablero · ambos |
| R11 | La PPS 2 termina antes: errores de la API sin dueño después de su cierre | Alta | Medio | API congelada, documentada y con pruebas en I4; conocimiento compartido por revisiones cruzadas; acuerdo explícito de soporte (§15) | Falla de la API después del cierre de la PPS 2 · ambos |
| R12 | Versiones recién publicadas (MSW 3, PostgreSQL 19, TypeScript 7) | Media | Bajo | ADR-14 | Una actualización rompe la CI · dueño del módulo |
| R13 | El servidor no está disponible a tiempo | Media | Alto | Máquina virtual equivalente con acuerdo de la supervisión (ADR-11) | Sin acceso al servidor al cierre de I3 · Gino |
| R14 | La evaluación individual se vuelve difusa | Media | Medio | `CODEOWNERS`, PR con autor, trazabilidad de épicas (§14), informes separados | Una historia sin dueño único · ambos |
| R15 | Datos de prueba sin licencia clara | Media | Medio | P7 y P8; los scripts documentan fuente y licencia; no se redistribuye | Licencia desconocida al preparar la demostración · ambos |

### 11.2 Deuda técnica aceptada

Deuda que tomamos a sabiendas. Registrarla ahora evita que la próxima cohorte la confunda con un error.

| Deuda | Por qué la aceptamos | Cuándo pagarla |
|---|---|---|
| Sin historial de ediciones, solo creación y última modificación | Alcance de las PPS | Si el grupo necesita auditoría completa (P12) |
| Importación síncrona | Escala chica (CRIC: 400 imágenes) | Si una importación supera un minuto |
| Todas las anotaciones de una imagen en una sola llamada | Pocas anotaciones por imagen | Si R6 o QS-4 lo exigen |
| Autorización por tesela sin caché | Simplicidad y seguridad | Si QS-4 no se cumple |
| Una sola instancia de la API, con migraciones al arrancar | Un único servidor | Si alguna vez se replica la API |
| Sin automatización de pruebas de interfaz | Fuera del alcance de la PPS 1 | Próxima cohorte |
| Sin TLS en local; TLS del servidor pendiente | Entorno de desarrollo | Al definirse P19 |
| Roles mínimos (`admin`, `annotator`) | Lo pide el enunciado | Si hace falta separar permisos por proyecto |
