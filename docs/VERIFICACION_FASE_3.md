# Verificación de Fase 3

Fecha: 23/11/2026, hora de Perú. Base del repositorio: `0d9d91c1f2e52952ce6394c3ef809334bb92dbf8`. La cuenta, el repositorio y el backend existentes se conservan.

## Resultados ejecutados

- **66 pruebas locales superadas**, cero fallos u omisiones: las 40 anteriores y 26 nuevas de IA.
- Auditoría de dependencias: cero vulnerabilidades informadas; no se añadieron paquetes.
- Compilación local y Supabase verificadas. Ambos comandos incluyen el chequeo de tipos del frontend y de la función de servidor. Se corrigió el tipo genérico del cliente Supabase detectado al incorporar este chequeo adicional.
- **28 comprobaciones PostgreSQL de Fase 3 superadas**, con siete actores temporales dentro de una transacción revertida. Se repitió el conjunto tras aplicar la política explícita de denegación de los contadores privados.
- Después del ROLLBACK: 1 cuenta Auth, 1 proyecto, 0 documentos QA, 0 preferencias de IA y 0 contadores. Ningún actor o proyecto temporal quedó guardado por las pruebas SQL.
- Edge Function `qa-ai` desplegada en el proyecto existente: versión 2, ACTIVE, JWT obligatorio. La solicitud sin autorización devuelve 401 y el preflight del origen autorizado devuelve 204. Las pruebas HTTP se repitieron con la versión final.
- Analizador de seguridad: solo el aviso previo `auth_leaked_password_protection`, sin nuevas observaciones de RLS o funciones. [Referencia](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Cobertura de las pruebas

Preferencias privadas y versionadas; ninguna IA por defecto; ausencia de claves o identidades ajenas en preferencias; Copilot manual; modelo explícito para API; contexto aprobado para propuestas; metodología fijada; validación JSON y bloques Markdown; rechazo de campos de aprobación, tipos incorrectos y tamaño excesivo; referencias reales de funcionalidades y prioridades; citas literales; respuestas con preguntas sin contenido inventado; conservación de casos y funcionalidades previas; rechazo de duplicados; borradores y nueva revisión de contenido aprobado; informe de cobertura sin escritura; modificación acotada de argumentos o resultados; aislamiento de proyectos; cuentas inactivas; versiones antiguas; cuotas persistentes; CORS; sesión y CSRF locales; errores sin reflejar secretos; ausencia de reintentos; rechazo de respuestas truncadas; y ninguna escritura documental al recibir una respuesta API.

Los tres adaptadores se probaron con transporte HTTP controlado, comprobando URL fija, cabeceras oficiales, prompt exacto, límites, extracción del texto y borrado de la credencial temporal. No son pruebas de una generación real ni de la licencia, saldo o cuota de un titular.

## Publicación y revisión de interfaz

Código publicado: [`d776947a593c21ff20751bf1e340a9e240b3e0f6`](https://github.com/brancoretto24102-ui/camposol-qa/commit/d776947a593c21ff20751bf1e340a9e240b3e0f6).

- [Publicación Pages 45330592713](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45330592713): `completed/success`.
- [Verificación 45330592705](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45330592705): `completed/success`. El flujo conserva su nombre histórico «Verificar Fase 1» y ejecuta las 66 pruebas actuales, ambos chequeos de tipos, compilación y auditoría.

Se reutilizó una sesión real de la administradora en GitHub Pages, sin introducir contraseñas ni modificar roles. Se trabajó en una pestaña secundaria; se dejó intacto el formulario que estaba abierto en otra pestaña.

Comprobación interactiva remota con datos ficticios:

1. Creación de `QA-F3-URL-001`, vinculación de DigiProy 1.0 y guardado del contexto ficticio.
2. Asistente inicialmente en «Ninguna IA». Selección temporal de ChatGPT manual, preparación del prompt y botón de copia deshabilitado sin autorización.
3. Reemplazo de una frase en el prompt y copia tras marcar la autorización. Se comprobó el texto copiado, sin abrir ni enviar datos a un proveedor.
4. Importación de una respuesta controlada de análisis, validación de citas, edición de la descripción y botón de aplicar deshabilitado hasta marcar la revisión humana. Guardado de la funcionalidad como borrador, seguido de revisión y aprobación mediante los controles normales.
5. Propuesta controlada de selección: prioridad «Crítica» rechazada; corrección a «Alta», validación, guardado y aprobación humana del conjunto.
6. Respuesta controlada de un caso con dos pasos. Edición manual de la descripción antes de aplicar. El caso quedó en **borrador**, sin aprobación automática.
7. Recarga y recuperación de la descripción y los dos pasos; historial con nueve versiones documentales.
8. Guardado de Copilot manual en preferencias y recarga: se recuperó esa selección y solo estaba disponible la modalidad manual. Se restauró «Ninguna IA» al terminar.
9. Revisión en pantalla estrecha: se solicitó 390 × 844 px; el navegador reportó 417 px CSS efectivos, con igual ancho de página y sin desbordamiento horizontal. Se observaron campos, enlaces, selección de tarea y caso. Se restableció el tamaño normal del navegador.
10. Modalidad API mostrada con campo de credencial de tipo password y envío deshabilitado sin credencial y autorización. No se introdujo ninguna clave ni se pulsó Enviar.
11. La cartilla técnica se archivó y se comprobó que el asistente deja de estar disponible para editarla.

Consulta remota final: **1 cuenta Auth, 2 proyectos técnicos archivados, 1 documento QA, 1 preferencia y 0 contadores de API**. El proyecto de Fase 1 continúa archivado en versión 2. El de Fase 3 queda archivado en versión de proyecto 2, documento 9, contexto y selección aprobados y un caso en borrador con dos pasos. La preferencia final es `none/manual`, versión 2. Se conservaron los datos ficticios de esta prueba visual para permitir consultar el historial; no son registros empresariales ni resultados generados por un modelo.

Se dejó abierta para revisión https://brancoretto24102-ui.github.io/camposol-qa/#mi-ia .

## Límites conservados

No se introdujeron claves reales ni se generaron cargos. La API de Microsoft 365 Copilot queda pendiente de licencia y autorización organizacional. La comprobación de una cita textual no valida automáticamente la semántica de un requisito o cálculo; la revisión humana sigue siendo obligatoria. La consulta sin aplicar es temporal. No hay adjuntos, visión, evidencias ni exportación Excel en Fase 3. Los pendientes manuales de acceso de Fase 1 no se consideran resueltos por estas pruebas.

## Corrección del flujo API — 24/11/2026

La interfaz mostraba el encabezado manual «Pega y valida la respuesta» también después de seleccionar API. La llamada API ya recibía y validaba la respuesta de forma automática; se corrigió su presentación para mostrar «Generar con IA» y «Revisa la propuesta» en la misma página. El formulario de pegar respuestas corresponde a la modalidad manual. En API, el detalle JSON es opcional y se abre si se necesita corregir una respuesta recibida. Cambiar de proveedor o modalidad descarta la consulta temporal anterior.

Se repitieron las 66 pruebas existentes: todas superadas, sin omisiones. Las compilaciones local y Supabase, incluidos los chequeos TypeScript, terminaron correctamente. No se añadieron dependencias ni se modificó el backend, sus migraciones o los permisos. No se realizó una generación pagada con credenciales reales durante esta corrección.

## Corrección de errores de generación API — 24/11/2026

Una solicitud fallida dejaba el aviso de error al principio del asistente y restauraba la invitación inicial junto al resultado. Se agregaron estados explícitos y un aviso local de fallo que conserva el prompt y permanece visible hasta una nueva consulta o descarte. Las respuestas recibidas con errores de validación mantienen el detalle corregible en la misma sección.

El intermediario ahora clasifica códigos oficiales 429 de OpenAI para distinguir saldo, gasto, uso y frecuencia. Se limita la lectura de error a 16 KB y se presentan textos propios; nunca el mensaje original del proveedor, la clave ni datos de la cuenta. Se conserva el aviso genérico si el cuerpo no es interpretable o el código es desconocido. No se modificaron cuotas ni se añadieron reintentos.

- **73 pruebas superadas**, sin fallos ni omisiones: las 66 anteriores, cuatro comprobaciones de presentación del estado y tres pruebas de clasificación, lectura acotada, ausencia de secretos y propagación del error mediante el intermediario.
- Compilaciones local y Supabase correctas, con ambos chequeos TypeScript. Sin nuevas dependencias.
- Edge Function `qa-ai` versión 3 desplegada en el backend existente, ACTIVE y JWT obligatorio. Huella del artefacto: `5f1c86cc2d88cc7e0361e2fa573c45d7f7afd2095f1ca2e6bea0e52df69febc8`.
- La revisión de la interfaz existente fue de lectura: se comprobó el aviso genérico de límite o cuota. No se reenviaron consultas, no se leyeron claves ni se alteró el formulario abierto.
- La clasificación específica de los códigos se verificó con transporte controlado. No se consultó la facturación privada ni se realizó una generación pagada. El motivo exacto de un rechazo anterior con aviso genérico no puede determinarse solo por su estado 429; revisar la indicación específica en un siguiente intento autorizado o la cuenta API.

Publicación de la corrección: [`ffd51725c993f7c83314f348eeabc4e5d772b49d`](https://github.com/brancoretto24102-ui/camposol-qa/commit/ffd51725c993f7c83314f348eeabc4e5d772b49d). [Verificación 45339660603](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45339660603) y [Pages 45339660657](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45339660657): ambos `completed/success`. URL y archivo JavaScript públicos: HTTP 200, con los nuevos avisos comprobados. Huella del JavaScript servido: `7539fab7d86f4b351f121d717aeae760f7bbe04022b73c6e1025fcf4008c6f59`. Tras desplegar `qa-ai` versión 3, una solicitud sin autorización devolvió 401 y el preflight autorizado devolvió 204; no se debilitó la autenticación.

## Chat gratuito integrado — 24/11/2026

El usuario eligió un chat gratuito con otro proveedor después de verificar las condiciones de Sign in with ChatGPT. Se incorporó un chat conversacional de Groq Free como primera modalidad de la cartilla, conservando los métodos anteriores en una pestaña opcional. La disponibilidad depende de una activación real del administrador; no se simula conexión ni se solicita una clave personal a cada usuario.

**88 pruebas superadas**, cero fallos u omisiones: las 73 previas y 15 de chat. Se verificaron contexto de QA, historial alternado y limitado, rechazo de claves/modelos/URLs del cliente, configuración inactiva, endpoint y modelo fijos, ausencia de herramientas y secretos, errores de proveedor sin reintentos, truncamiento, validación de propuestas, aplicación humana como borrador, permisos y versiones, cuotas persistentes, disponibilidad autenticada y CSRF local. Las compilaciones local y Supabase y los chequeos TypeScript fueron correctos.

Se desplegó `qa-ai` versión 4, ACTIVE y con JWT obligatorio, sin tablas, migraciones ni dependencias nuevas. Solicitud sin JWT: 401; preflight autorizado: 204. Código publicado [`df0dfd7611354e042dad45b1182a86913339bfd2`](https://github.com/brancoretto24102-ui/camposol-qa/commit/df0dfd7611354e042dad45b1182a86913339bfd2). [Verificación 45345747958](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45345747958) y [Pages 45345747988](https://github.com/brancoretto24102-ui/camposol-qa/actions/runs/45345747988): ambos `completed/success`. Página y JavaScript públicos: HTTP 200.

### Activación y prueba real

Se observó «Free · $0 · Current Plan» en la consola oficial de Groq. El administrador creó la conexión y guardó `GROQ_API_KEY` y `GROQ_FREE_PLAN_CONFIRMED` directamente en los secretos del proyecto Supabase existente. Solo se comprobaron los nombres guardados; no se leyó, copió ni publicó el valor de la clave. No se añadió tarjeta ni se contrató Developer.

En la URL pública se utilizó una cartilla nueva de datos exclusivamente ficticios, `QA-F3-FREE-001`, sin crear cuentas ni cambiar roles:

1. Disponibilidad real positiva y contexto revisado limitado a la cartilla ficticia.
2. Resumen solicitado y respondido dentro del chat por Groq.
3. Segundo mensaje conservando el hilo: propuesta de análisis validada, con una sola funcionalidad y cita literal. La propuesta apareció editable en la propia página, sin pegar JSON.
4. Descripción editada antes de aplicar. El botón de guardado estaba deshabilitado sin marcar la revisión y habilitado después de marcarla.
5. Guardado como borrador y recarga. Se recuperó la descripción editada: documento versión 3, contexto en borrador, una funcionalidad, identificador anterior conservado y tres revisiones. No se aprobó automáticamente.
6. Archivo de la cartilla técnica: proyecto versión 2, documento versión 3 y sus tres revisiones conservadas. La interfaz archivada ya no ofreció el asistente de edición.
7. Retorno a la cartilla de trabajo: servicio disponible, cero mensajes y autorización desmarcada. Sus requisitos no se enviaron y su contenido no se modificó. Las preferencias personales de la otra IA tampoco se cambiaron.

Esta prueba real cubre conversación y análisis. Las otras tareas mantienen las pruebas automatizadas y los requisitos de etapa. La cuota es gratuita, compartida y limitada; no existe conmutación automática a consumo de pago. Detalles de operación: [CHAT_GRATUITO.md](CHAT_GRATUITO.md).
