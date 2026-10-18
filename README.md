# Cubo Studio · Interfaz minimalista

Rediseño funcional de Cubo Studio 1.14 a partir del ejecutable proporcionado. El motor del cubo, la verificación, el historial, los formatos de biblioteca y las exportaciones se conservan. La interfaz y su organización se implementan en una capa separada.

## Descargar

- [Aplicación para Windows (.exe)](https://github.com/sebaawl/cubestudio/raw/refs/heads/main/dist/Cubo-Studio-Minimal.exe)
- [Paquete completo (.zip)](https://github.com/sebaawl/cubestudio/raw/refs/heads/main/dist/Cubo-Studio-Minimal.zip)
- [Versión autónoma HTML](https://github.com/sebaawl/cubestudio/raw/refs/heads/main/dist/Cubo-Studio-Minimal.html)

![Interfaz de Cubo Studio](docs/interfaz.png)

## Usar la aplicación

- **Windows:** abrir `dist/Cubo-Studio-Minimal.exe`. Conserva el contenedor nativo y las bibliotecas WebView2 del programa original; requiere los mismos componentes de Windows y WebView2. La ejecución del contenedor nativo debe comprobarse en Windows: este trabajo se desarrolló en Linux.
- **Sin instalar:** abrir `dist/Cubo-Studio-Minimal.html` en un navegador Chromium actual (Chrome o Edge). Es un archivo autónomo y no necesita conexión a Internet.
- **Desarrollo:** desde este directorio, ejecutar `python3 -m http.server 8000 --bind 0.0.0.0`. El punto de entrada es `index.html`.

La aplicación sigue guardando la sesión y los presets localmente. Los datos de un navegador, un archivo HTML y la aplicación de Windows pueden pertenecer a almacenamientos diferentes. Para trasladar la biblioteca, usar **Biblioteca → Exportar biblioteca** en el original e **Importar** en la nueva versión.

## Organización

- La cabecera fija contiene **Ayuda**, **Entorno**, **Biblioteca** y **Exportar**.
- La barra de herramientas conserva **Cámara**, **Pintar**, **Pegatinas**, **Piezas** y **Girar capas**, con las teclas 1–5.
- El panel **Propiedades** muestra **Cámara**, **Estilo** y **Herramienta**. Elegir una herramienta abre sus ajustes correspondientes.
- Bajo el lienzo están el historial, la verificación contextual, el encuadre y la escala.
- **Restablecer**, junto al lienzo, agrupa la herramienta actual, los colores originales y el estudio completo. Los cambios se pueden deshacer.
- **Entorno** conserva los temas anteriores, los bloqueos, el orden de pestañas, la posición del panel y las ventanas independientes. Se añadieron los temas neutros **Papel** y **Carbón**.

En pantallas pequeñas, las propiedades se sitúan debajo del lienzo y se desplazan de forma independiente. Los nombres de las herramientas permanecen visibles.

## Reconstruir

```sh
python3 scripts/build.py
```

Solo requiere Python 3. El script genera `index.html` y los entregables de `dist/`. Inserta `ui/studio.css` y `ui/studio.js` en el HTML recuperado, sin modificar sus quince scripts originales.

Para generar el `.exe`, sustituye exclusivamente el recurso HTML reservado del ejecutable original y recalcula el checksum PE. Comprueba la huella SHA-256 del original, el tamaño disponible, la ausencia de firma Authenticode, el contenido descomprimido y que el código nativo, los metadatos y las bibliotecas no cambien. No requiere recompilar el contenedor de Windows.

## Verificar

```sh
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
python3 tests/verify.py
```

Puede usarse un navegador instalado mediante `CUBO_CHROME=/ruta/al/navegador`. La suite levanta su propio servidor local, usa sesiones temporales y guarda el informe, las capturas y los archivos exportados en `test-results/`. No modifica datos reales del usuario.

Comprueba integridad del código, presencia de los controles originales, equivalencia de estado y píxeles con el original, edición, cámara, giros, captura y flechas, estilos, biblioteca, verificación, descargas reales, bloqueos, ventanas, persistencia y varios tamaños de pantalla.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `src/original.html` | Aplicación recuperada del ejecutable, sin modificaciones. |
| `src/Cubo-Studio-1.14.exe` | Ejecutable original conservado para reconstrucciones verificables. |
| `ui/studio.css` | Sistema visual, distribución y adaptación a pantallas pequeñas. |
| `ui/studio.js` | Organización de controles y mejoras de presentación. |
| `scripts/build.py` | Generación reproducible de HTML y ejecutable. |
| `tests/verify.py` | Pruebas funcionales y comparación con el original. |
| `docs/funciones.md` | Inventario y ubicación de funciones. |
| `docs/validacion.md` | Resultados y alcance de la validación. |
| `licenses/WebView2.txt` | Aviso de licencia del componente nativo, conservado del original. |
