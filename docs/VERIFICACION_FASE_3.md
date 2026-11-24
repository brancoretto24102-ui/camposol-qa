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
