# Chat gratuito integrado de Camposol QA

Actualizado el 25/11/2026, hora de Perú. El usuario eligió priorizar un chat integrado gratuito para las cuentas autorizadas de Camposol QA, con otro proveedor. Se conserva el repositorio, GitHub Pages y el backend Supabase existentes.

## Corrección de propuestas sin citas — 25/11/2026

La captura del usuario muestra una respuesta de conversación recibida y una propuesta rechazada porque su cita no satisface la validación: debe contener al menos ocho caracteres normalizados y existir en los requisitos admitidos para esa tarea. Ese rechazo no guarda la propuesta. La captura no permite determinar si la cita exacta faltaba, era demasiado corta o no coincidía; el mensaje anterior agrupaba esas posibilidades.

Se encontraron dos debilidades: el transporte pedía únicamente un objeto JSON, sin exigir los campos de cada propuesta, y el historial perdía el motivo del rechazo. Además, las instrucciones de citas no distinguían las fuentes admitidas por tarea. No se desactivó la comprobación literal ni se completaron citas por suposición.

La corrección usa `response_format.type=json_schema` y `strict=true`, documentados para el mismo modelo `openai/gpt-oss-20b`. Se reutiliza el formato canónico de cada tarea para exigir sus campos, incluyendo `source_quote`, con objetos cerrados y `proposal` nullable. Las instrucciones especifican ocho caracteres literales, las secciones válidas por tarea y la respuesta de aclaración con `proposal:null` cuando falte sustento. El esquema exige estructura; la longitud, pertenencia de las citas, permisos y coherencia documental siguen comprobándose en el servidor.

El historial ahora incluye `validation_error` cuando una propuesta fue rechazada. La interfaz ofrece **Preparar corrección**: completa un mensaje que el usuario revisa y envía. Se informa de que utiliza otra consulta de la cuota gratuita. No se realiza un reintento automático ni se guarda una propuesta sin revisión humana.

Comprobación local: 109 pruebas superadas, incluidas una selección con cita inválida, su corrección en una segunda consulta explícita y la comprobación de que ninguna respuesta cambia la cartilla hasta ejecutar el guardado. También se comprobaron citas ausentes, cortas e inventadas, esquema por tarea, preservación del motivo del rechazo y presentación de la recuperación. Ambas compilaciones y TypeScript correctos. No se añadieron dependencias, tablas, roles ni cambios a las cuotas o secretos.

Backend actualizado en el proyecto existente: `qa-ai` versión **6**, ACTIVE, `verify_jwt=true`, artefacto `944ee2827583811d8d4bc3bab94a20812e18aa1629d804e6d11046182726ff85`. Se comparó con la versión remota anterior: únicamente cambiaron el contrato del chat y su transporte. Las rutas de API personal, la autenticación y los permisos conservaron su código.

La conexión al navegador local no estuvo disponible en esta continuación. No se recargó la pestaña del usuario ni se reenviaron sus requisitos. La prueba con transporte simulado no se presenta como una generación nueva de Groq. Tras publicarse, la siguiente consulta autorizada desde la página comprobará la respuesta real del proveedor con el nuevo contrato. La conversación es temporal; guardar las ediciones de la cartilla antes de recargar.

