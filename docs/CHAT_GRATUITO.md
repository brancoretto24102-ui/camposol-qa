# Chat gratuito integrado de Camposol QA

Actualizado el 24/11/2026, hora de Perú. El usuario eligió priorizar un chat integrado gratuito para las cuentas autorizadas de Camposol QA, con otro proveedor. Se conserva el repositorio, GitHub Pages y el backend Supabase existentes.

## Funcionamiento

El Asistente IA de la cartilla abre primero «Chat gratuito». Utiliza Groq con el modelo abierto `openai/gpt-oss-20b`; no es una sesión del portal de ChatGPT. Las modalidades anteriores se conservan en «Mi otra IA · opcional», sin cambiar las preferencias personales guardadas.

La persona elige la tarea y el caso cuando corresponde, revisa el contexto que compartirá, autoriza su uso y escribe mensajes normales. Las respuestas se muestran en la misma página. Las propuestas válidas aparecen en un editor; solo se guardan como borrador después de una revisión humana explícita. La aprobación documental conserva sus controles existentes.

El historial del chat vive en memoria de la página. Se envían el contexto revisado y los últimos mensajes, dentro de los límites de tamaño. Cambiar el contexto, la tarea, el caso o la modalidad descarta la conversación temporal. Cambiar la versión documental reinicia el asistente. Las propuestas aplicadas sí se conservan en la cartilla y sus revisiones.

Se comprueban perfil activo, acceso de edición, proyecto, etapa y versión antes del envío. El chat no amplía permisos de lectores o revisores. Comparte los contadores existentes de cuatro intentos por minuto y veinte por una ventana de 24 horas por cuenta; además rige la cuota gratuita compartida del proveedor. No hay reintentos ni conmutación automática a una API de pago.

## Activación del administrador

**Conexión activada y comprobada el 24/11/2026.** Se observó «Free · $0» en la consola oficial y el administrador introdujo la credencial directamente en los secretos de Supabase, sin compartirla por este chat. No se contrató un plan de pago ni se agregó una tarjeta. Los siguientes pasos quedan como referencia para mantener o reemplazar la conexión; no repetir la creación de una clave para utilizar el servicio ya activo.

