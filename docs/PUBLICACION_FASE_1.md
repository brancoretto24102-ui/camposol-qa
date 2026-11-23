# Publicación de Camposol QA — Fase 1

El 23/11/2026 el usuario solicitó una URL que cualquier persona pudiera utilizar. Esta petición autorizó publicar la interfaz actual de Fase 1. La Fase 2 no se ha iniciado.

URL publicada: **https://camposol-qa.ingbca-360.chatgpt.site**

La URL se puede abrir sin una cuenta de ChatGPT. Los proyectos exigen una cuenta de Camposol QA confirmada y activada. Las nuevas cuentas siguen siendo lectores inactivos hasta su activación; conocer el enlace no concede acceso a datos.

## Identidad de la publicación

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
| Checkout de publicación | `/workspace/sites/camposol-qa` |
| Manifiesto | `.openai/hosting.json`, directorio estático `dist` |
| Repositorio de desarrollo | `brancoretto24102-ui/camposol-qa`, privado, conservado |
| Backend | Supabase `frhmxbdombsqubqlchkj`, conservado |

El alojamiento contiene una copia de distribución de los activos compilados; no sustituye el repositorio de desarrollo ni crea otra base de datos. No editar el JavaScript minificado para desarrollar funcionalidades.

## Contenido y comprobaciones

Se usó la salida existente de `npm run build:supabase`, compilada con la URL y clave publicable del backend autorizado. Se copiaron únicamente `index.html`, dos archivos JavaScript y CSS. El paquete guardado incluye esos activos y el manifiesto de alojamiento. No contiene archivos de entorno, contraseñas, claves de servicio, SQLite, documentos, cuentas ni datos de proyectos.

Se comprobó el acceso público en navegador, la pantalla de inicio de sesión y los formularios de registro y recuperación. No se introdujeron credenciales en herramientas visibles. Desde una sesión real previa de la administradora se comprobó guardar, archivar y recuperar al recargar un proyecto ficticio, con historial y versión 2.

La vista previa interna se detuvo después de publicar. La URL pública no depende de que esa vista previa esté en ejecución.

## Retornos de correo

Site URL: `https://camposol-qa.ingbca-360.chatgpt.site/`.

La lista autorizada contiene exactamente:

- `https://camposol-qa.ingbca-360.chatgpt.site/`
- `https://camposol-qa.ingbca-360.chatgpt.site/#restablecer`
- `http://127.0.0.1:5173/`
- `http://127.0.0.1:5173/#restablecer`

Se recargó el panel de Supabase y se verificó la persistencia de estos valores. Los enlaces nuevos pedidos desde la URL pública regresan a ella. El enlace personal anterior ya confirmó el correo aunque su antiguo retorno local no abriera en el teléfono.

## Continuar o actualizar

1. Mantener el desarrollo en el repositorio original y conservar el backend.
2. Compilar en modo Supabase, usando únicamente la clave publicable.
3. Recuperar y reutilizar el Site anterior y su fuente con el flujo de publicación admitido; no crear otro Site.
4. Sustituir solo los activos de `dist/` de la distribución con la salida verificada de `dist-supabase/`. Conservar la identidad de `.openai/hosting.json`.
5. Preparar la fuente, guardar una versión con su paquete correspondiente y publicar esa versión. Mantener la audiencia pública solicitada y los controles de acceso de la aplicación.
6. Registrar el nuevo ID de versión y despliegue. No guardar credenciales de publicación ni SMTP.

## Pendiente para cerrar Fase 1

Segunda cuenta, comprobaciones entre roles reales, cierre y recuperación de contraseña en la URL pública. Microsoft permanece preparado y deshabilitado hasta disponer de configuración y permisos de Entra. No declarar completos los módulos de metodologías, IA, evidencias o Excel.
