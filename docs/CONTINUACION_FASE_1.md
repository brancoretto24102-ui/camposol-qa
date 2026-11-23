# Continuar Camposol QA — Fase 1

Actualizado el 23/11/2026 durante la continuación solicitada. Conservar el repositorio y el backend existentes. No iniciar Fase 2 hasta presentar y validar esta fase.

## Fuentes y alcance

- Repositorio privado: https://github.com/brancoretto24102-ui/camposol-qa . Acceso mediante la conexión GitHub autorizado y operativo. Base de esta continuación: `25b59ca48b65924aadf970b3682a70451a79f2ce`.
- Especificación vigente leída: `Texto pegado(2).txt`, PROMPT MAESTRO V2.0, Library `libfile_6bba404ac3148191bf0e729d314daf59`.
- Solo Fase 1: arquitectura, acceso, roles, proyectos, persistencia y seguridad. IA, motor DigiProy, evidencias y Excel esperan fases posteriores.
- Backend ya creado: Supabase `frhmxbdombsqubqlchkj`, nombre `camposol-qa-dev`, URL https://frhmxbdombsqubqlchkj.supabase.co . Creación previamente autorizada con cotización USD 0/mes. No tocar los proyectos anteriores.
- Los registros remotos nuevos son lectores inactivos. La activación inicial exige comprobar identidad, confirmación de correo y UUID exacto. No elevar roles desde `user_metadata` ni elegir contraseñas por el usuario.

## Avance comprobado en esta continuación

1. La red sí permite HTTPS a npm y GitHub a través de la configuración existente; DNS directo todavía falla. `npm ping`, `npm install` y después `npm ci` completaron correctamente. No se modificaron controles de red.
2. Se recuperó el código privado por la conexión GitHub. El comando Git HTTPS sin autenticación no tiene credenciales; no confundirlo con un bloqueo de npm.
3. Se generó un lockfile auténtico desde las versiones fijadas y se verificó una instalación limpia: 33 paquetes. `package-lock.json` tiene SHA-256 `9181c2c091356757e825c6e661f5ee88374f912de36af8436b72be815c6a6b07`.
4. Pasaron 26 pruebas locales, TypeScript y build Vite. Auditoría del lockfile: cero vulnerabilidades.
5. Se observó React en un navegador: configuración inicial, tablero vacío, creación/edición de un proyecto, versión, persistencia al recargar, miembros, historial, roles y cierre.
6. Se revisaron acceso, tablero, menú y formulario a 390 × 844 px en un documento del navegador. No se probó un móvil físico.
7. Se corrigió el acceso al restablecimiento al cambiar el hash en la misma pestaña y el botón de volver; se distinguió el autocompletado de contraseña actual/nueva; se corrigió «con un» en el tablero móvil. Correcciones comprobadas tras recargar.
8. Se obtuvo la clave **publicable** del backend autorizado, se guardó únicamente en `.env.supabase.local` y se compiló el modo Supabase con salida independiente. No hay claves de servicio ni secretos en el repositorio.
9. En Auth se guardó Site URL `http://127.0.0.1:5173/` y dos retornos exactos: la raíz y `http://127.0.0.1:5173/#restablecer`, sin comodines. SMTP personalizado de Gmail ya quedó guardado y habilitado. La configuración preparada usa `smtp.gmail.com`, puerto 587 y nombre de remitente «Camposol QA». Tras recargar el panel se verificó SMTP activo, host Gmail y aviso de contraseña almacenada y oculta. No leer ni registrar el secreto guardado. La entrega real del correo de confirmación personal sí quedó comprobada; recuperación pendiente.
10. Cuenta personal registrada y correo confirmado en Auth. El retorno desde el celular mostró `ERR_CONNECTION_REFUSED` porque `127.0.0.1` apunta al teléfono; la confirmación sí se completó. El usuario autorizó explícitamente activarla como administradora de Camposol QA y se actualizó solo su UUID verificado. Consulta posterior: 1 cuenta Auth, 1 perfil, 1 administrador de aplicación activo y 0 proyectos. No volver a ejecutar las pruebas SQL remotas diseñadas para una base vacía.
11. Se observó un mensaje en inglés por repetir la solicitud de registro. Se añadieron mensajes de Auth en español y un bloqueo de reenvío tras registro exitoso, con instrucciones para confirmar y volver a iniciar sesión. Después del cambio pasaron las 26 pruebas locales y ambos builds. La comprobación interactiva del siguiente registro se hará al crear la segunda cuenta.