1. Crear o utilizar una organización **Free** de [GroqCloud](https://console.groq.com/). Mantenerla en Free, sin contratar Developer ni configurar un método de pago para esta conexión.
2. Crear una clave dedicada a Camposol QA directamente en GroqCloud. No enviarla por chat, guardarla en el repositorio ni introducirla en un formulario de la aplicación pública.
3. En los secretos de Edge Functions del proyecto Supabase existente `frhmxbdombsqubqlchkj`, agregar `GROQ_API_KEY` con esa clave.
4. Tras comprobar que la organización está en Free, agregar `GROQ_FREE_PLAN_CONFIRMED` con el valor `true`.
5. En «Mi inteligencia artificial» o en el chat, pulsar «Comprobar disponibilidad». Después, verificar una conversación con datos ficticios y la revisión de una propuesta.

La confirmación del plan es una declaración del administrador, no una lectura automática de la facturación del proveedor. Si la organización cambia de plan, desactivar esta conexión antes de seguir utilizándola. La aplicación no puede garantizar el precio de una cuenta que se modifique externamente. Mantener la organización dedicada en Free permite que sus límites detengan las solicitudes sin cambiar a consumo de pago.

Esta credencial administrada es distinta de las claves personales temporales de la modalidad API. Permanece únicamente como secreto del servidor. El navegador solo consulta disponibilidad y envía mensajes con su sesión existente. No recibe ni elige la clave, el proveedor, el modelo o la URL de transporte.

## Contrato y límites

- Se reutiliza `qa-ai`: acción `free_status` para disponibilidad autenticada y acción `chat` para conversar. Las solicitudes anteriores de API propia conservan su contrato.
- Endpoint fijo: `https://api.groq.com/openai/v1/chat/completions`.
- Modelo fijo: `openai/gpt-oss-20b`; modo JSON interno, sin herramientas y sin razonamiento expuesto.
- Contexto revisable de hasta 12.000 caracteres; mensaje de hasta 2.000; contexto, mensaje e historial de hasta 18.000 en conjunto. Se conservan como máximo cuatro pares recientes completos para enviar. Si el último par aún excede el tamaño, se informa del límite sin enviar ni truncar datos a escondidas.
- Salida de hasta 2.048 tokens, conexión de 50 segundos y respuesta HTTP de hasta 200 KB. Se rechazan respuestas truncadas, vacías, con herramientas o sin el contrato de chat esperado.
- Las propuestas se validan con las mismas reglas documentales, citas literales, campos y prioridades de Fase 3. Una propuesta inválida queda bloqueada; el mensaje de conversación se conserva para solicitar una corrección.
- Los mensajes se representan como texto, sin ejecutar HTML o código. No se guardan conversaciones, claves ni prompts en los contadores de uso.
- Los errores del proveedor usan mensajes propios, sin reflejar cuerpos privados. La cuota agotada se informa junto al chat y la pregunta se conserva para que la persona decida qué hacer.

No se añaden tablas, migraciones, dependencias, roles ni políticas alternativas. Se reutilizan Auth, RLS, `qa_ai_reserve`, los comandos QA y el historial existente. La función mantiene JWT obligatorio.

## Verificación

88 pruebas locales superadas: 73 existentes y 15 de chat. Incluyen permisos, sesión, CSRF, consentimiento, contexto y etapas, límites e historial, configuración inactiva, transporte fijo, ausencia de secretos, errores de cuota, propuestas inválidas, revisión y borrador. Compilaciones local y Supabase y ambos chequeos de tipos correctos. Edge Function `qa-ai` versión 4, ACTIVE y JWT obligatorio, desplegada en el proyecto existente; huella del artefacto `76a27f53029e5f16c1946a4bc26149113626664d6022dc263efdc833d45bddaa`.

Código publicado: [`df0dfd7611354e042dad45b1182a86913339bfd2`](https://github.com/brancoretto24102-ui/camposol-qa/commit/df0dfd7611354e042dad45b1182a86913339bfd2). [Verificación 45345747958](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45345747958) y [Pages 45345747988](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45345747988): ambos `completed/success`. La página y su JavaScript públicos devolvieron HTTP 200; después del despliegue, una solicitud sin JWT devolvió 401 y el preflight autorizado devolvió 204.

Se comprobó la conexión real en GitHub Pages con la cartilla exclusivamente ficticia `QA-F3-FREE-001`:

1. Disponibilidad autenticada positiva. El contexto revisable contenía solo la regla ficticia de esa cartilla.
2. Primer mensaje respondido por Groq en la propia página. Segundo mensaje en la misma conversación: propuesta válida con una funcionalidad y cita literal, sin copiar JSON ni abrir un chatbot.
3. Edición de la descripción propuesta. Guardado deshabilitado antes de marcar la revisión y habilitado después de marcarla.
4. Guardado mediante el comando documental existente y recarga: documento versión 3, contexto en borrador, una funcionalidad con su identificador previo y tres revisiones persistidas. No hubo aprobación automática.
5. Proyecto técnico archivado en versión 2; documento e historial conservados. Se comprobó que su asistente ya no permite editarlo.

Se volvió a la cartilla de trabajo y se observó «Chat gratuito disponible · Groq», sin mensajes y con la autorización desmarcada. No se enviaron sus requisitos al proveedor ni se modificó su contenido. Tampoco se cambiaron las preferencias personales de la otra IA.

La comprobación real cubre conversación y análisis; las demás tareas conservan sus verificaciones automatizadas y sus requisitos de etapa. La cuota Free sigue siendo compartida y limitada. Mantener la conexión en Free y comprobar el servicio si cambia su configuración.

## Sign in with ChatGPT

Se revisó la alternativa solicitada. El uso del plan en webs participantes se documenta para Go, Plus, Pro y Business; Free permite identidad pero no esa modalidad de generación en webs participantes. Las herramientas abiertas locales tienen otras condiciones. El código público de este proyecto no convierte su despliegue remoto en un cliente local autorizado. El acceso para una web alojada requiere registro o lista de espera y un cliente emitido por OpenAI. Por ello el usuario eligió la alternativa gratuita con otro proveedor. No se solicitó una conexión ni se creó un botón de inicio de sesión ficticio.

## Referencias oficiales revisadas

- [Groq: cuota del plan gratuito](https://console.groq.com/docs/rate-limits), [facturación y planes](https://console.groq.com/docs/billing-faqs).
- [Groq: API](https://console.groq.com/docs/api-reference), [parámetros del modelo y razonamiento](https://console.groq.com/docs/reasoning).
- [Groq: tratamiento de datos y controles de retención](https://console.groq.com/docs/your-data). La autorización para compartir información de la cartilla sigue siendo necesaria.
- [OpenAI: uso del plan en otras aplicaciones](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites), [aplicaciones abiertas y alojadas](https://developers.openai.com/siwc/token-sharing-open-source), [registro para una web](https://developers.openai.com/siwc/website).
