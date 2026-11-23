# Camposol QA · 0.1.0

Desarrollo de la Fase 1 del PROMPT MAESTRO V2.0. La IA, el motor DigiProy, las evidencias y la exportación Excel pertenecen a las siguientes fases y todavía no están implementados.

Repositorio privado: https://github.com/brancoretto24102-ui/camposol-qa . El flujo `Verificar Fase 1` comprueba las pruebas, TypeScript, el build y las dependencias en GitHub. Conserva los resultados y la compilación durante un día; no publica una web ni ejecuta operaciones sobre la base de datos.

**Estado:** backend local probado y backend Supabase independiente configurado con permisos comprobados. GitHub Actions completó la instalación, TypeScript, la compilación Vite, las 26 pruebas y una auditoría con cero vulnerabilidades. Resultado: https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45227735962 . La revisión visual, el primer acceso remoto real y la recepción de correos siguen pendientes. No considerar cerrada toda la Fase 1 hasta completar esos controles. Para retomar el trabajo, consultar `docs/CONTINUACION_FASE_1.md`.

## Ejecutar

Requisito: Node.js 24 o superior, con npm. Obtenerlo desde https://nodejs.org/ si no está instalado. Abrir una terminal en este directorio.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Acceder a http://127.0.0.1:5173 . El modo local es el predeterminado. En el primer acceso se configura un administrador con nombre, correo ficticio y contraseña elegidos por el usuario. No existen cuentas ni contraseñas predefinidas. Desde Administración se crean las cuentas locales de prueba y se asignan permisos. No usar datos empresariales reales.

El backend utiliza SQLite en `.data/` y escucha solo en loopback. Vite sirve la interfaz y redirige `/api` a http://127.0.0.1:4317 . Para ejecutar únicamente la API, sin instalar dependencias:

```powershell
node server/index.mjs
```

La ruta `/api/health` verifica que el servidor está listo. Sin un build previo la raíz muestra instrucciones de preparación, no una simulación de la interfaz.

## Verificar y compilar

```powershell
node --test tests/*.test.mjs
npm run build
```

Las pruebas del backend no requieren paquetes externos. El build sí requiere instalar las dependencias. El flujo de GitHub generó y auditó `package-lock.json`, disponible en el archivo privado de resultados de esa ejecución. Falta recuperarlo y versionarlo en el código fuente; las versiones directas están fijadas en `package.json`. La compilación verificada corresponde al commit `8296448ccd59f470670e03731a7364ce7975816a`.

El paquete `camposol-qa-verificacion` contiene `dist/`, `package-lock.json` y los informes de pruebas, auditoría y huellas SHA-256. Se descarga desde la ejecución anterior, con la sesión del propietario del repositorio. Su retención está limitada a un día. Copiando `dist/` a este directorio se puede revisar la aplicación mediante el servidor local sin instalar dependencias del frontend. El flujo mantiene `contents: read`; no modifica ramas ni publica código en registros de ejecución.

Después del build, `node server/index.mjs` también sirve `dist/` para probar la interfaz local completa. No utilizar ese servidor en producción. Para cambiar `QA_PORT` deben ajustarse también los orígenes permitidos y el proxy local; los valores predeterminados ya coinciden.

## Conectar Supabase

Se creó un backend de desarrollo independiente, **camposol-qa-dev**, proyecto `frhmxbdombsqubqlchkj`, con cotización de creación de USD 0/mes, en la organización elegida por el usuario. Los dos proyectos anteriores no se modificaron.

En `.env.local`:

```dotenv
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://frhmxbdombsqubqlchkj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=OBTENER_LA_CLAVE_PUBLICABLE_DEL_PROYECTO
VITE_MICROSOFT_ENABLED=false
VITE_GOOGLE_ENABLED=false
```

Usar únicamente la clave publicable. Nunca incluir `service_role`, secretos de Microsoft ni claves de IA en variables `VITE_`.

La estructura y las políticas de `database/phase1-schema.sql` **ya se aplicaron** al proyecto anterior. Ese archivo es una instantánea para preparar otro backend vacío, no una migración que deba repetirse sobre la base preparada.

