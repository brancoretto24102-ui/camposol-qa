# Camposol QA — ingreso con Google

Actualizado el 24/11/2026, hora de Perú. Petición: ingresar con una cuenta Gmail desde la página existente. Se conserva el repositorio, GitHub Pages, Supabase, SMTP, Groq, perfiles, roles y proyectos. No crear otro backend ni reutilizar credenciales de otra aplicación.

## Implementación

- Botón **Continuar con Google**, habilitado mediante `VITE_GOOGLE_ENABLED=true` después de comprobar la configuración remota. Muestra el estado de apertura y evita envíos simultáneos; un error permite intentarlo de nuevo.
- `src/oauth.ts` construye la solicitud al SDK oficial de Supabase con proveedor `google`, permisos `openid email profile` y selector de cuenta. No solicita permisos del buzón Gmail.
- Se conserva PKCE y la sesión en `sessionStorage`, ya utilizados por la aplicación. El retorno se calcula desde el origen y la ruta actuales y elimina parámetros y fragmentos; solo admite HTTPS o HTTP de desarrollo en loopback. La lista exacta de retornos permitidos continúa siendo responsabilidad de Auth.
- Microsoft conserva su proveedor `azure`, permiso `email` y bandera desactivada. No se modifican las funciones ni las políticas de autorización.
- El inicio de sesión no concede permisos de aplicación. Los perfiles nuevos siguen siendo lectores inactivos y requieren activación administrativa. No asignar roles a partir de metadatos de Google ni fusionar cuentas manualmente.

## Configuración exacta

| Campo | Valor |
| --- | --- |
| Aplicación | Camposol QA |
| Proyecto Google Cloud dedicado | `camposol-qa` |
| Tipo de público | Usuarios externos |
| Tipo de cliente OAuth | Aplicación web |
| Nombre del cliente | Camposol QA Web |
| Origen JavaScript | `https://brancoretto24102-ui.github.io` |
| URI de redireccionamiento OAuth | `https://frhmxbdombsqubqlchkj.supabase.co/auth/v1/callback` |
| Sitio y retorno de la aplicación | `https://brancoretto24102-ui.github.io/camposol-qa/` |

El origen JavaScript no contiene `/camposol-qa/`. El callback pertenece a Supabase; no se sustituye por la dirección de Pages.

El ID y el secreto del cliente se guardan únicamente en Authentication → Sign In / Providers → Google del proyecto Supabase `frhmxbdombsqubqlchkj`. Conservar desactivadas las opciones **Skip nonce checks** y **Allow users without an email**. No leer, revelar, copiar al chat ni versionar el secreto. No incorporar contraseñas de Gmail al flujo OAuth.

La consola de Google mantiene público **Usuarios externos**, estado **Prueba** y cero usuarios de prueba. La ayuda oficial de Google establece una excepción para solicitudes limitadas a `openid`, `userinfo.email` y `userinfo.profile` (o sus equivalentes OpenID Connect): no requieren lista de usuarios de prueba, no muestran el aviso de app de prueba y no caducan a los siete días. Este flujo solicita exclusivamente esos datos. No ampliar los permisos sin revisar de nuevo estas restricciones. No se ha publicado ni verificado la marca de Google; la pantalla puede identificar el dominio de Supabase en lugar del nombre y logotipo. Las políticas particulares de una cuenta administrada pueden impedir el acceso.

La aceptación de las condiciones, la creación final de credenciales y el consentimiento de acceso se completan con el titular en las consolas oficiales.

## Estado verificado

1. El proveedor Google estaba deshabilitado en los ajustes públicos de Auth. La publicación anterior conserva el ingreso por correo y contraseña.
2. Se creó el proyecto Google Cloud dedicado `camposol-qa`, **Camposol QA**, sin habilitar facturación. No se modificó el proyecto S-21 Monterrico.
3. El titular aceptó personalmente la política de Google y creó la configuración. La consola confirmó **Se creó la configuración de OAuth**. Se usó el nombre Camposol QA, asistencia y contacto del titular, público externo.
4. Se preparó el cliente **Camposol QA Web** con el origen y callback exactos indicados arriba. El titular informó que creó el cliente y guardó directamente sus credenciales en Supabase. La lista de proveedores y el endpoint público `/auth/v1/settings` confirmaron `external.google=true`, con Email todavía activo. No se leyeron las credenciales.
5. 105 pruebas Node superadas (101 anteriores y cuatro del flujo OAuth): solicitud con el SDK real sin red ni usuarios reales, permisos de identidad, PKCE S256, retorno de Pages, eliminación de parámetros, compatibilidad con Azure y rechazo de protocolos no permitidos. Ambas compilaciones y ambos chequeos TypeScript correctos. También pasó el build de Pages con Google habilitado y `--base=/camposol-qa/`. Auditoría: cero vulnerabilidades.
6. En **Acceso a los datos** de Google se guardaron únicamente tres permisos no sensibles: `openid`, `userinfo.email` y `userinfo.profile`. Las listas de permisos sensibles y restringidos quedaron vacías; el botón Save volvió a quedar deshabilitado después del guardado.

## Publicación

Código publicado: [`8afeb870810370d14068c9c48eabaa36366b9acc`](https://github.com/brancoretto24102-ui/camposol-qa/commit/8afeb870810370d14068c9c48eabaa36366b9acc).

- [Verificación 45415575887](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45415575887): completed/success.
- [Pages 45415576014](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45415576014): compilación y publicación completed/success.
- Página pública y recurso `index-W-Zwyhkf.js`: HTTP 200. El botón **Continuar con Google** se observó en una pestaña nueva, sin cerrar ni modificar la sesión anterior.
- Al pulsarlo se abrió la página oficial **Acceder con Google → Elige una cuenta**, dirigida al dominio del backend correcto `frhmxbdombsqubqlchkj.supabase.co`. No se observó un error de cliente o de URI de retorno en ese recorrido. Se dejó al titular elegir la cuenta y completar el consentimiento.

## Continuación necesaria

1. La configuración de Google Auth Platform y el proveedor Supabase ya existen y están comprobados. No repetir la aceptación, crear otro proyecto ni pedir credenciales por el chat.
2. Pages ya está publicado con `VITE_GOOGLE_ENABLED=true`. No volver a publicar ni cambiar credenciales si no se ha observado un fallo.
3. El titular completa su primer acceso de Google directamente en el navegador. Comprobar retorno, perfil y permisos; conservar la cuenta administradora existente. La prueba unitaria del SDK y la pantalla de selección de cuenta no sustituyen este acceso real.

No se ha comprobado aún una sesión real de Google ni la vinculación con el perfil existente. No anunciar el ingreso como activo hasta completar la configuración, la publicación y esa revisión.

Documentación primaria: [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Google — Manage App Audience](https://support.google.com/cloud/answer/15549945?hl=en), [Google — OAuth App Verification](https://support.google.com/cloud/answer/13463073).
