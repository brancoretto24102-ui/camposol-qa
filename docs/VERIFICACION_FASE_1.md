# Verificación · Fase 1

Fecha: 23/11/2026. Versión 0.1.0. Continuación del código existente en `main`, base `25b59ca48b65924aadf970b3682a70451a79f2ce`; sin crear otro repositorio ni backend.

| Componente | Resultado observado en esta continuación |
| --- | --- |
| Red local | HTTPS operativo mediante la configuración del entorno. `npm ping` y descargas npm correctos; DNS directo todavía falla. No se modificaron controles de red. |
| Repositorio | Código recuperado mediante la conexión autorizada cuando era privado. El usuario autorizó hacerlo público para GitHub Pages; se conservan el repositorio y su historial. |
| Dependencias | Instalación real desde las versiones fijadas y generación de `package-lock.json`; reinstalación limpia con `npm ci` correcta, 33 paquetes instalados. |
| Lockfile | SHA-256 `9181c2c091356757e825c6e661f5ee88374f912de36af8436b72be815c6a6b07`. No se inventó ni se copió un lockfile de otro proyecto. |
| Pruebas automatizadas locales | 26 superadas, 0 fallos, 0 omitidas, después de las correcciones. |
| Compilación local | TypeScript sin errores y Vite 8.3.8, Node 24.22.3; salida `dist/`. |
| Compilación Supabase | Correcta con URL y clave publicable del backend existente; salida separada `dist-supabase/`. La configuración local no se versiona. |
| Auditoría npm | 0 vulnerabilidades informadas para el lockfile generado. |
| Interfaz escritorio | React observado en Chromium: configuración inicial, tablero vacío, proyecto, miembros, historial y administración. |
| Interfaz móvil | Acceso, tablero, menú y formulario observados en un viewport de documento de 390 × 844 px; sin desbordamiento horizontal de la página. No se probó un teléfono físico. |
| Supabase existente | `frhmxbdombsqubqlchkj`, nombre `camposol-qa-dev`, estado ACTIVE_HEALTHY; costo de creación autorizado previamente: USD 0/mes. |
| Estado remoto de datos | Después del registro: 1 cuenta Auth, 1 perfil, 1 administrador de aplicación activo y 1 proyecto técnico ficticio, archivado en versión 2. No repetir el script RLS de inicialización. |
| Revisión de seguridad Supabase | Sin observaciones en el analizador consultado en esta continuación. |
| RLS y almacenamiento privado | Se conservan las 30 verificaciones remotas previas, realizadas con transacción revertida. No se repitió el script SQL ni se reaplicó el esquema. |
| Cuentas administradoras remotas | Primera cuenta personal confirmada y activada con autorización explícita, por su UUID exacto. Segunda cuenta pendiente. Sesión administradora real comprobada, con Administración visible y sin errores. |
| Retornos de Auth | Site URL `https://brancoretto24102-ui.github.io/camposol-qa/`; 6 retornos exactos: raíz y `#restablecer` de Pages, los dos de Sites y los dos locales. Guardado y verificado tras recargar. |
| Correo | SMTP Gmail guardado y activo. El usuario recibió el enlace de confirmación y Auth registra el correo confirmado. Recuperación pendiente. |
| Microsoft y Google | Preparados y deshabilitados; Microsoft requiere datos y permisos Entra. |
| Publicación de Fase 1 | Principal: https://brancoretto24102-ui.github.io/camposol-qa/, GitHub Pages y HTTPS, despliegue correcto del commit `9d188a0149b50a4bf295d02d1b85b26035936131`. Sites versión 1 queda como publicación anterior. Fase 2 no iniciada. |

La verificación de GitHub también terminó correctamente para el commit `4cfaae64d64308820f38539e52de7ac47040c6a9`: [ejecución 45246134440](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45246134440). Instalación con lockfile, pruebas, tipos, build, auditoría e informe: todos correctos.

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

## Comprobación contra el backend real y publicación

Con la cuenta personal ya confirmada y activada se observó una sesión real, menú Administración y ausencia de errores de carga. Desde esa sesión se creó el proyecto `QA-F1-URL-001` («Prueba técnica de Fase 1 — datos ficticios»), se guardó como archivado, se recargó y se observó su versión 2 y los eventos de creación y actualización. SQL de solo lectura confirmó 1 cuenta, 1 perfil, 1 administrador activo y el proyecto técnico archivado en versión 2. No se ejecutó el script RLS reservado para una base vacía.