Publicación comprobada: código [`010c19ce9b3cdeb8972fb2e3f6db65e2e007d38b`](https://github.com/brancoretto24102-ui/camposol-qa/commit/010c19ce9b3cdeb8972fb2e3f6db65e2e007d38b), [verificación 45700291179](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45700291179) y [Pages 45700291229](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45700291229), ambas `completed/success`. La URL pública y `index-RA4ElSjC.js` devolvieron HTTP 200; el recurso servido contiene **Preparar corrección** y el historial con `validation_error`.

Referencias primarias: [Groq — Structured Outputs](https://console.groq.com/docs/structured-outputs). El historial de verificación y activación que sigue corresponde a la implementación inicial.

## Funcionamiento

El Asistente IA de la cartilla abre primero «Chat gratuito». Utiliza Groq con el modelo abierto `openai/gpt-oss-20b`; no es una sesión del portal de ChatGPT. Las modalidades anteriores se conservan en «Mi otra IA · opcional», sin cambiar las preferencias personales guardadas.

La persona elige la tarea y el caso cuando corresponde, revisa el contexto que compartirá, autoriza su uso y escribe mensajes normales. Las respuestas se muestran en la misma página. Las propuestas válidas aparecen en un editor; solo se guardan como borrador después de una revisión humana explícita. La aprobación documental conserva sus controles existentes.

El historial del chat vive en memoria de la página. Se envían el contexto revisado y los últimos mensajes, dentro de los límites de tamaño. Cambiar el contexto, la tarea, el caso o la modalidad descarta la conversación temporal. Cambiar la versión documental reinicia el asistente. Las propuestas aplicadas sí se conservan en la cartilla y sus revisiones.

Se comprueban perfil activo, acceso de edición, proyecto, etapa y versión antes del envío. El chat no amplía permisos de lectores o revisores. Comparte los contadores existentes de cuatro intentos por minuto y veinte por una ventana de 24 horas por cuenta; además rige la cuota gratuita compartida del proveedor. No hay reintentos ni conmutación automática a una API de pago.

## Activación del administrador

La interfaz y el servidor quedan preparados, pero la disponibilidad será falsa hasta configurar la conexión real. No presentar pruebas simuladas como una conexión activada.

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
- Modelo fijo: `openai/gpt-oss-20b`; esquema JSON estricto por tarea, sin herramientas y sin razonamiento expuesto.
- Contexto revisable de hasta 12.000 caracteres; mensaje de hasta 2.000; contexto, mensaje e historial de hasta 18.000 en conjunto. Se conservan como máximo cuatro pares recientes completos para enviar. Si el último par aún excede el tamaño, se informa del límite sin enviar ni truncar datos a escondidas.
- Salida de hasta 2.048 tokens, conexión de 50 segundos y respuesta HTTP de hasta 200 KB. Se rechazan respuestas truncadas, vacías, con herramientas o sin el contrato de chat esperado.
- Las propuestas se validan con las mismas reglas documentales, citas literales, campos y prioridades de Fase 3. Una propuesta inválida queda bloqueada; el mensaje de conversación se conserva para solicitar una corrección.
- Los mensajes se representan como texto, sin ejecutar HTML o código. No se guardan conversaciones, claves ni prompts en los contadores de uso.
- Los errores del proveedor usan mensajes propios, sin reflejar cuerpos privados. La cuota agotada se informa junto al chat y la pregunta se conserva para que la persona decida qué hacer.

No se añaden tablas, migraciones, dependencias, roles ni políticas alternativas. Se reutilizan Auth, RLS, `qa_ai_reserve`, los comandos QA y el historial existente. La función mantiene JWT obligatorio.

## Verificación

88 pruebas locales superadas: 73 existentes y 15 de chat. Incluyen permisos, sesión, CSRF, consentimiento, contexto y etapas, límites e historial, configuración inactiva, transporte fijo, ausencia de secretos, errores de cuota, propuestas inválidas, revisión y borrador. Compilaciones local y Supabase y ambos chequeos de tipos correctos. Edge Function `qa-ai` versión 4, ACTIVE y JWT obligatorio, desplegada en el proyecto existente; huella del artefacto `76a27f53029e5f16c1946a4bc26149113626664d6022dc263efdc833d45bddaa`.

Pendientes de cierre: configurar una clave de una organización Free, comprobar disponibilidad real y probar una conversación y propuesta en la URL pública sin introducir datos empresariales. Hasta entonces no afirmar que se realizó una generación real ni que la conexión está activada.

## Sign in with ChatGPT

Se revisó la alternativa solicitada. El uso del plan en webs participantes se documenta para Go, Plus, Pro y Business; Free permite identidad pero no esa modalidad de generación en webs participantes. Las herramientas abiertas locales tienen otras condiciones. El código público de este proyecto no convierte su despliegue remoto en un cliente local autorizado. El acceso para una web alojada requiere registro o lista de espera y un cliente emitido por OpenAI. Por ello el usuario eligió la alternativa gratuita con otro proveedor. No se solicitó una conexión ni se creó un botón de inicio de sesión ficticio.

## Referencias oficiales revisadas

- [Groq: cuota del plan gratuito](https://console.groq.com/docs/rate-limits), [facturación y planes](https://console.groq.com/docs/billing-faqs).
- [Groq: API](https://console.groq.com/docs/api-reference), [parámetros del modelo y razonamiento](https://console.groq.com/docs/reasoning).
- [Groq: tratamiento de datos y controles de retención](https://console.groq.com/docs/your-data). La autorización para compartir información de la cartilla sigue siendo necesaria.
- [OpenAI: uso del plan en otras aplicaciones](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites), [aplicaciones abiertas y alojadas](https://developers.openai.com/siwc/token-sharing-open-source), [registro para una web](https://developers.openai.com/siwc/website).
