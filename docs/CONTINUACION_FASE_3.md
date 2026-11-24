# Continuar Camposol QA — Fase 3

Actualizado el 23/11/2026, hora de Perú. El usuario solicitó implementar Fase 3 y después indicó continuar. Se conservan el repositorio `brancoretto24102-ui/camposol-qa`, la URL https://brancoretto24102-ui.github.io/camposol-qa/ y el backend Supabase `frhmxbdombsqubqlchkj` (`camposol-qa-dev`). No crear otro repositorio, Site ni backend.

## Funciones incorporadas

- «Mi inteligencia artificial»: preferencias privadas de proveedor, modalidad y modelo, independientes del inicio de sesión. La opción inicial es Ninguna IA.
- Modalidad manual para ChatGPT, Google Gemini, Claude y Microsoft Copilot: preparar prompt, revisar y anonimizar, autorizar, copiar, abrir la cuenta elegida, pegar respuesta, validar, editar y aplicar como borrador.
- Asistente contextual para analizar funcionalidades, proponer casos, revisar cobertura, generar un caso, mejorar o acortar redacción, revisar argumentos y revisar resultados.
- Adaptadores de API propia de OpenAI, Gemini y Claude mediante un intermediario autenticado en el backend existente. La credencial se introduce para cada envío y no se persiste.
- Validación de JSON, tarea, campos, tipos, prioridades, funcionalidades y citas literales. Rechazo de metadatos de aprobación y de respuestas incompletas de las APIs.
- Revisión humana explícita antes de guardar una propuesta. La aprobación documental conserva el flujo y permisos de Fase 2. Las versiones anteriores permanecen en el historial.

La cobertura es un informe de consulta: no crea casos ni certifica que el documento esté completo. Una cita coincidente permite comprobar el origen textual, pero no demuestra por sí sola que la interpretación o el resultado propuesto sean correctos. Debe revisarlos una persona.

## Cómo utilizar la modalidad manual

1. Abrir «Mi inteligencia artificial», elegir proveedor y «Manual · copiar y pegar», y guardar. No se necesita contratar una API.
2. Abrir una cartilla y guardar los datos. Entrar en «Asistente IA». Para propuestas de casos se necesita contexto aprobado; para trabajar sobre un caso, también selección aprobada.
3. Elegir tarea y, si corresponde, caso. Pulsar «Preparar prompt».
4. Leer el texto completo, retirar información sensible y utilizar el reemplazo para anonimizar cuando proceda. La sustitución no garantiza anonimización completa. No se adjuntan archivos ni se comparten otras cartillas.
5. Marcar la autorización y copiar. Abrir la IA seleccionada y pegar el prompt en la cuenta personal o empresarial autorizada. Abrir el enlace no transmite el prompt automáticamente.
6. Pegar la respuesta JSON. Se aceptan objetos JSON y un bloque Markdown JSON completo; no se ejecuta texto ni código. Corregir el formato si el proveedor añade comentarios o texto externo.
7. Validar y revisar los campos editables, sus citas y las preguntas pendientes. Si el prompt fue anonimizado, puede ser necesario corregir las citas para que coincidan con los requisitos originales.
8. Marcar la revisión humana y aplicar como borrador. Después, revisar y aprobar mediante los controles habituales de la cartilla.

Las consultas y las respuestas sin aplicar son temporales. El contenido aplicado sí se guarda en el proyecto y sus revisiones. Antes de abandonar una consulta, aplicar la propuesta revisada o copiar el texto necesario.

El análisis conserva funcionalidades existentes y sus identificadores, y agrega o actualiza las propuestas por nombre. La selección agrega casos sin borrar los anteriores y rechaza duplicados. Las tareas de argumentos y resultados solo admiten cambios en el campo solicitado, manteniendo los otros campos y el orden de los pasos.

## API propia

Las conexiones utilizan APIs oficiales y endpoints fijos; no permiten URLs arbitrarias ni herramientas externas. El usuario indica un modelo compatible habilitado en su cuenta, revisa las tarifas y autoriza cada envío. Una suscripción al chatbot no garantiza acceso ni saldo API.