El commit de código `4cfaae64d64308820f38539e52de7ac47040c6a9` pasó la [verificación de GitHub 45246134440](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45246134440), incluidos instalación limpia, pruebas, build y auditoría. Los commits posteriores solo de documentación pueden omitir CI.

Los detalles y los límites están en `docs/VERIFICACION_FASE_1.md`.

## Ejecución local

- Directorio de esta tarea: `/workspace/scratch/c3faf9c9dfb2/camposol-qa`.
- `npm ci`, `npm run dev`: interfaz y API SQLite locales, acceso http://127.0.0.1:5173 .
- `npm run build`, `node server/index.mjs`: build local y API en http://127.0.0.1:4317 .
- `.env.supabase.example` es el ejemplo sin clave. `.env.supabase.local` contiene la configuración real local y se ignora en Git.
- `npm run dev:supabase`: Vite conectado al backend existente, sin iniciar SQLite.
- `npm run build:supabase`: salida `dist-supabase/`.
- `npm run preview:supabase`: servir esa salida en http://127.0.0.1:5173 . Se abrió la pantalla real de acceso de este build, identificada como «Desarrollo conectado»; no hay sesión remota autenticada todavía. El servidor de vista previa está iniciado desde la terminal del escritorio; si se reinicia el entorno será necesario iniciarlo de nuevo.

Los comandos de terminal de Work pueden ejecutarse en espacios de red separados: un servidor que escucha en un comando no fue accesible desde otro comando ni desde el navegador de escritorio conectado. La revisión fue posible iniciando el servidor local desde la terminal del escritorio del entorno y usando su navegador. No abrir puertos externos ni modificar las restricciones para resolverlo.

La revisión usó `.data/phase1-visual-fixtures/`, cuatro cuentas ficticias y sesiones preparadas desde el almacén local. El servidor auxiliar `verification/review-server.mjs` no forma parte del código versionado ni de la publicación. No presentar esas sesiones como acceso remoto real. Para credenciales reales, el usuario debe elegir su contraseña en la interfaz.

## Pendientes

1. Iniciar sesión con la cuenta personal ya confirmada y activa. Su contraseña la conoce el usuario: debe introducirla en la aplicación, nunca en el chat. El formulario seguro no aceptó los selectores validados y se prepara ingreso manual en el navegador del entorno. No volver a solicitar su registro ni repetir la confirmación.
2. Registrar y confirmar la cuenta corporativa solicitada. La activación debe usar exclusivamente su UUID confirmado y estar respaldada por autorización del usuario. Sus correos se recuperaron del contexto autorizado; no guardarlos en el repositorio. No introducir contraseñas con herramientas visibles ni pedirlas por el chat.
3. Probar acceso, cierre, proyectos, permisos y recuperación contra Auth real. El correo de confirmación personal ya fue recibido y validado; falta recuperación. Los retornos locales están configurados, pero no abren en el celular del usuario: la app de desarrollo está en el navegador del entorno.
4. Configurar Microsoft cuando se disponga de datos y permisos de Entra. Google sigue deshabilitado.
5. Mantener actualizados este documento y el informe. Presentar Fase 1 antes de pasar a Fase 2. No publicar producción sin la autorización requerida por el prompt.

No volver a crear repositorio, proyecto Supabase ni esquema. No ejecutar `database/phase1-rls-tests.sql` sobre una base con cuentas o proyectos. No ampliar CI a `contents: write`, crear ramas de transporte ni emitir código privado en registros. El flujo conserva `contents: read`.

El ZIP de la ejecución antigua `45227735962` ya no es necesario para instalar o revisar: ahora hay dependencias y builds locales verificados. No depender de su retención de un día.