En Authentication, configurar Site URL y la lista de redirecciones para la URL local de pruebas y, posteriormente, la URL publicada autorizada. Configurar el servicio de correo y confirmar recepción: no se ha probado el envío SMTP. La pantalla de recuperación remota no garantiza entrega sin esa configuración.

### Primer administrador remoto

1. Registrar y confirmar una cuenta desde la aplicación con el modo Supabase configurado, o crearla por el canal administrativo autorizado de Supabase.
2. Identificar su UUID exacto en Authentication. No usar un UUID de ejemplo ni asignar administrador basándose en metadatos enviados por el navegador.
3. El propietario del backend activa **esa cuenta concreta** mediante SQL administrativo:

```sql
update public.user_profiles
set role='administrador', active=true
where id='UUID_REAL_VERIFICADO';
```

4. Iniciar sesión. Ese administrador puede activar las otras cuentas y administrar sus roles. Los registros nuevos comienzan como lector inactivo, aunque su correo esté confirmado.

No se ha creado una cuenta real ni elegido una contraseña por el usuario. La base permanece sin perfiles ni proyectos de prueba persistentes.

### Microsoft

El adaptador usa `signInWithOAuth` con el proveedor oficial `azure` y el scope `email`. Se necesita una aplicación Entra, tipo de cuenta (personal/empresarial), tenant cuando corresponda, client ID, secreto y URI de retorno. El secreto se configura en Supabase, nunca en la web. Solo después habilitar `VITE_MICROSOFT_ENABLED=true`. Confirmar los permisos empresariales y verificar las reclamaciones de correo conforme a la documentación oficial. Esta integración está preparada y aún no probada con un tenant real.

Google permanece preparado y deshabilitado. El inicio con Microsoft no conecta Microsoft Copilot.

## Seguridad y pruebas

26 pruebas automatizadas locales y 30 verificaciones RLS remotas superadas. Los datos de las pruebas remotas se revirtieron con `ROLLBACK`; el proyecto quedó con cero perfiles, proyectos y eventos. Los tres buckets son privados. El analizador de seguridad de Supabase no reportó observaciones al finalizar la revisión.

`database/phase1-rls-tests.sql` requiere un backend de desarrollo **vacío** y credenciales administrativas. No ejecutarlo en producción ni con usuarios/proyectos existentes; incluye una comprobación que lo impide. Las pruebas locales crean sus propias bases temporales.

La recuperación local deposita el enlace en `.data/outbox/` para desarrollo y conserva el origen permitido desde el que se solicitó, tanto con Vite como con la interfaz compilada. Ese buzón no se sirve por HTTP ni se incorpora al repositorio o al paquete. No envía correos reales. Un restablecimiento invalida las sesiones locales, actualiza la sesión mostrada por la interfaz y el enlace solo se usa una vez.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `src/features/` | Acceso, proyectos, administración y perfil |
| `src/domain.ts` | Entidades y validaciones comunes |
| `src/backend.ts` | Contrato y adaptador HTTP local |
| `src/supabase-backend.ts` | Adaptador Auth y PostgreSQL |
| `server/` | API local, autenticación y persistencia SQLite |
| `database/` | Esquema PostgreSQL y verificaciones RLS |
| `tests/` | Pruebas locales de permisos, API, persistencia y validación |
| `docs/` | Arquitectura y estado comprobado |

## Pendiente para cerrar la Fase 1

- Recuperar y registrar el lockfile ya generado y comprobado por GitHub.
- Verificar la interfaz en navegador, móvil y escritorio.
- Mantener la sincronización del código con el repositorio privado. La primera subida y su flujo de verificación finalizaron correctamente.
- Activar el primer administrador remoto y probar acceso/cierre/recuperación contra Auth real.
- Configurar Microsoft cuando existan los permisos y credenciales necesarios.

El despliegue productivo requiere autorización y corresponde a la fase indicada en el prompt. No se ha realizado. La Fase 2 no se ha iniciado.