La publicación inicial de Sites usó el código compilado verificado. Allí se revisaron la pantalla de acceso sin barrera de ChatGPT y los formularios de registro y recuperación. Esta observación no sustituye un inicio de sesión ni una recuperación completos en el dominio público. El paquete contiene solamente los 4 activos de la interfaz y su manifiesto; no incluye documentos, cuentas, SQLite, SMTP ni claves de servicio. El acceso a datos continúa sujeto a Supabase Auth y RLS.

## Publicación en GitHub Pages

El usuario autorizó hacer público el repositorio original. Antes del cambio se revisaron 11 commits y 68 blobs del historial, sin coincidencias de credenciales ni correos personales en la revisión realizada. Se conservan los controles de Auth y RLS y el backend original.

Se repitieron las 26 pruebas locales, TypeScript y el build Supabase con `--base=/camposol-qa/`; las rutas de los activos apuntan al subdirectorio correcto. La auditoría npm informó cero vulnerabilidades. El flujo de Pages instala con el lockfile, valida las variables publicables, ejecuta pruebas y auditoría, compila y publica solo `dist-supabase/`.

El commit `9d188a0149b50a4bf295d02d1b85b26035936131` pasó la [publicación 45254640994](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254640994) y la [verificación 45254641095](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254641095). GitHub muestra el sitio activo con fuente GitHub Actions y HTTPS obligatorio.

Se observó la sesión real de la cuenta existente en la nueva URL, ruta `#inicio`, con Administración y Cerrar sesión disponibles. Site URL de Supabase se cambió a Pages; después de recargar persistieron el valor y los seis retornos exactos. No se volvió a registrar la cuenta, no se modificaron roles ni se ejecutó SQL para esta publicación. Esta comprobación no completa el cierre, la recuperación ni los permisos entre dos cuentas.

## Correcciones incluidas

1. Sincronizar el modo de acceso con los cambios de la ruta de restablecimiento en la misma pestaña; limpiar esa ruta al volver al acceso.
2. Distinguir `autocomplete=current-password` al ingresar y `new-password` al registrar o restablecer.
3. Conservar el espacio de «con un» cuando se oculta el salto de línea del tablero en móvil.
4. Versionar el lockfile real y hacer que CI instale exclusivamente con `npm ci`.
5. Separar los comandos y las salidas de compilación local y Supabase.
6. Tras observar un aviso de reenvío de registro en inglés, traducir los errores comunes de Auth y bloquear un nuevo envío después del éxito; indicar confirmar y volver a la misma ventana para ingresar. Ambos builds y las 26 pruebas locales pasaron después del cambio; la siguiente alta real permitirá revisar ese estado interactivo.

Se reprodujeron en navegador los fallos de ruta y texto antes del cambio, y se observaron los resultados corregidos después de recargar el build.

## Cobertura automatizada conservada

Alta inicial protegida; scrypt; contraseña incorrecta; cierre; cookie HttpOnly/SameSite; CSRF y origen; límite de intentos; aislamiento de proyectos; lector/revisor; miembros y revocación; autoelevación; cuenta inactiva; último administrador; concurrencia; persistencia SQLite; recuperación de un solo uso; auditoría; validaciones y JSON mal formado; indicadores calculados desde los registros. La recuperación HTTP cubre los orígenes 5173 y 4317, un solo uso y revocación de sesiones.

## Límites y controles pendientes

- Primera cuenta personal ya confirmada y activada con autorización explícita; segunda cuenta pendiente de registro, confirmación y activación autorizada. Usar únicamente UUID verificados, sin confiar en metadatos del navegador ni coincidencias parciales de correo.
- Ingreso de la administradora, guardado, persistencia e historial remotos comprobados. Falta cierre y completar permisos entre cuentas reales y recuperación en la URL pública.
- El primer retorno local falló en el teléfono aunque Auth confirmó el correo. Ya se configuraron y verificaron los retornos HTTPS del sitio publicado. Falta validar un enlace de recuperación completo desde el dominio público.
- SMTP de Gmail guardado y confirmación personal entregada; falta recuperación. La contraseña de la cuenta ya fue elegida por el usuario y la del SMTP permanece oculta; no leerlas, versionarlas ni pedirlas por chat.
- Microsoft exige configuración y permisos de Entra; Google permanece deshabilitado.
- No se observó en navegador un cambio completo de contraseña con credenciales reales; el backend local sí tiene pruebas automatizadas de ese flujo.
- Las verificaciones actuales no cubren carga de archivos, URLs firmadas, IA, metodologías completas ni exportación Excel; pertenecen a fases posteriores.

La Fase 1 continúa abierta hasta completar estos controles. Su interfaz ya está publicada por petición expresa del usuario; los módulos de las fases siguientes siguen pendientes.
