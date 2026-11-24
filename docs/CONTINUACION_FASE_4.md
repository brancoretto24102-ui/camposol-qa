# Camposol QA — capturas y Excel

Actualizado el 24/11/2026, hora de Perú. Se conserva el repositorio `brancoretto24102-ui/camposol-qa`, GitHub Pages y Supabase `frhmxbdombsqubqlchkj`. No crear otro repositorio, Site ni backend.

## Uso

1. En la cartilla, abrir **3. Casos y pasos**, completar y guardar el caso.
2. En **Capturas y referencias del caso**, elegir el paso, escribir una descripción opcional y seleccionar los archivos. La carga comienza al seleccionarlos. Se pueden adjuntar hasta cinco PNG/JPG de 5 MB por paso, dentro de 50 MB activos/pendientes por cartilla. Límite de imagen: 24 megapíxeles.
3. Consultar la captura con **Ver captura**. Para corregir una carga incompleta, utilizar **Confirmar carga** o **Retirar captura** y volver a adjuntar el archivo.
4. Abrir **Matriz → Descargar Excel**. Se exporta el contenido guardado, con Hoja de Control, Casos de Prueba y una hoja independiente por cada paso/fila: Referencia 01, Referencia 02, etc., incluso cuando varias filas pertenecen al mismo caso.
5. Cada celda de REFERENCIA en J tiene un salto interno a su hoja. El botón **Regresar** vuelve a esa misma celda J. Los comentarios conservan K:M. Las imágenes quedan incrustadas; el Excel no necesita conectarse a Supabase para mostrarlas.

Las referencias se reconstruyen con el orden actual de casos y pasos. Las capturas se vinculan mediante los identificadores estables de proyecto, caso y paso; reordenar no cambia esa asociación. Si cambia el texto del paso, sus argumentos o el resultado esperado, las capturas anteriores se señalan y se bloquea su exportación hasta retirarlas o reemplazarlas. Los pasos retirados o casos excluidos no exportan sus capturas. Una hoja sin imagen lo indica expresamente; no se fabrican evidencias.

La exportación no aprueba contenido ni acredita una ejecución exitosa. Hoja de Control informa las aprobaciones documentales existentes. Se comprobó el diseño de la plantilla E819: columnas A:J, Comentario K:M, anchos, Century Gothic, referencias consecutivas y panel de evidencia. No se publicó el libro original ni se copiaron sus casos o capturas. El XLSX se genera a partir de la cartilla actual; no es una copia del archivo empresarial.

## Persistencia y permisos

Migración aplicada: `20261124134050_camposol_qa_phase4_evidence.sql`. No repetirla. Amplía el proyecto existente con `qa_evidence`, `qa_evidence_sets` y cuatro RPC. El bucket privado `qa-evidence` ya existía y se reutiliza.

Solo un editor efectivo de una cartilla no archivada puede reservar una carga o retirarla. El servidor verifica la versión documental, que el paso pertenece al caso incluido, el tamaño y los límites. La identidad, ruta y copia del paso se determinan en el servidor. No hay escrituras REST directas de metadatos.

La carga usa una ruta nueva e inmutable, sin upsert. La confirmación exige que exista el objeto con tamaño y MIME concordantes. Una carga pendiente dura hasta 24 horas. Los objetos confirmados no tienen política UPDATE ni DELETE para clientes. Retirar los aparta de futuras exportaciones y registra auditoría; conserva el archivo histórico. Esto consume la cuota del almacenamiento existente: la limpieza física administrativa y la restauración desde la interfaz quedan para una ampliación posterior.

Los lectores autorizados pueden consultar y exportar los archivos del proyecto, sin editar. Los accesos a proyectos ajenos y cuentas inactivas conservan las restricciones de RLS. No se usan enlaces públicos ni claves privilegiadas en el navegador. Se verifica la huella SHA-256 y las dimensiones al recuperar los bytes. La exportación compara de nuevo la versión documental y la revisión de evidencias antes de descargar, para no entregar una mezcla silenciosa de cambios concurrentes.

SQLite local conserva la misma autorización, CSRF, límites, asociación y retiro; los bytes son privados dentro de la base local. No se sirve su directorio por el servidor de aplicación.

## Comprobaciones

- 101 pruebas Node: 88 anteriores y 13 de capturas/Excel. Ejecución final completa: 101 superadas, cero fallos u omisiones.
- 27 comprobaciones RLS/Storage remotas superadas en una transacción revertida. Al terminar: cero filas de evidencia y cero objetos de evidencia en el backend. No quedaron actores o archivos de esas pruebas.
- Compilaciones finales local y Supabase correctas, con ambos chequeos TypeScript, después de los ajustes OOXML.
- La auditoría de dependencias dio cero vulnerabilidades tras fijar ExcelJS 4.4.0, JSZip 3.10.1 y el override de uuid 11.1.1. ExcelJS se carga al descargar, fuera del paquete inicial.
- Se corrigieron dos defectos de salida de ExcelJS: vínculos internos con relaciones externas duplicadas y el atributo `editAs` inválido en `oneCellAnchor`. La salida usa ubicaciones OOXML internas sin relaciones externas y anclajes válidos.
- Un lector independiente comprobó tres imágenes y seis enlaces internos tanto en la generación Node como en la descarga final del navegador. LibreOffice importó el libro y produjo cinco páginas con destinos internos diferenciados para J3, J4 y J5. Se revisó la imagen y el botón de una hoja de evidencia. Esto no equivale a una prueba de Microsoft Excel de escritorio.
- Revisión de interfaz mediante los componentes reales en una página local aislada, con almacenamiento simulado y datos ficticios: carga por selector de archivos, asociación de tres capturas a tres pasos y descarga XLSX en el navegador. El API HTTP local sí se comprueba por las pruebas automatizadas. La carga HTTP de un archivo en Supabase con una sesión real está pendiente de una revisión posterior a la publicación; no presentar el almacenamiento simulado como esa comprobación.
- Se reparó `scripts/dev.mjs` para propagar los argumentos de puerto del entorno de vista previa; el backend solo admite ese puerto adicional en loopback. No se cambiaron los orígenes del intermediario de IA ni los retornos de Auth.

## Alcance pendiente

Esta entrega cubre capturas manuales por paso y el Excel con imágenes y navegación. No incorpora todavía documentos fuente, análisis de imágenes con IA, videos ni la administración completa de plantillas. Los pendientes de acceso de Fase 1 permanecen. El chat gratuito y sus secretos no se modificaron.

Pendiente de cierre de esta implementación: verificaciones finales, publicación de código y comprobación de GitHub Actions/Pages. Actualizar este apartado con los resultados reales.
