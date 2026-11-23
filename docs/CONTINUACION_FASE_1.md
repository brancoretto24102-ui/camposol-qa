# Continuar Camposol QA — Fase 1

Actualizado el 23/11/2026 durante la continuación solicitada. Conservar el repositorio y el backend existentes. No iniciar Fase 2 hasta presentar y validar esta fase.

## Publicación actual

El 23/11/2026 el usuario solicitó una URL pública y después autorizó hacer público el repositorio existente para utilizar GitHub Pages. La publicación está completa; la Fase 1 sigue abierta y la Fase 2 no ha comenzado.

- URL principal: https://brancoretto24102-ui.github.io/camposol-qa/
- Repositorio original: `brancoretto24102-ui/camposol-qa`, ahora público. No crear otro repositorio.
- Commit publicado: `9d188a0149b50a4bf295d02d1b85b26035936131`.
- Publicación de GitHub Actions: [45254640994](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254640994), `completed/success`; verificación separada [45254641095](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254641095), correcta.
- Fuente de Pages: GitHub Actions. Flujo `.github/workflows/pages.yml`; build `npm run build:supabase -- --base=/camposol-qa/`; solo se publica `dist-supabase/`.
- Variables de repositorio guardadas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`, con configuración publicable del backend existente. No guardar sus valores en estos documentos.
- Auth Site URL: `https://brancoretto24102-ui.github.io/camposol-qa/`. Se verificó su persistencia al recargar y la lista de seis retornos exactos; se conservan los dos de Sites y los dos locales.
- Se observó la cuenta existente con sesión real y acceso a Administración en GitHub Pages, sin volver a registrarla.
- Publicación anterior de Sites conservada como referencia: `appgprj_6b0491b308848191b56ee56d39ba57a7`, versión 1, despliegue `appgdep_6b049264cb188191b67395a4c01f2ec2`. No crear otro Site ni backend.
- Identidad completa, retornos y futuras actualizaciones: `docs/PUBLICACION_FASE_1.md`.

## Fuentes y alcance

- Repositorio público autorizado: https://github.com/brancoretto24102-ui/camposol-qa . Acceso mediante la conexión GitHub autorizado y operativo. Base de esta continuación: `25b59ca48b65924aadf970b3682a70451a79f2ce`.
- Especificación vigente leída: `Texto pegado(2).txt`, PROMPT MAESTRO V2.0, Library `libfile_6bba404ac3148191bf0e729d314daf59`.
- Solo Fase 1: arquitectura, acceso, roles, proyectos, persistencia y seguridad. IA, motor DigiProy, evidencias y Excel esperan fases posteriores.
- Backend ya creado: Supabase `frhmxbdombsqubqlchkj`, nombre `camposol-qa-dev`, URL https://frhmxbdombsqubqlchkj.supabase.co . Creación previamente autorizada con cotización USD 0/mes. No tocar los proyectos anteriores.
- Los registros remotos nuevos son lectores inactivos. La activación inicial exige comprobar identidad, confirmación de correo y UUID exacto. No elevar roles desde `user_metadata` ni elegir contraseñas por el usuario.

## Avance comprobado en esta continuación

1. La red sí permite HTTPS a npm y GitHub a través de la configuración existente; DNS directo todavía falla. `npm ping`, `npm install` y después `npm ci` completaron correctamente. No se modificaron controles de red.
2. Se recuperó el código por la conexión GitHub cuando el repositorio era privado. El fallo de Git HTTPS sin credenciales de ese momento no era un bloqueo de npm; el repositorio se hizo público posteriormente con autorización del usuario.
3. Se generó un lockfile auténtico desde las versiones fijadas y se verificó una instalación limpia: 33 paquetes. `package-lock.json` tiene SHA-256 `9181c2c091356757e825c6e661f5ee88374f912de36af8436b72be815c6a6b07`.
4. Pasaron 26 pruebas locales, TypeScript y build Vite. Auditoría del lockfile: cero vulnerabilidades.
5. Se observó React en un navegador: configuración inicial, tablero vacío, creación/edición de un proyecto, versión, persistencia al recargar, miembros, historial, roles y cierre.
6. Se revisaron acceso, tablero, menú y formulario a 390 × 844 px en un documento del navegador. No se probó un móvil físico.
7. Se corrigió el acceso al restablecimiento al cambiar el hash en la misma pestaña y el botón de volver; se distinguió el autocompletado de contraseña actual/nueva; se corrigió «con un» en el tablero móvil. Correcciones comprobadas tras recargar.
8. Se obtuvo la clave **publicable** del backend autorizado y se compiló el modo Supabase con salida independiente. La configuración local usa `.env.supabase.local`, ignorado en Git; la publicación de Pages usa las dos variables de repositorio indicadas arriba. No hay claves de servicio ni secretos en el repositorio.
9. En Auth se guardó primero el retorno local y después el de Sites. La configuración actual usa Site URL `https://brancoretto24102-ui.github.io/camposol-qa/` y seis retornos exactos: raíz y `#restablecer` de GitHub Pages y Sites, más los dos locales. Se verificó la persistencia al recargar; no hay comodines. SMTP personalizado de Gmail ya quedó guardado y habilitado. La configuración preparada usa `smtp.gmail.com`, puerto 587 y nombre de remitente «Camposol QA». Tras recargar el panel se verificó SMTP activo, host Gmail y aviso de contraseña almacenada y oculta. No leer ni registrar el secreto guardado. La entrega real del correo de confirmación personal sí quedó comprobada; recuperación pendiente.
10. Cuenta personal registrada y correo confirmado en Auth. El retorno desde el celular mostró `ERR_CONNECTION_REFUSED` porque `127.0.0.1` apunta al teléfono; la confirmación sí se completó. El usuario autorizó explícitamente activarla como administradora de Camposol QA y se actualizó solo su UUID verificado. Consulta posterior: 1 cuenta Auth, 1 perfil, 1 administrador de aplicación activo y 0 proyectos. No volver a ejecutar las pruebas SQL remotas diseñadas para una base vacía. Más tarde se comprobó una sesión real de la administradora, creación de `QA-F1-URL-001`, guardado, recarga e historial remoto; el proyecto quedó archivado, marcado como ficticio y en versión 2. Consulta posterior: 1 cuenta, 1 perfil, 1 administrador activo y 1 proyecto técnico archivado.
11. Se observó un mensaje en inglés por repetir la solicitud de registro. Se añadieron mensajes de Auth en español y un bloqueo de reenvío tras registro exitoso, con instrucciones para confirmar y volver a iniciar sesión. Después del cambio pasaron las 26 pruebas locales y ambos builds. La comprobación interactiva del siguiente registro se hará al crear la segunda cuenta.

