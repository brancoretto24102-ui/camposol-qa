# Publicación de Camposol QA — Fase 1

El 23/11/2026 el usuario solicitó una URL accesible para cualquier persona y después autorizó hacer público el repositorio existente para utilizar GitHub Pages. La Fase 1 sigue abierta y la Fase 2 no ha comenzado.

URL principal publicada: **https://brancoretto24102-ui.github.io/camposol-qa/**

Cualquier persona puede abrir la web. Los proyectos requieren una cuenta de Camposol QA confirmada y activada; las altas nuevas siguen siendo lectores inactivos. El backend, las cuentas y las reglas de acceso se conservan.

## GitHub Pages

| Dato | Valor |
| --- | --- |
| Repositorio original | `brancoretto24102-ui/camposol-qa`, público por autorización del usuario |
| Fuente de Pages | GitHub Actions |
| Workflow | `.github/workflows/pages.yml` |
| Commit publicado | `9d188a0149b50a4bf295d02d1b85b26035936131` |
| Ejecución de publicación | [45254640994](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254640994), `completed/success` |
| Verificación separada | [45254641095](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45254641095), correcta |
| Compilación | `npm run build:supabase -- --base=/camposol-qa/` |
| Directorio publicado | `dist-supabase/` |
| Variables de repositorio | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Backend conservado | Supabase `frhmxbdombsqubqlchkj`, `camposol-qa-dev` |
| Transporte | HTTPS obligatorio |

Las variables contienen exclusivamente la URL y la clave **publicable** del backend existente. No se usan claves de servicio, SMTP ni credenciales de administradores para compilar. El job valida el proyecto y el prefijo `sb_publishable_`; instala con el lockfile, ejecuta las 26 pruebas, audita y compila antes de publicar. Solo el job de despliegue obtiene `pages: write` e `id-token: write`; se mantiene `contents: read`.

El sitio estático contiene la interfaz compilada y se conecta a Supabase. No ejecuta el servidor SQLite ni publica archivos de entorno o datos de la base. La revisión previa del historial cubrió 11 commits y 68 blobs, sin coincidencias de credenciales ni correos personales en esa revisión.

Se observó la web activa y la sesión real de la cuenta existente en GitHub Pages, con Administración disponible. No fue necesario volver a registrar la cuenta. El cierre de sesión, la recuperación completa y los permisos entre dos cuentas siguen pendientes.

## Retornos de correo

Site URL guardada y verificada tras recargar: `https://brancoretto24102-ui.github.io/camposol-qa/`.

La lista autorizada contiene exactamente:

- `https://brancoretto24102-ui.github.io/camposol-qa/`
- `https://brancoretto24102-ui.github.io/camposol-qa/#restablecer`
- `https://camposol-qa.ingbca-360.chatgpt.site/`
- `https://camposol-qa.ingbca-360.chatgpt.site/#restablecer`
- `http://127.0.0.1:5173/`
- `http://127.0.0.1:5173/#restablecer`

Los enlaces solicitados desde Pages usan la ruta del proyecto y el retorno de recuperación correspondiente. La configuración guardada no sustituye la prueba completa de entrega y uso de un enlace de recuperación. SMTP Gmail y confirmación de correo permanecen activos; no leer ni versionar su secreto.

## Actualizar la publicación principal

1. Trabajar en el repositorio original y conservar el backend.
2. Mantener las dos variables de repositorio con configuración publicable del proyecto autorizado.
3. Guardar el código verificado en `main`; el workflow de Pages ejecuta las comprobaciones y publica automáticamente. También permite ejecución manual.
4. Comprobar la conclusión de la ejecución y la web en la URL principal.
5. Registrar el commit y la ejecución publicados. Los cambios solo en `docs/**` o `README.md` no vuelven a desplegar la aplicación.

No conceder `contents: write`, crear ramas de transporte ni introducir secretos en variables `VITE_`. El desarrollo continúa en Fase 1; este cambio de alojamiento no implementa metodologías, IA, evidencias ni Excel.

## Publicación anterior de Sites — referencia

URL anterior: https://camposol-qa.ingbca-360.chatgpt.site

| Dato | Valor |
| --- | --- |
| Site que debe reutilizarse | `appgprj_6b0491b308848191b56ee56d39ba57a7` |
| Slug | `camposol-qa` |
| Audiencia del sitio | Pública |
| Versión | 1 |
| ID de versión | `appgprj_6b0491b308848191b56ee56d39ba57a7~appgver_5e920d2537f081919fa88506e5b3b1e1` |
| Despliegue | `appgdep_6b049264cb188191b67395a4c01f2ec2` |
| Estado observado | `succeeded` |
| Fuente de la publicación estática | `852202053a6591447acfb77da65eba2b6c793079` |
| Código React verificado | `4cfaae64d64308820f38539e52de7ac47040c6a9` |
| Directorio usado para la distribución | `/workspace/sites/camposol-qa` |
| Manifiesto | `.openai/hosting.json`, directorio estático `dist` |
| Repositorio de desarrollo | `brancoretto24102-ui/camposol-qa`, ahora público, conservado |
| Backend | Supabase `frhmxbdombsqubqlchkj`, conservado |

Esta distribución anterior se conserva como referencia. El directorio indicado es el usado al publicarla; puede requerir recuperación si se reinicia o limpia el entorno. Si se solicita actualizar Sites, reutilizar su ID exacto y su flujo de publicación; no crear otro Site ni backend. No editar JavaScript minificado para desarrollar funcionalidades.

La publicación anterior usó cuatro activos compilados y el manifiesto de alojamiento. Se comprobó su acceso y, desde una sesión remota previa, el guardado, recarga e historial de un proyecto técnico ficticio archivado en versión 2. La nueva publicación de Pages conserva el mismo backend.

## Pendiente para cerrar Fase 1

Segunda cuenta, comprobaciones entre roles reales, cierre y recuperación completa en la URL principal. Microsoft permanece preparado y deshabilitado hasta disponer de configuración y permisos de Entra. No declarar completas las fases posteriores.
