# Continuar Camposol QA — Fase 1

Estado comprobado el 23/11/2026. El usuario autorizó continuar este mismo proyecto en una nueva tarea Work para comprobar si el acceso de red se aplica allí. No reiniciar el desarrollo ni crear otro repositorio o backend.

## Fuentes y alcance

- Repositorio privado: https://github.com/brancoretto24102-ui/camposol-qa . El acceso mediante la conexión GitHub funciona y sus permisos son suficientes.
- Especificación: `Texto pegado(2).txt`, PROMPT MAESTRO V2.0, archivo de Library `libfile_6bba404ac3148191bf0e729d314daf59`. Leer su contenido vigente antes de ampliar el alcance.
- Trabajar exclusivamente en Fase 1: arquitectura, acceso, roles, proyectos, persistencia y seguridad. La Fase 2 espera la validación y presentación de esta fase. No se ha publicado una web productiva.
- Backend independiente ya creado: Supabase `frhmxbdombsqubqlchkj`, nombre `camposol-qa-dev`, URL https://frhmxbdombsqubqlchkj.supabase.co . Creación autorizada únicamente con cotización de USD 0/mes. No tocar los proyectos anteriores del usuario.
- No hay cuentas reales creadas ni contraseñas elegidas por el usuario. Los nuevos registros remotos son lectores inactivos. La activación inicial exige verificar la identidad y el UUID del usuario; no elevar roles por metadatos del navegador.

## Última compilación comprobada

| Dato | Valor |
| --- | --- |
| Código compilado | `8296448ccd59f470670e03731a7364ce7975816a` |
| Ejecución correcta | https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45227735962 |
| Pruebas locales y en CI | 26 superadas, 0 fallos |
| TypeScript y Vite | Correctos; Vite 8.3.8 y Node 24.22.3 |
| Auditoría npm | 0 vulnerabilidades informadas |
| Seguridad Supabase | 30 verificaciones previas superadas con transacción revertida |
| Archivo privado | `camposol-qa-verificacion`, ID `14847160025`, 85191 bytes |
| SHA-256 del ZIP | `f63a6b74b66be189b33ae4dfe43a39a750a33e65f9481c4da87bac49e3aa0499` |
| Caducidad del archivo | 24/11/2026, 12:27, hora de Perú |

El ZIP contiene `dist/`, `package-lock.json` y los informes. La compilación usa el backend **local**, no Supabase. El código fuente de la interfaz y del backend coincide con el commit indicado; los commits posteriores de documentación pueden omitir CI.

Se corrigieron dos fallos de recuperación: el enlace del buzón local conserva el origen permitido desde el que se solicitó y la interfaz vuelve a consultar la sesión después de cambiar la contraseña. Las dos pruebas HTTP nuevas cubren los puertos 5173 y 4317, revocación de sesión, enlace de un solo uso y rechazo de orígenes externos.

## Bloqueo del entorno anterior

En la tarea anterior, incluso tras activar la red en Ajustes y reiniciar, los comandos seguían recibiendo `CODEX_SANDBOX_NETWORK_DISABLED=1`; una petición al registro npm falló con `ENOTFOUND`. Las dependencias y `dist/` no están instaladas en el checkout local. La descarga nativa del archivo de GitHub funciona, pero la materialización devuelve una URL temporal, sin ruta local. No se logró transferir sus bytes al equipo.

Comprobar la red en la nueva tarea antes de prometer una solución. No modificar las restricciones del entorno, el firewall ni los controles de seguridad. No ampliar CI a `contents: write`, crear ramas de transporte ni emitir código o binarios privados en los registros: esas alternativas fueron rechazadas anteriormente. El flujo actual mantiene `contents: read`.

Los intentos de consultar la lista de proyectos y localizar las dependencias con la integración de la aplicación devolvieron `Codex app tool request failed`; no se confirmó la creación automática de otra tarea desde la conversación anterior.

## Trabajo pendiente

1. Obtener el código existente y comprobar el acceso normal a npm. Si está permitido, instalar las dependencias fijadas. Si se recupera el ZIP por el canal admitido, verificar tamaño y SHA-256, incorporar `dist/` y registrar el lockfile generado. No inventar un lockfile ni cambiar de framework.
2. Abrir la interfaz real con el servidor local, datos ficticios y un directorio de prueba independiente. Revisar acceso inicial, proyectos, miembros, roles, historial, cierre y recuperación en escritorio y móvil. No dar por hecha esta revisión: aún no se ha observado React en un navegador.
3. Para Supabase, obtener su clave publicable mediante la conexión autorizada, configurar el modo correspondiente y recompilar. Nunca incluir claves `service_role` ni otros secretos en variables `VITE_`.
4. Verificar el registro y confirmación de las dos cuentas administradoras ya solicitadas por el usuario. Él debe elegir sus contraseñas. Después, activar únicamente sus UUID comprobados y probar acceso y permisos reales.
5. Configurar y comprobar la entrega de recuperación por correo. Microsoft está preparado, pero permanece deshabilitado hasta disponer de la configuración y permisos de Entra. Google también permanece deshabilitado.
6. Actualizar el informe de verificación y presentar la Fase 1 antes de empezar la siguiente. Mantener explícitos los controles pendientes. La publicación productiva requiere la autorización indicada en la especificación.

El backend local no necesita paquetes externos para ejecutar `node --test tests/*.test.mjs`. No repetir las pruebas SQL remotas sobre una base con cuentas o proyectos reales.
