# Verificación de Fase 2

Fecha: 23/11/2026, hora de Perú. Código sobre la base `6f6c576ec942b4e1cf1d19cb1d1feddd072dacf2` del repositorio existente. Los sellos de las migraciones usan UTC y corresponden al día 24 en el servidor.

## Pruebas ejecutadas

- `npm test`: **40 pruebas superadas**, cero fallos, omitidas o canceladas. Incluye las 26 anteriores y 14 nuevas de Fase 2.
- `npm run build`: TypeScript y compilación local correctos.
- `npm run build:supabase -- --base=/camposol-qa/`: TypeScript y compilación Supabase correctos, con la ruta del sitio existente.
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

Pendiente de registrar en este documento el commit de código, los resultados de ambos flujos de GitHub y la revisión interactiva de la URL pública. No inferir publicación ni revisión visual a partir de una compilación.

## Límites

Los actores de prueba no son titulares reales ni prueban entrega de correo. Siguen pendientes la segunda cuenta y la recuperación de Fase 1. El archivo empresarial original no se publica. La matriz es una vista previa HTML: no constituye una exportación ni una validación de fidelidad Excel. No hay IA, subida de documentos, evidencias ni Hoja de Control en esta entrega.
