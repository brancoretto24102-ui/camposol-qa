# Verificación de Fase 2

Fecha: 23/11/2026, hora de Perú. Código sobre la base `6f6c576ec942b4e1cf1d19cb1d1feddd072dacf2` del repositorio existente. Los sellos de las migraciones usan UTC y corresponden al día 24 en el servidor.

## Pruebas ejecutadas

- `npm test`: **40 pruebas superadas**, cero fallos, omitidas o canceladas. Incluye las 26 anteriores y 14 nuevas de Fase 2.
- `npm run build`: TypeScript y compilación local correctos.
- `npm run build:supabase -- --base=/camposol-qa/`: TypeScript y compilación Supabase correctos, con la ruta del sitio existente.
- `npm audit --audit-level=high --json`: cero vulnerabilidades informadas. No se añadieron dependencias.
- `database/phase2-rls-tests.sql`: **44 comprobaciones directas superadas** en Supabase mediante actores y datos ficticios dentro de una transacción revertida.

Las pruebas locales cubren el flujo manual, aislamiento, intersección de roles, permiso y autoría para autoaprobación, invalidación y conservación de versiones aprobadas, pasos incompletos, exclusión y orden, edición concurrente, metodologías inmutables, aplicaciones versionadas, paginación de historial, metadatos de aprobación falsificados, tamaño de solicitudes, sesión y CSRF.

Las comprobaciones PostgreSQL incluyen acceso anónimo revocado, bloqueo de escritura directa, creación y lectura del propietario, revisores asignados, lector no elevado por membresía, editor ajeno aislado, cuentas inactivas, versiones antiguas, aprobaciones construidas por el servidor, cambio de ficha, avance real, metodología fijada, catálogo y proyectos con aplicaciones inactivas, y conservación de cartillas archivadas.

## Resultado remoto

Después del ROLLBACK de las pruebas: **1 cuenta Auth, 1 proyecto y 0 documentos QA**. Se conserva la cuenta administradora existente y el proyecto ficticio archivado de Fase 1. Ninguno de los siete usuarios de prueba, proyectos, aplicaciones, versiones o casos temporales quedó guardado.

Se detectó y corrigió una recursión en RLS de aplicaciones/proyectos antes de publicar; se ejecutó nuevamente el conjunto completo, incluyendo lectura de aplicaciones inactivas únicamente para proyectos autorizados.

Migraciones registradas en el mismo backend:

| Versión UTC | Nombre |
| --- | --- |
| 20261124000617 | camposol_qa_phase2 |
| 20261124001645 | camposol_qa_phase2_application_access |

Tablas nuevas con RLS habilitado. La inspección de seguridad no añadió observaciones de tablas, funciones o vistas. Permanece el aviso previo `auth_leaked_password_protection`: [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Publicación e interfaz

Código publicado: [`b8f9834a69d29abb6d4863c3d0b605189e3c4e2a`](https://github.com/brancoretto24102-ui/camposol-qa/commit/b8f9834a69d29abb6d4863c3d0b605189e3c4e2a).

- [Publicación Pages 45296454074](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45296454074): `completed/success`.
- [Verificación 45296454081](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45296454081): `completed/success`. El flujo conserva su nombre histórico «Verificar Fase 1», pero ejecuta las 40 pruebas presentes.
- Se abrió https://brancoretto24102-ui.github.io/camposol-qa/ y se observó la pantalla real de acceso. El HTML servido enlaza `index-Da5fpYsU.js` e `index-DjNatCwZ.css`, correspondientes al nuevo build. No se volvió a registrar ni se modificó la cuenta administradora.

La conexión del navegador del usuario no estaba disponible durante esta revisión. Se usó el navegador del entorno para observar el acceso público y se comprobó el flujo de edición completo sobre una base **SQLite local separada**, con cuatro perfiles ficticios y un servidor auxiliar no versionado. Estas sesiones de prueba no son sesiones remotas reales.

Revisión interactiva local comprobada:

1. Perfil DigiProy 1.0 aprobado; alta de una cartilla ficticia desde la interfaz y vinculación de la metodología.
2. Registro de contexto, fuente y funcionalidad; guardado, envío y aprobación.
3. Selección de dos casos, prioridades Alta/Media y justificaciones; guardado, envío y aprobación.
4. Caso con dos pasos: descripción, argumentos y resultados esperados; vista previa inmediata.
5. «Caso siguiente» exige guardar expresamente el borrador. Se guardó y volvió al caso anterior, conservando ambos pasos y sus resultados.
6. Envío y aprobación del primer caso. Indicador real: uno de dos casos aprobados, avance 50 %; el segundo quedó en borrador.
7. Matriz con dos filas de caso, pasos numerados en celdas con varias líneas y Comentario en K:M.
8. Recarga de la página e historial con once versiones. Consulta de una instantánea anterior desde la interfaz.
9. Vista a 390 × 844 px: pestañas y lista de casos con desplazamiento interno, campos y pasos legibles. El cuerpo tuvo ancho útil de 375 px y el mismo ancho de desplazamiento, sin desbordamiento horizontal de página. Es una comprobación en navegador, no en un teléfono físico.

El servidor auxiliar se detuvo al finalizar y se cerraron las pestañas de datos ficticios. El sitio público quedó disponible para revisión. No se añadieron proyectos ni casos ficticios al backend remoto durante esta comprobación visual.

## Límites

La revisión de la interfaz autenticada de Fase 2 utilizó SQLite; los permisos y comandos PostgreSQL se comprobaron separadamente con la transacción RLS. No se afirma haber probado el flujo de Fase 2 desde la sesión remota real. Los actores de prueba no son titulares reales ni prueban entrega de correo. Siguen pendientes la segunda cuenta y la recuperación de Fase 1. El archivo empresarial original no se publica. La matriz es una vista previa HTML: no constituye una exportación ni una validación de fidelidad Excel. No hay IA, subida de documentos, evidencias ni Hoja de Control en esta entrega.
