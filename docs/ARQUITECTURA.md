# Camposol QA — Fase 1

Fecha: 23 de noviembre de 2026. Fuente funcional: PROMPT MAESTRO V2.0, Texto pegado(2).txt (924 líneas).

## Alcance de esta entrega

Acceso por correo, cierre de sesión, recuperación local, roles administrador/editor/revisor/lector, tablero, alta/edición/listado/recuperación de proyectos, miembros y auditoría. Los casos, aprobaciones documentales, evidencias, IA y Excel se implementan en las fases posteriores del prompt. Ninguna cifra simula casos aprobados.

## Aislamiento

Directorio y repositorio Git propios: camposol-qa. Los repositorios s13s-monterrico y s21-monterrico y su backend no se modifican. Supabase de desarrollo independiente: camposol-qa-dev, proyecto frhmxbdombsqubqlchkj, región us-east-1. La organización elegida por el usuario es Branco Daniel Retto Saavedra. Cotización recibida: USD 0/mes. No se ha publicado una web productiva.

## Componentes

Frontend React + TypeScript + Vite, componentes por función, CSS responsive. Una interfaz Backend separa dos adaptadores: servidor local Node.js 24 + SQLite (sin dependencias externas) y Supabase Auth + PostgreSQL/RLS. El modo local es exclusivamente de desarrollo; admite solo conexiones loopback y datos ficticios. No sustituye el backend compartido para usuarios empresariales.

Supabase se prioriza por la disponibilidad de un proyecto Free independiente y la combinación de Auth, PostgreSQL, RLS y almacenamiento privado. Appwrite Cloud es la alternativa si falta cuota; no es necesario crear otra cuenta ni migrar los proyectos previos. Sus cuotas exactas deben volver a confirmarse si se utiliza.

## Identidad y permisos

La autorización se resuelve en el servidor/base de datos, no solo ocultando controles. Un proyecto pertenece a su creador y solo es visible para sus miembros y administradores. Un enlace no añade permisos. Un editor puede crear proyectos y modificar los que posee o tiene asignados como editor. Revisores y lectores no modifican el contenido en esta fase. Solo el administrador gestiona perfiles y miembros. Deshabilitar una cuenta o cambiar su rol revoca sesiones locales. No se permite deshabilitar al último administrador.

El alta inicial del administrador local solo funciona antes de existir usuarios, dentro de una transacción. El backend remoto no promociona automáticamente a la primera persona que se registra: requiere activar su perfil y asignar el primer administrador mediante el canal administrativo del proyecto. Nunca se confía en user_metadata para roles.

## Protección local

Contraseñas con scrypt y sal aleatoria; tokens de sesión y recuperación aleatorios almacenados con hash; cookie HttpOnly/SameSite=Strict; token CSRF para mutaciones; verificación de Origin y Host; límite de intentos de acceso; validación de cuerpos; control de versiones para evitar pérdida de ediciones concurrentes; consultas parametrizadas; registro de auditoría sin contraseñas ni tokens. La entrega local de recuperación usa un buzón de desarrollo ignorado por Git. No envía correos reales.

## Protección remota

RLS en tablas expuestas, acceso anónimo revocado, funciones privilegiadas acotadas y search_path fijo, perfiles editables por el propio usuario solo en su nombre, auditoría solo de lectura, buckets privados y acceso a objetos por permiso de proyecto. El frontend utiliza exclusivamente una clave publicable, nunca service_role ni secretos. Las sesiones del SDK se guardan en sessionStorage (no se almacenan claves de IA).

## Microsoft y Google

Microsoft usa el proveedor oficial Azure de Supabase con scope email. Falta registrar/configurar la aplicación Entra, tipo de cuenta, tenant, client ID, secreto y redirect URI. No se muestra el acceso como operativo mientras no esté habilitado. Google queda preparado y deshabilitado. Iniciar sesión con Microsoft no conecta Copilot. No hay llamadas a IA en esta fase.

## Modelo inicial

user_profiles → roles y activación; applications → catálogo; projects → creador, aplicación, cartilla, objetivo y versión; project_members → pertenencia y rol; audit_logs → cambios trazables. SQLite añade users, sessions y password_resets para el entorno local. Supabase usa auth.users y Auth para esas responsabilidades. Metodologías versionadas y entidades de casos se incorporarán en Fase 2, sin inventar su contenido.

## Publicación futura

Preferencia: Cloudflare Pages con repositorio privado y frontend estático; los registros y archivos permanecerán en el backend con autenticación. GitHub Pages Free requiere código público y no se selecciona para este proyecto empresarial. La elección definitiva y el despliegue productivo quedan pendientes de autorización del usuario.

Cuotas revisadas: Supabase Free: 2 proyectos activos, 500 MB de base, 1 GB de archivos y pausa tras una semana inactivo. Cloudflare Pages Free: 500 builds mensuales, 20.000 archivos, 25 MiB por recurso. Los planes gratuitos no constituyen un SLA ni una aprobación empresarial para tratar datos reales. Respaldos automáticos corporativos no se presuponen.

Fuentes oficiales consultadas: https://supabase.com/pricing ; https://appwrite.io/pricing ; https://developers.cloudflare.com/pages/platform/limits/ ; https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://supabase.com/docs/guides/auth/social-sign-in/auth-azure ; https://supabase.com/docs/guides/database/postgres/row-level-security .

## Límites de verificación

La red del ejecutor impide descargar dependencias npm. Las pruebas locales de servidor y seguridad se ejecutan con Node sin dependencias. La instalación, TypeScript, Vite y la auditoría se verificaron correctamente en GitHub Actions, con cero vulnerabilidades informadas. La inspección visual y el primer acceso remoto real siguen pendientes. No hay integración Microsoft validada sin credenciales Entra. La plantilla E819 no se exporta ni modifica en esta fase.
