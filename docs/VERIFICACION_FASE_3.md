# Verificación de Fase 3

Fecha: 23/11/2026, hora de Perú. Base del repositorio: `0d9d91c1f2e52952ce6394c3ef809334bb92dbf8`. La cuenta, el repositorio y el backend existentes se conservan.

## Resultados ejecutados

- **66 pruebas locales superadas**, cero fallos u omisiones: las 40 anteriores y 26 nuevas de IA.
- Compilación local y Supabase verificadas. Ambos comandos incluyen el chequeo de tipos del frontend y de la función de servidor. Se corrigió el tipo genérico del cliente Supabase detectado al incorporar este chequeo adicional.
- **28 comprobaciones PostgreSQL de Fase 3 superadas**, con siete actores temporales dentro de una transacción revertida. Se repitió el conjunto tras aplicar la política explícita de denegación de los contadores privados.
- Después del ROLLBACK: 1 cuenta Auth, 1 proyecto, 0 documentos QA, 0 preferencias de IA y 0 contadores. Ningún actor o proyecto temporal quedó guardado por las pruebas SQL.
- Edge Function `qa-ai` desplegada en el proyecto existente: versión 2, ACTIVE, JWT obligatorio. Primera versión comprobada por HTTP: solicitud sin autorización devuelve 401; preflight del origen autorizado devuelve 204. Revisión final de esta versión registrada al publicar.
- Analizador de seguridad: solo el aviso previo `auth_leaked_password_protection`, sin nuevas observaciones de RLS o funciones. [Referencia](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Cobertura de las pruebas

Preferencias privadas y versionadas; ninguna IA por defecto; ausencia de claves o identidades ajenas en preferencias; Copilot manual; modelo explícito para API; contexto aprobado para propuestas; metodología fijada; validación JSON y bloques Markdown; rechazo de campos de aprobación, tipos incorrectos y tamaño excesivo; referencias reales de funcionalidades y prioridades; citas literales; respuestas con preguntas sin contenido inventado; conservación de casos y funcionalidades previas; rechazo de duplicados; borradores y nueva revisión de contenido aprobado; informe de cobertura sin escritura; modificación acotada de argumentos o resultados; aislamiento de proyectos; cuentas inactivas; versiones antiguas; cuotas persistentes; CORS; sesión y CSRF locales; errores sin reflejar secretos; ausencia de reintentos; rechazo de respuestas truncadas; y ninguna escritura documental al recibir una respuesta API.

Los tres adaptadores se probaron con transporte HTTP controlado, comprobando URL fija, cabeceras oficiales, prompt exacto, límites, extracción del texto y borrado de la credencial temporal. No son pruebas de una generación real ni de la licencia, saldo o cuota de un titular.

## Publicación y revisión de interfaz

Pendiente de registrar el commit publicado, los resultados de GitHub Actions y la comprobación interactiva del sitio. Una compilación por sí sola no acredita publicación ni una generación real con IA.

## Límites conservados

No se introdujeron claves reales ni se generaron cargos. La API de Microsoft 365 Copilot queda pendiente de licencia y autorización organizacional. La comprobación de una cita textual no valida automáticamente la semántica de un requisito o cálculo; la revisión humana sigue siendo obligatoria. La consulta sin aplicar es temporal. No hay adjuntos, visión, evidencias ni exportación Excel en Fase 3. Los pendientes manuales de acceso de Fase 1 no se consideran resueltos por estas pruebas.
