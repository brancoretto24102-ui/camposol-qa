# Camposol QA · 0.1.0

Aplicación en desarrollo de la Fase 1 del PROMPT MAESTRO V2.0: acceso, roles, proyectos, persistencia y auditoría. IA, motor DigiProy, evidencias y exportación Excel corresponden a fases posteriores.

Repositorio privado: https://github.com/brancoretto24102-ui/camposol-qa . Se conserva el backend independiente `camposol-qa-dev`, proyecto Supabase `frhmxbdombsqubqlchkj`; los proyectos anteriores no se modifican.

**Estado comprobado el 23/11/2026:** dependencias instaladas y lockfile versionado; 26 pruebas locales superadas, TypeScript correcto, builds local/Supabase y auditoría con cero vulnerabilidades. React revisado en escritorio y a 390 px con datos ficticios locales. La primera cuenta remota recibió el correo, quedó confirmada y fue activada como administradora con autorización explícita. El inicio de sesión real, la segunda cuenta, recuperación y OAuth completo siguen pendientes. La Fase 1 está abierta y la Fase 2 no ha comenzado. Ver [verificación](docs/VERIFICACION_FASE_1.md) y [continuación](docs/CONTINUACION_FASE_1.md).

La actualización de código `4cfaae64d64308820f38539e52de7ac47040c6a9` pasó la [verificación de GitHub](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45246134440).

## Desarrollo local

Requisito: Node.js 24 o superior y npm. Desde este directorio, en PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Acceder a http://127.0.0.1:5173 . El primer administrador se configura una sola vez con datos ficticios y contraseña elegida por la persona que ejecuta la app. No existen cuentas ni contraseñas predefinidas. Desde Administración se crean las otras cuentas locales y se asignan sus roles.

La API SQLite se guarda en `.data/`, escucha solo en loopback, en el puerto 4317, y Vite redirige `/api` a ella. No usar datos empresariales reales. Para ejecutar únicamente el backend, sin instalar paquetes:

```powershell
node server/index.mjs
```

`/api/health` verifica su estado. Sin un build previo, la raíz muestra instrucciones de preparación.

## Pruebas y compilación

```powershell
npm test
npm run build
npm audit --audit-level=high
```

Las pruebas del backend no requieren paquetes externos: `node --test tests/*.test.mjs`. La compilación sí requiere las dependencias. Después de compilar, `node server/index.mjs` sirve también `dist/`, con la interfaz completa en http://127.0.0.1:4317 . No utilizar ese servidor en producción.

Las versiones directas y transitivas quedan fijadas mediante `package.json` y `package-lock.json`. El flujo `Verificar Fase 1` instala con `npm ci`, ejecuta las pruebas y el chequeo de tipos, compila y audita. Conserva `dist/`, lockfile e informes durante un día; no despliega ni modifica la base de datos. Sus permisos permanecen en `contents: read`.

## Supabase existente

Backend de desarrollo ya creado: `camposol-qa-dev`, proyecto `frhmxbdombsqubqlchkj`, cotización de creación autorizada: USD 0/mes. No crear otro ni reutilizar las bases de los proyectos anteriores.

```powershell
Copy-Item .env.supabase.example .env.supabase.local
```

Completar **solo la clave publicable del proyecto** en ese archivo local:

```dotenv
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://frhmxbdombsqubqlchkj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MICROSOFT_ENABLED=false
VITE_GOOGLE_ENABLED=false
```

No incluir `service_role`, claves secretas, secretos de Microsoft ni claves de IA en variables `VITE_`. `.env.supabase.local` y las salidas compiladas se excluyen de Git. En esta continuación se obtuvo la clave publicable por la conexión autorizada y se verificó la compilación correspondiente.

```powershell
npm run dev:supabase
```

Este comando inicia solamente Vite conectado al backend remoto. Para revisar el build, sin iniciar SQLite:

```powershell
npm run build:supabase
npm run preview:supabase
```

El build queda en `dist-supabase/` y su vista previa usa http://127.0.0.1:5173 . El build local sigue en `dist/`.

En Authentication ya se guardaron Site URL `http://127.0.0.1:5173/` y los retornos exactos `http://127.0.0.1:5173/` y `http://127.0.0.1:5173/#restablecer`. Añadir una URL productiva únicamente cuando se autorice su publicación.

