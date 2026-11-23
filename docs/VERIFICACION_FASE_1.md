# Verificación · Fase 1

Fecha: 23/11/2026. Versión 0.1.0. Continuación del código existente en `main`, base `25b59ca48b65924aadf970b3682a70451a79f2ce`; sin crear otro repositorio ni backend.

| Componente | Resultado observado en esta continuación |
| --- | --- |
| Red local | HTTPS operativo mediante la configuración del entorno. `npm ping` y descargas npm correctos; DNS directo todavía falla. No se modificaron controles de red. |
| Código privado | Recuperado mediante la conexión GitHub autorizada. Git HTTPS sin credenciales no permite clonar este repositorio privado. |
| Dependencias | Instalación real desde las versiones fijadas y generación de `package-lock.json`; reinstalación limpia con `npm ci` correcta, 33 paquetes instalados. |
| Lockfile | SHA-256 `9181c2c091356757e825c6e661f5ee88374f912de36af8436b72be815c6a6b07`. No se inventó ni se copió un lockfile de otro proyecto. |
| Pruebas automatizadas locales | 26 superadas, 0 fallos, 0 omitidas, después de las correcciones. |
| Compilación local | TypeScript sin errores y Vite 8.3.8, Node 24.22.3; salida `dist/`. |
| Compilación Supabase | Correcta con URL y clave publicable del backend existente; salida separada `dist-supabase/`. La configuración local no se versiona. |
| Auditoría npm | 0 vulnerabilidades informadas para el lockfile generado. |
| Interfaz escritorio | React observado en Chromium: configuración inicial, tablero vacío, proyecto, miembros, historial y administración. |
| Interfaz móvil | Acceso, tablero, menú y formulario observados en un viewport de documento de 390 × 844 px; sin desbordamiento horizontal de la página. No se probó un teléfono físico. |
| Supabase existente | `frhmxbdombsqubqlchkj`, nombre `camposol-qa-dev`, estado ACTIVE_HEALTHY; costo de creación autorizado previamente: USD 0/mes. |
| Estado remoto de datos | Consulta de lectura confirmó 0 cuentas Auth, 0 perfiles y 0 proyectos antes del alta de usuarios. Los datos visuales son exclusivamente locales. |
| Revisión de seguridad Supabase | Sin observaciones en el analizador consultado en esta continuación. |
| RLS y almacenamiento privado | Se conservan las 30 verificaciones remotas previas, realizadas con transacción revertida. No se repitió el script SQL ni se reaplicó el esquema. |
| Cuentas administradoras remotas | Pendientes de registro y confirmación por sus titulares; contraseñas elegidas por ellos. |
| Retornos de Auth | Site URL `http://127.0.0.1:5173/` y dos retornos exactos guardados en el proyecto existente: raíz y `#restablecer`. |
| Correo | El usuario eligió Gmail personal. Datos de SMTP preparados en el panel; falta que introduzca una contraseña de aplicación y guarde. SMTP aún no se da por activado; recepción pendiente. |
| Microsoft y Google | Preparados y deshabilitados; Microsoft requiere datos y permisos Entra. |
| Publicación productiva | No realizada. La Fase 2 no se ha iniciado. |

La verificación de GitHub también terminó correctamente para el commit `3e03f3dfaefebd60047f8b994a4859a3ad3e7bf3`: [ejecución 45240846506](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45240846506). Instalación con lockfile, pruebas, tipos, build, auditoría e informe: todos correctos.

## Revisión funcional observada en navegador

Se utilizó una base SQLite separada en `.data/phase1-visual-fixtures/`, con cuatro perfiles ficticios y un proyecto de prueba, sin información empresarial. Para inspeccionar las vistas por rol se prepararon sesiones de prueba desde el almacén local. Esta revisión **no equivale a un inicio de sesión real contra Supabase**, ni sustituye las pruebas HTTP de autenticación.

