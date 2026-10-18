# Validación del rediseño

Realizada el 18 de octubre de 2026 en Linux, con Python 3, Playwright 1.62.0 y Google Chrome en modo headless.

**Resultado: 14 grupos de pruebas aprobados; 0 fallos y 0 errores de JavaScript.** El informe completo y la huella del HTML probado están en `docs/test-report.json`; la suite se reproduce con `python3 tests/verify.py`.

| Comprobación | Resultado |
| --- | --- |
| Integridad | Los 15 scripts de la aplicación original permanecen idénticos. |
| Controles | Se conservan los 144 controles originales identificados al iniciar, sin identificadores duplicados. |
| Motor | Misma instantánea de estado y mismo PNG píxel por píxel que el original tras giros, pintura, selección y captura con flecha 3D. |
| Cámara | Arrastre, escala, frontal, isométrica, referencia de cara, cara superior, reinicio y encuadre de varias caras. |
| Edición | Pintura, deshacer/rehacer, pegatinas, piezas completas, aislamiento, transparencia y visibilidad global. |
| Movimiento | Giro preciso e inverso, mezcla físicamente válida, cubo resuelto, captura de 45°, cancelación/finalización y ajustes de flecha 3D. |
| Estilo | Trazo, grosor, color, divisiones, paletas, colores individuales, opacidad y separación de fondo de ilustración/visor. |
| Exportaciones | Descarga real de PNG con lado mayor de 1024 px y SVG con geometría vectorial, sin imágenes incrustadas; nombre manual y ajustes de marco. |
| Biblioteca | Guardado, búsqueda, carpetas, importación/exportación JSON, persistencia al recargar y aplicación separada de cámara guardada. |
| Verificación física | Acepta el cubo resuelto, informa una pintura imposible y permite seguir exportando. |
| Entorno | Persistencia de temas Papel/Carbón, bloqueo de escala, desacoplamiento/acoplamiento de paneles, modo enfoque, atajos y menú Restablecer. |
| Adaptación | Navegación visible y lienzo operativo a 1440×1000, 1280×720, 1024×768, 760×820, 390×844 y 320×720. Sin desbordamiento horizontal ni solapamiento en los controles de cámara comprobados. |
| Controles abiertos | Contraste de vista seleccionada; incrementos, límites mínimo/máximo y campos deshabilitados; opciones que respetan los bloqueos; preferencia persistente de cuadrícula. |
| Arranque autónomo | El recurso HTML comprimido real del ejecutable inicia, carga Manrope y permite girar el cubo con el navegador sin conexión. El documento se entrega mediante una respuesta local interceptada; no necesita recursos remotos. |

## Contenedor de Windows

Se generó `dist/Cubo-Studio-Minimal.exe` a partir del ejecutable proporcionado. El recurso HTML mantiene el tamaño reservado; los metadatos CLR se leen correctamente y el checksum PE es válido. Las bibliotecas `CuboStudio.Core.dll`, `CuboStudio.WinForms.dll`, `CuboStudio.Loader.dll` y su licencia permanecen idénticas. El script de construcción comprueba que ningún otro byte cambie, excepto el checksum PE.

La aplicación y su arranque desde el recurso comprimido se verificaron en Chrome. **La apertura nativa del `.exe` no se ha ejecutado en Windows**, por lo que esta validación no certifica la instalación de WebView2 ni la integración nativa con ventanas y diálogos de ese sistema. Requiere los mismos componentes de Windows que la versión original.

La publicación de los archivos en GitHub es independiente de la publicación del entorno en la nube. Se guardaron `install_script` y `start_skill` en el borrador de configuración; su revisión y publicación corresponden al usuario.