12. Antes del cambio a público se revisaron los 11 commits y los 68 blobs de su historial; no se encontraron coincidencias de credenciales ni correos personales en esa revisión. Pasaron las 26 pruebas, la compilación con la ruta de Pages y la auditoría con cero vulnerabilidades. GitHub Actions repitió la instalación, pruebas, auditoría y build; el despliegue terminó correctamente. No hubo cambios de esquema ni de roles para publicar.

El commit de código `4cfaae64d64308820f38539e52de7ac47040c6a9` pasó la [verificación de GitHub 45246134440](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45246134440), incluidos instalación limpia, pruebas, build y auditoría. Los commits posteriores solo de documentación pueden omitir CI.

Los detalles y los límites están en `docs/VERIFICACION_FASE_1.md`.

## Ejecución local

- Directorio de esta tarea: `/workspace/scratch/c3faf9c9dfb2/camposol-qa`.
- `npm ci`, `npm run dev`: interfaz y API SQLite locales, acceso http://127.0.0.1:5173 .
- `npm run build`, `node server/index.mjs`: build local y API en http://127.0.0.1:4317 .
- `.env.supabase.example` es el ejemplo sin clave. `.env.supabase.local` contiene la configuración real local y se ignora en Git.
- `npm run dev:supabase`: Vite conectado al backend existente, sin iniciar SQLite.
- `npm run build:supabase`: salida `dist-supabase/`.
- `npm run preview:supabase`: servir esa salida en http://127.0.0.1:5173 . Se abrió la pantalla real de acceso de este build, identificada como «Desarrollo conectado»; se comprobó posteriormente una sesión remota real con Administración visible y sin errores. La vista previa anterior se inició desde la terminal del escritorio; después de un reinicio no se debe asumir que siga activa. La URL pública funciona de forma independiente.

Los comandos de terminal de Work pueden ejecutarse en espacios de red separados: un servidor que escucha en un comando no fue accesible desde otro comando ni desde el navegador de escritorio conectado. La revisión fue posible iniciando el servidor local desde la terminal del escritorio del entorno y usando su navegador. No abrir puertos externos ni modificar las restricciones para resolverlo.

La revisión usó `.data/phase1-visual-fixtures/`, cuatro cuentas ficticias y sesiones preparadas desde el almacén local. El servidor auxiliar `verification/review-server.mjs` no forma parte del código versionado ni de la publicación. No presentar esas sesiones como acceso remoto real. Para credenciales reales, el usuario debe elegir su contraseña en la interfaz.

## Pendientes

1. Continuar las comprobaciones en la URL principal de GitHub Pages. La cuenta personal ya confirmó el correo, está activa como administradora y se observó su sesión real también en esta URL. No solicitar otra vez su registro. El usuario introduce las contraseñas directamente en el sitio, nunca en el chat.
2. Registrar y confirmar la cuenta corporativa solicitada. La activación debe usar exclusivamente su UUID confirmado y estar respaldada por autorización del usuario. Sus correos se recuperaron del contexto autorizado; no guardarlos en el repositorio. No introducir contraseñas con herramientas visibles ni pedirlas por el chat.
3. Completar cierre, permisos entre cuentas y recuperación en la URL pública. El ingreso de la administradora y la persistencia e historial del proyecto técnico sí se comprobaron contra Supabase real. El correo de confirmación personal ya fue recibido y validado; falta el flujo completo de recuperación. Las URL públicas de retorno ya están guardadas.
4. Configurar Microsoft cuando se disponga de datos y permisos de Entra. Google sigue deshabilitado.
5. Presentar y validar Fase 1 antes de comenzar Fase 2. La publicación pública de esta versión ya fue autorizada y realizada; conservar los permisos de aplicación y el backend existente.

No volver a crear repositorio, proyecto Supabase ni esquema. No ejecutar `database/phase1-rls-tests.sql` sobre una base con cuentas o proyectos. No ampliar CI a `contents: write` ni crear ramas de transporte. El flujo de verificación conserva `contents: read`. Solo el job de publicación de Pages obtiene `pages: write` e `id-token: write`, después de compilar y comprobar el proyecto.

El ZIP de la ejecución antigua `45227735962` ya no es necesario para instalar o revisar: ahora hay dependencias y builds locales verificados. No depender de su retención de un día.