| Acción | Evidencia observada |
| --- | --- |
| Crear proyecto | Proyecto de prueba guardado y abierto desde React. |
| Editar y recuperar | Objetivo actualizado, versión 2, contenido conservado al recargar. |
| Asignar miembros | Editor, revisor y lector añadidos desde la interfaz; eventos presentes en el historial. |
| Editor | Puede editar el proyecto asignado; Administración no aparece en su menú. |
| Lector y revisor | Proyecto en consulta, sin controles de guardar ni crear. |
| Último administrador | El intento de desactivarlo fue rechazado con el mensaje correspondiente. |
| Cierre de sesión | Regreso visible al acceso; el token se revoca en las pruebas HTTP. |
| Recuperación local | Solicitud desde React y aviso del buzón de desarrollo; no se envió correo real. |
| Enlace en la misma pestaña | Cambio desde recuperación a `#restablecer` muestra ahora el formulario de nueva contraseña. |
| Retorno desde restablecimiento | El botón de volver elimina la ruta de recuperación y muestra el acceso. |
| Móvil | Pantallas reales renderizadas en un iframe local de ancho 390 px; menú abre y cierra, y el formulario se distribuye en una columna. |

La captura de móvil usa el mismo build de React y la API SQLite real, con un documento `srcdoc` del tamaño indicado. No es emulación de un dispositivo ni una maqueta. El servidor y las rutas auxiliares de revisión viven en `verification/`, se excluyen del repositorio y de la aplicación publicada. El servidor normal conserva sus validaciones y su política de contenido.

## Correcciones incluidas

1. Sincronizar el modo de acceso con los cambios de la ruta de restablecimiento en la misma pestaña; limpiar esa ruta al volver al acceso.
2. Distinguir `autocomplete=current-password` al ingresar y `new-password` al registrar o restablecer.
3. Conservar el espacio de «con un» cuando se oculta el salto de línea del tablero en móvil.
4. Versionar el lockfile real y hacer que CI instale exclusivamente con `npm ci`.
5. Separar los comandos y las salidas de compilación local y Supabase.

Se reprodujeron en navegador los fallos de ruta y texto antes del cambio, y se observaron los resultados corregidos después de recargar el build.

## Cobertura automatizada conservada

Alta inicial protegida; scrypt; contraseña incorrecta; cierre; cookie HttpOnly/SameSite; CSRF y origen; límite de intentos; aislamiento de proyectos; lector/revisor; miembros y revocación; autoelevación; cuenta inactiva; último administrador; concurrencia; persistencia SQLite; recuperación de un solo uso; auditoría; validaciones y JSON mal formado; indicadores calculados desde los registros. La recuperación HTTP cubre los orígenes 5173 y 4317, un solo uso y revocación de sesiones.

## Límites y controles pendientes

- Registrar y confirmar las dos cuentas ya solicitadas. Activar exclusivamente sus UUID verificados; no confiar en metadatos del navegador ni asignar administradores por coincidencia parcial de correo.
- Comprobar inicio, cierre, proyectos y permisos con cuentas remotas reales.
- Redirecciones locales ya guardadas y comprobadas en el panel: `http://127.0.0.1:5173/` y `http://127.0.0.1:5173/#restablecer`. Falta probar el retorno completo con correo real.
- El usuario eligió su Gmail personal para SMTP. Se prepararon remitente y usuario en el panel, host `smtp.gmail.com`, puerto 587 y nombre «Camposol QA», sin guardar todavía. Falta que el usuario cree e introduzca su contraseña de aplicación de Google y guarde los ajustes; después hay que comprobar envío y recepción. La verificación en dos pasos es un requisito de Google para crear esa contraseña. No se obtuvo ni se guardó ese secreto. [Configuración oficial de Google](https://support.google.com/accounts/answer/185833?hl=es). No desactivar la confirmación ni añadir administradores de infraestructura como sustituto del envío. La restricción del servicio integrado se contrastó con la [documentación oficial](https://supabase.com/docs/guides/auth/auth-smtp).
- Microsoft exige configuración y permisos de Entra; Google permanece deshabilitado.
- No se observó en navegador un cambio completo de contraseña con credenciales reales; el backend local sí tiene pruebas automatizadas de ese flujo.
- Las verificaciones actuales no cubren carga de archivos, URLs firmadas, IA, metodologías completas ni exportación Excel; pertenecen a fases posteriores.

La Fase 1 continúa abierta hasta completar estos controles. No se ha publicado una web productiva.
