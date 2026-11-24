# Continuar Camposol QA — Fase 2

Actualizado el 23/11/2026, hora de Perú. El usuario solicitó expresamente continuar con la Fase 2. Se conservan el repositorio público `brancoretto24102-ui/camposol-qa`, su publicación de GitHub Pages y el backend Supabase `frhmxbdombsqubqlchkj` (`camposol-qa-dev`). No crear otro repositorio, Site ni backend.

## Entrega

Motor manual: aplicaciones, perfiles de metodología versionados, cartillas, información y funcionalidades, selección de casos, aprobación de cada etapa, editor de casos y pasos, vista previa de matriz e historial documental. Inicio y listado muestran el avance calculado de los registros guardados.

La URL principal sigue siendo https://brancoretto24102-ui.github.io/camposol-qa/ . Código publicado `b8f9834a69d29abb6d4863c3d0b605189e3c4e2a`; publicación y verificación de GitHub completadas correctamente. La interfaz se revisó en escritorio y a 390 px con datos ficticios locales; los resultados concretos quedan en [VERIFICACION_FASE_2.md](VERIFICACION_FASE_2.md).

## Uso

1. Crear un proyecto indicando aplicación, código de cartilla, nombre, objetivo y descripción. Abrir su cartilla y seleccionar una metodología aprobada. La versión queda vinculada permanentemente al proyecto.
2. En Contexto, describir funcionamiento y reglas, registrar referencias de las fuentes y las funcionalidades identificadas. Guardar, enviar a revisión y aprobar.
3. En Selección, agregar propuestas, indicar funcionalidad, nombre, justificación y prioridad. Incluir o excluir y ordenar. Guardar, enviar a revisión y aprobar el conjunto.
4. En Casos y pasos, completar requisito, descripción, pasos, argumentos, resultados y comentario. Guardar expresamente el borrador y enviar cada caso a revisión. Los pasos admiten adición, retiro y cambio de orden.
5. Consultar Matriz e Historial. La matriz tiene una fila por caso incluido; los pasos se muestran en celdas con varias líneas. El historial conserva instantáneas completas y permite consultar versiones anteriores, con paginación de veinte en veinte.

Modificar un contenido aprobado o la información principal del proyecto invalida las aprobaciones dependientes. No modifica las instantáneas anteriores. Una actualización enviada con una versión antigua se rechaza para evitar sobrescribir el trabajo de otra persona.

## Fuente DigiProy 1.0

Se leyó el PROMPT MAESTRO V2.0 completo y se inspeccionó la estructura del archivo original `DigiProy_Casos_Prueba_CO_Muestreo_Calidad_Fruta_Campo_E819.xlsx`, sin publicarlo ni copiar sus casos empresariales. SHA-256 del original: `3ddced0c1ab15828a32fca8a78bbb29e5b1445da53bc989a022273ea83113c83`.

| Columna | Encabezado |
| --- | --- |
| A | Nombre Requisito |
| B | ITEM |
| C | Nombre CP |
| D | Descripción Caso de Prueba |
| E | Prioridad |
| F | Paso |
| G | Descripción Paso |
| H | Argumentos |
| I | Resultado Esperado |
| J | REFERENCIA |
| K:M | Comentario |

El encabezado original combina K2:M2. Las prioridades observadas son Alta y Media; el original no contiene validaciones de lista. La versión inicial usa esos valores. Una nueva definición requiere una versión de metodología distinta. Los demás perfiles requieren que el administrador aporte sus fuentes y criterios; no se generan reglas ficticias.

Las referencias en pantalla son identificadores reservados para la fase de evidencias. Esta entrega recopila texto y referencias documentales, no sube documentos, capturas ni archivos de evidencia. No exporta Excel. IA corresponde a Fase 3; evidencias a Fase 4; Hoja de Control y Excel fiel a Fase 5.

## Permisos

- Administrador: aplicaciones, definición y aprobación de metodologías; administración existente; revisión y edición de cartillas.
- Editor activo con acceso de edición al proyecto: contenido manual. Autoaprueba únicamente con permiso vigente y cuando es autor de la versión del contenido.
- Revisor activo asignado como revisor: consulta y aprueba o solicita corrección de contenido de otra persona. Su rol global y el de miembro deben permitirlo.
- Lector: consulta del proyecto asignado y su historial. Una asignación como editor no eleva el rol global de lector.
- Proyecto archivado: cartilla en consulta hasta reabrirlo. Aplicación desactivada: conserva proyectos y metodologías existentes; no admite proyectos nuevos.

La autorización real se evalúa en SQLite o PostgreSQL. No se confía en roles enviados en `user_metadata`, actor, estado de aprobación ni fechas enviados por el cliente.

## Backend y migraciones

Migraciones aditivas aplicadas al proyecto existente:

- `supabase/migrations/20261124000617_camposol_qa_phase2.sql`.
- `supabase/migrations/20261124001645_camposol_qa_phase2_application_access.sql`.

La segunda elimina la recursión de políticas entre aplicaciones y proyectos, detectada en la prueba real. No volver a aplicar migraciones ya registradas. No ejecutar `database/phase1-schema.sql` ni `database/phase1-rls-tests.sql` sobre este backend con cuentas y proyectos.

`qa_methodology_versions` guarda definiciones; `qa_documents` guarda un agregado tipado por proyecto; `qa_document_revisions` conserva instantáneas inmutables. Los cuatro comandos públicos son SECURITY INVOKER y llaman implementaciones privadas acotadas con comprobación del actor. Las tablas tienen RLS y solo lectura directa autenticada; las escrituras pasan por comandos. La vista `qa_progress` respeta RLS con SECURITY INVOKER.

El documento tiene control de concurrencia por versión y límite técnico de 2 MB de texto serializado, sin límite arbitrario de cantidad de casos. Las transacciones bloquean primero el proyecto y después su documento. Las revisiones conservan persona, fecha, acción, versión y observaciones. La metodología aprobada no admite modificación ni eliminación; crear otra versión no cambia los proyectos anteriores.

## Continuación y pendientes

Los pendientes manuales de Fase 1 siguen en [CONTINUACION_FASE_1.md](CONTINUACION_FASE_1.md): segunda cuenta, recuperación real en la URL pública y comprobaciones entre titulares reales. No presentarlos como superados por las pruebas con actores temporales. Microsoft/Google siguen deshabilitados hasta contar con configuración autorizada.

El analizador conserva el aviso previo de protección contra contraseñas filtradas deshabilitada. No se modificó Auth ni el plan para habilitarla. [Referencia oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

El usuario solicitó después implementar Fase 3. Su alcance y resultados están en `docs/CONTINUACION_FASE_3.md`. Revisar esta entrega con una cartilla y reglas reales aportadas por el usuario. No inventar funcionalidades ni casos y no incorporar IA, evidencias o exportaciones fuera de su fase sin una instrucción nueva.
