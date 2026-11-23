# Verificación · Fase 1

Fecha: 23/11/2026. Versión del código: 0.1.0.

| Componente | Resultado observado |
| --- | --- |
| Backend de desarrollo | Creado en Supabase, independiente, estado ACTIVE_HEALTHY |
| Costo de creación | Cotización USD 0/mes; selección autorizada por el usuario |
| Esquema de datos | Tablas, restricciones, índices, auditoría, RLS y buckets privados aplicados |
| Seguridad remota | 30 verificaciones superadas con transacción revertida |
| Persistencia de pruebas remotas | 0 perfiles, 0 proyectos y 0 eventos después de revertir |
| Analizador de seguridad Supabase | Sin observaciones en la revisión final |
| Backend local | 24 pruebas automatizadas superadas, 0 fallos, 0 omitidas |
| Sintaxis TypeScript | `node --check` de los módulos: correcto; esto no sustituye el chequeo de tipos |
| Instalación de dependencias | Bloqueada: sin acceso de red del ejecutor y sin paquetes en caché offline |
| Compilación Vite / TypeScript | Pendiente de instalación; no verificada |
| Interfaz visual / responsive | Implementada en código; no verificada en navegador |
| Acceso por correo remoto | Adaptador escrito, falta activar el primer usuario y probar el flujo real |
| Microsoft | Adaptador oficial preparado; requiere credenciales y permisos Entra |
| Recuperación remota / SMTP | Preparada; envío no configurado ni probado |
| Repositorio Git | Independiente local; publicación en GitHub pendiente de inicio de sesión |
| Publicación productiva | No realizada; requiere autorización según el prompt |

## Cobertura local

Alta inicial protegida; contraseñas derivadas con scrypt; rechazo de contraseña incorrecta; cierre de sesión; cookie HttpOnly/SameSite; CSRF y origen; límite de intentos; aislamiento entre proyectos; restricción de lector/revisor; miembros y revocación; impedimento de autoelevación; cuenta inactiva; último administrador; edición concurrente; persistencia al reabrir SQLite; recuperación de un solo uso; auditoría restringida; validaciones y cuerpos mal formados; indicadores basados en datos reales.

## Cobertura remota

Acceso anónimo denegado; proyectos propios/ajenos; inserción con RETURNING; identidad del creador; autoelevación por columnas y RPC; ignorar roles en user_metadata; restricción de lector; cuentas inactivas; control por ruta de archivo; concurrencia mediante versión; auditoría no falsificable; administración y último administrador; revocación de membresía con sesión vigente; buckets privados.

Las verificaciones SQL no prueban la entrega SMTP, OAuth completo, renderizado React, tamaño de archivos subidos ni descargas con URL firmada. Esas limitaciones permanecen explícitas. La Fase 1 aún no está cerrada y no se ha comenzado la Fase 2.