SMTP personalizado de Gmail quedó guardado y habilitado en el proyecto existente. Se recargó el panel y se comprobó que sigue activo con host `smtp.gmail.com`; Supabase muestra que hay una contraseña almacenada y oculta. No se leyó ni se versionó el secreto guardado. La entrega del correo de confirmación de la cuenta personal quedó comprobada y Auth registra su dirección confirmada. Falta comprobar la recuperación. Mostrar un mensaje en la interfaz no garantiza la entrega; no desactivar la confirmación para evitar ese paso. Las credenciales se administran directamente en Google y Supabase, fuera del código y del chat.

`database/phase1-schema.sql` **ya se aplicó** a este backend. Es una instantánea para una base vacía, no una migración que deba repetirse sobre la base existente.

### Confirmación desde otro dispositivo durante desarrollo

El retorno actual es `http://127.0.0.1:5173/`. En un teléfono esa dirección apunta al propio teléfono, por lo que puede mostrar `ERR_CONNECTION_REFUSED` después de confirmar. Esto no demuestra un fallo de confirmación: se comprobó en Auth que la cuenta personal sí estaba confirmada. Para continuar hay que volver a la ventana de la aplicación en el entorno de desarrollo e iniciar sesión. La URL productiva se configurará cuando se autorice la publicación.

### Primeros administradores

1. Cada titular registra su cuenta y elige su contraseña en la aplicación; después confirma el correo.
2. El propietario del backend verifica identidad, confirmación e UUID exacto en Authentication.
3. Se habilita solo esa cuenta mediante SQL administrativo, usando su UUID real verificado:

```sql
update public.user_profiles
set role='administrador', active=true
where id='UUID_REAL_VERIFICADO';
```

4. Se comprueba inicio, cierre, acceso a proyectos y permisos reales.

Los usuarios nuevos comienzan como lectores inactivos, incluso con correo confirmado. No asignar roles a partir de `user_metadata`. No guardar en el repositorio contraseñas, correos personales de los administradores ni enlaces de recuperación.

### Microsoft y Google

Microsoft utiliza `signInWithOAuth`, proveedor `azure`, scope `email`. Requiere una aplicación Entra, tipo de cuenta personal/empresarial, tenant cuando corresponda, client ID, secreto y URI de retorno. El secreto se configura en Supabase. Solo habilitar `VITE_MICROSOFT_ENABLED=true` tras verificar permisos y configuración. Google sigue preparado y deshabilitado. El acceso con Microsoft no conecta Microsoft Copilot.

## Seguridad y límites de verificación

26 pruebas locales y 30 comprobaciones RLS remotas previas superadas. Las pruebas remotas se revirtieron; antes del alta real había cero cuentas, perfiles y proyectos. La consulta posterior al registro confirmó 1 cuenta Auth, 1 perfil, 1 administrador de aplicación activo y 0 proyectos. Buckets privados y analizador de seguridad sin observaciones. No se repitió el esquema ni el script RLS.

`database/phase1-rls-tests.sql` requiere un backend de desarrollo vacío y acceso administrativo; no ejecutarlo con cuentas o proyectos existentes. Las pruebas locales crean sus propias bases temporales.

La recuperación local escribe en `.data/outbox/`, conserva el origen permitido, usa enlaces de un solo uso e invalida sesiones. Ese buzón no se sirve por HTTP ni se versiona. No envía correo real.

La revisión visual utilizó sesiones ficticias sobre una base SQLite independiente. Permitió observar creación/edición, versiones, miembros, historial, roles, cierre y recuperación local; no constituye una prueba de autenticación remota. La revisión móvil usó un documento de navegador de 390 × 844 px, sin dispositivo físico.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `src/features/` | Acceso, proyectos, administración y perfil |
| `src/domain.ts` | Entidades y validaciones comunes |
| `src/backend.ts` | Contrato y adaptador HTTP local |
| `src/supabase-backend.ts` | Adaptador Auth y PostgreSQL |
| `server/` | API local, autenticación y SQLite |
| `database/` | Esquema PostgreSQL y verificaciones RLS |
| `tests/` | Permisos, API, persistencia y validaciones |
| `docs/` | Arquitectura y estado comprobado |

## Pendiente para cerrar la fase

Inicio de sesión y permisos reales con la primera administradora ya activa; registro, confirmación y activación autorizada de la segunda cuenta; recuperación por correo; Microsoft cuando existan credenciales y permisos Entra. La publicación productiva requiere autorización según el prompt y no se ha realizado.
