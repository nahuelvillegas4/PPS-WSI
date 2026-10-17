## 15. Pendientes para la supervisión

Cada pendiente trae nuestra propuesta: si la supervisión la acepta, pasa a `DECIDIDO` sin más trabajo. La columna «Decidir antes de» indica qué incremento se frena si la respuesta no llega. Las preguntas remiten a la Guía §9.

| # | Pregunta | Nuestra propuesta | Decidir antes de | Guía |
|---|---|---|---|---|
| S1 | ¿Cómo se reparte el editor de anotaciones? | Opción A de ADR-08: interfaz en la PPS 1; reglas, persistencia y autoría en la PPS 2 | Fin de I0 | P1, P2 |
| S2 | ¿Cuándo y cómo accedemos al servidor (sistema, recursos, Docker, SSH, ubicación de las imágenes)? | Acceso antes del cierre de I3; si no, validación en una máquina virtual equivalente | I3 | P18 |
| S3 | ¿Hay acceso desde fuera del laboratorio? ¿TLS o proxy existente? | Solo red del laboratorio; TLS si hay certificado o proxy. Las teselas ya requieren sesión | I4 | P19 |
| S4 | ¿CRIC o CCEDD? ¿Qué subconjunto y con qué condiciones de uso? | CRIC, unas 50 imágenes, sin redistribuirlas; los scripts documentan la fuente | I2 | P6, P7 |
| S5 | Puntos de CRIC: ¿tipo «punto» o cajas? ¿De qué tamaño? | Cajas de 100 px de lado, recortadas a la imagen, con el punto original en `provenance` | I2 | P5 |
| S6 | ¿Qué WSI de prueba? ¿Tiene el grupo SVS propias? | CMU-1.svs de OpenSlide (licencia: `VERIFICAR`) y, si existe, una del grupo | I1 | P8 |
| S7 | ¿Formato externo? ¿Con qué framework entrena el grupo? | COCO obligatorio; YOLO solo si sobra tiempo | I2 | P15 |
| S8 | ¿Cómo se exportan las WSI? | Imagen completa en nivel 0, sin recortes | I3 | P16 |
| S9 | ¿Las exportaciones incluyen las imágenes? | No: referencian la clave de almacenamiento en el servidor | I3 | — |
| S10 | ¿Hay una convención previa de JSON interno? ¿GeoJSON para QuPath? | Formato propio 1.x; GeoJSON como extensión | I2 | P17 |
| S11 | Modelo: imagen en varios datasets, clases con uso, autor y fecha, permisos entre revisores, atributos extra | ADR-07: un dataset por imagen; clases en uso no se borran; creación y última modificación; nadie edita lo ajeno; una clase y sin atributos extra | I1 | P10–P14 |
| S12 | ¿Alcanza con altas de usuarios por un administrador, sin pantalla? | Sí en v1 (endpoint y script); la pantalla va al backlog | I2 | — |
| S13 | ¿Las imágenes del grupo están anonimizadas? | Nunca servir `label` ni `macro`; la anonimización ocurre fuera del sistema | I2 | P9 |
| S14 | ¿Qué repositorio institucional y qué CI? | GitHub con Actions en un único repositorio; migrable a GitLab | I0 | P21 |
| S15 | ¿Qué se espera de las «pruebas mínimas automatizadas»? | El criterio de §8.9: cada criterio de aceptación con una prueba o un paso del guion; sin porcentaje fijo | I1 | P23 |
| S16 | ¿Quién atiende los errores de la API después del cierre de la PPS 2? | API congelada y documentada en I4; acuerdo explícito de soporte | I4 | — |
| S17 | ¿Python y .NET son aceptables para la mantenibilidad futura? | Sí: el servicio de teselas es chico y estable, y cada lenguaje está donde es más fuerte | I0 | P22 |
| S18 | ¿Cuántos usuarios simultáneos y cuántas imágenes se esperan? | Pocos usuarios; validar los supuestos de QS-4 | I2 | P20 |
| S19 | ¿Cada cuánto nos reunimos y cómo se formaliza un cambio? | Reunión semanal con demostración; cambios por issue y ADR (§12.7) | I0 | P24 |