En modalidad API, «Generar con IA» envía la consulta y recibe y valida la respuesta dentro de Camposol QA. La propuesta editable aparece directamente en la misma página para su revisión humana y aplicación como borrador. El paso «Pega y valida la respuesta» corresponde solo a la modalidad manual. El JSON de una respuesta API queda en un detalle opcional, que se abre si necesita corregirse; no se requiere abrir el chatbot ni copiar una respuesta para utilizar la API. Cambiar de proveedor o modalidad descarta la consulta temporal anterior para evitar mezclar sus respuestas.

La consulta API mantiene estados explícitos: sin iniciar, enviando, respuesta recibida y envío fallido. Un fallo se muestra junto al resultado y conserva el texto del prompt; no vuelve a invitar a generar como si no hubiera ocurrido nada. Los errores de validación de una respuesta recibida se muestran en esa misma sección, junto al detalle corregible.

Los errores 429 de OpenAI se clasifican por códigos oficiales: saldo de créditos agotado, límite de gasto de organización o proyecto, límite de uso, cuota insuficiente y frecuencia temporal. Solo se examinan hasta 16 KB del cuerpo de error. Nunca se devuelve ni registra el mensaje original, la clave, los detalles de la cuenta o el prompt. Los códigos desconocidos mantienen un aviso genérico y no disparan reintentos. Un error 429 por sí solo no demuestra falta de saldo: también puede corresponder a un límite temporal. Revisar [los errores de OpenAI](https://developers.openai.com/api/docs/guides/error-codes) y [la guía de resolución de 429](https://help.openai.com/es-419/articles/5955604-troubleshooting-api-rate-limits-and-429-errors).

| Proveedor | Transporte implementado | Conexión |
| --- | --- | --- |
| ChatGPT / OpenAI | Responses, JSON, `store:false` | API propia opcional |
| Gemini | Interactions, revisión `2026-05-20`, JSON, `store:false` | API propia opcional |
| Claude | Messages, versión `2026-10-21` | API propia opcional |
| Microsoft Copilot | Copiar prompt y pegar respuesta | Manual; integración Microsoft 365 pendiente de licencia y autorización |

La clave API vive solo en memoria durante el envío. Se borra del campo al iniciarlo y se elimina de los objetos de solicitud al finalizar. No se guarda en preferencias, almacenamiento persistente del navegador, base, auditoría, repositorio ni variables `VITE_`. No se devuelve en errores ni se introduce en URLs o prompts. No hay reintentos automáticos. Esto no sustituye las políticas de tratamiento y retención de cada proveedor.

Límites técnicos: prompt de 64.000 caracteres; respuesta importada de 140 KB; salida API de 4.096 tokens; 50 segundos de conexión; respuesta HTTP del proveedor limitada a 1 MB. Por cuenta, cuatro intentos por minuto y veinte por una ventana de 24 horas. Estos límites no constituyen un presupuesto monetario. Un intento fallido también ocupa cuota interna.

La infraestructura no incorpora claves compartidas ni activa facturación de los proveedores. Las pruebas de los adaptadores usan transporte controlado; no se realizaron generaciones pagadas ni se introdujeron claves reales. La operación con el modelo y credencial de cada titular sigue requiriendo su comprobación.

## Microsoft Copilot

La modalidad manual funciona con el portal personal y permite abrir Microsoft 365 para utilizar una cuenta de la organización. El acceso con Microsoft a Camposol QA y el uso de Copilot son conexiones independientes.

La futura integración directa debe implementar un adaptador separado para Microsoft 365 Copilot Chat, autenticación delegada oficial de Entra, licencia compatible, permisos y consentimiento del administrador del tenant. Debe volver a verificarse el contrato vigente de la API antes de implementarlo. El registro de capacidades mantiene `api:false` para Copilot; no hay un botón de conexión simulada, extracción de sesiones ni automatización del chatbot.

## Backend y comprobaciones

- `public.ai_provider_preferences`: lectura propia con RLS y escritura mediante comando versionado. Ni un administrador puede leer las preferencias de otra persona por la API de la aplicación.
- `private.qa_ai_usage`: contadores por cuenta; sin acceso cliente y con política explícita de denegación.
- `qa_ai_reserve`: verifica edición efectiva, perfil activo, proyecto, archivo, versión y aprobación de etapas antes de reservar una solicitud.
- Edge Function `qa-ai`, versión 3, estado ACTIVE y `verify_jwt:true`. Verifica además el token con Auth y usa el JWT del usuario para RLS. No utiliza una clave privilegiada para consultar proyectos. La versión 3 agrega la clasificación segura de errores 429 sin modificar la autenticación ni las cuotas.
- CORS del manejador restringido a GitHub Pages, la publicación anterior autorizada y los retornos locales. La plataforma rechaza las llamadas sin JWT antes de ejecutar el manejador.
- Las propuestas se guardan mediante los comandos documentales existentes, sin una vía alternativa de aprobación.

Migraciones ya aplicadas:

1. `supabase/migrations/20261124005546_camposol_qa_phase3_ai.sql`.
2. `supabase/migrations/20261124010121_camposol_qa_phase3_usage_policy.sql`.

No repetirlas ni inicializar el esquema. `database/phase3-rls-tests.sql` usa actores ficticios en una transacción revertida; no ejecutar el script de Fase 1 reservado para una base vacía.

Las compilaciones incluyen TypeScript del frontend y del intermediario mediante `tsconfig.functions.json`. La declaración mínima `runtime.d.ts` solo permite comprobar en CI la superficie de Deno utilizada; el despliegue usa sus propios globales y no incorpora ese archivo al paquete. Dependencias existentes y lockfile conservados.

## Estado y continuación

Código publicado `d776947a593c21ff20751bf1e340a9e240b3e0f6`; ambos flujos de GitHub terminaron correctamente. La revisión se realizó en la URL pública con la sesión existente y respuestas controladas. La cartilla técnica quedó archivada y se restauró Ninguna IA. Resultados de pruebas, revisión visual y publicación: [VERIFICACION_FASE_3.md](VERIFICACION_FASE_3.md). Los pendientes de acceso de Fase 1 siguen documentados: segunda cuenta, recuperación real y OAuth autorizado. No se modificó SMTP ni se elevaron permisos.

Corrección posterior del flujo y errores API publicada el 24/11/2026: `ffd51725c993f7c83314f348eeabc4e5d772b49d`, con `qa-ai` versión 3. Las 73 pruebas, las dos compilaciones y los flujos de verificación y Pages terminaron correctamente. Se comprobó HTTP 200 y la presencia del nuevo estado de error en el JavaScript servido por la URL pública. Esto no resuelve por sí mismo saldo o límites de la cuenta del proveedor; el siguiente intento debe atender el aviso específico de la API. No se realizaron generaciones pagadas durante la corrección.

El aviso previo de contraseñas filtradas deshabilitadas permanece: [referencia oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). La política explícita de contadores eliminó la nueva observación informativa de RLS sin política.

Fase 4 corresponde a archivos, capturas y evidencias. No se implementan aún la subida de documentos, análisis de imágenes, Hoja de Control ni exportación Excel. No publicar el libro empresarial original.

## Fuentes técnicas consultadas

- [OpenAI: inicio y Responses](https://developers.openai.com/api/docs/quickstart), [tarifas](https://developers.openai.com/api/docs/pricing), [tratamiento de datos](https://developers.openai.com/api/docs/guides/your-data).
- [Gemini: Interactions](https://aistudio.google.com/docs/get-started), [configuración](https://aistudio.google.com/docs/text-generation), [tarifas](https://aistudio.google.com/docs/pricing), [condiciones y datos](https://aistudio.google.com/docs/terms).
- [Claude: Messages](https://platform.claude.com/docs/en/api/messages/create), [autenticación](https://platform.claude.com/docs/en/manage-claude/authentication), [tarifas](https://platform.claude.com/docs/en/about-claude/pricing), [privacidad API](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training).
- [Microsoft 365 Copilot Chat API](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/ai-services/chat/overview).
- [Supabase: autenticación de funciones](https://supabase.com/docs/guides/functions/auth), [variables del entorno](https://supabase.com/docs/guides/functions/secrets).
