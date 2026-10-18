# Inventario de funciones

Se conservan todos los scripts originales y todos los controles con identificador que el original crea al iniciar. La comprobación automatizada registra sus identificadores en `test-results/original-control-ids.json`. Esta tabla describe las funciones por flujo de trabajo.

| Grupo | Funciones conservadas | Ubicación |
| --- | --- | --- |
| Cámara interactiva | Órbita libre, Alt + arrastrar, Shift + rueda, pellizco táctil, encuadre y transiciones animadas. | Lienzo, barra inferior y pestaña Cámara. |
| Encuadre | Frontal, tres cuartos, isométrica, elevación suave y dos caras; cara principal, dirección, cara superior automática o fija, selección de una a tres caras adyacentes. | Cámara. |
| Referencia de cara | Clic derecho o pulsación prolongada; usar una cara como referencia o como superior; blanco o amarillo arriba; volver a automático. | Menú contextual del lienzo y Cámara. |
| Pintar | Seis colores, centros como referencia fija, pintura individual, acceso a las seis vistas, estados pintados y no pintados. | Pintar → Herramienta. |
| Pegatinas | Mostrar/ocultar, aislar, mostrar y hacer transparente una pegatina. | Pegatinas → Herramienta. |
| Piezas | Operar juntas las pegatinas de centros, aristas y esquinas; mostrar/ocultar, aislar y transparentar. | Piezas → Herramienta. |
| Salida de ocultas | Solo trazo, transparencia graduable, colores visibles u ocultación total; políticas independientes para pintura y selección. | Herramienta → Salida de ocultas. |
| Visibilidad global | Sin colores, mostrar todos y restaurar los colores originales. | Herramienta y menú Restablecer. |
| Giros | Arrastrar capas exteriores o centrales, giros precisos U/D/R/L/F/B, inverso, mezcla aleatoria y cubo resuelto. | Girar capas → Herramienta y lienzo. |
| Captura | Detener un giro a la mitad, conservar la pose, completar o cancelar el giro; orientar, guardar y exportar la captura. | Girar capas → Modo captura y barra sobre el lienzo. |
| Flechas | Activación, color, 2D/3D, giro automático/manual, giro numérico y dial, grosor, arco, punta, escala horizontal/vertical y profundidad; sin contorno, silueta o aristas; grosor/color del contorno y reinicio. | Modo captura → Ajustar flecha. |
| Trazo | Línea limpia, cómic orgánico y sin contorno; grosor, irregularidad, variación de tinta, color y divisiones 3 × 3. | Estilo → Trazo. |
| Paleta | Paletas Original, Clásico, Vibrante, Apagado, Pastel, Profundo y Manual; seis colores individuales; opacidad de caras. | Estilo → Color y fondo. |
| Fondo de ilustración | Color y opacidad; transparencia al exportar. | Estilo → Color y fondo y Exportar. |
| Visor | Cuadrícula de transparencia, fondo propio, contraste automático y modo enfoque; fondo independiente de la ilustración. | Botones junto y debajo del lienzo; Estilo → Fondo del visor. |
| Historial | Deshacer y rehacer, incluidos restablecimientos; respeta bloqueos. | Barra inferior y atajos originales. |
| Verificación | Cubo completo o caras seleccionadas, diagnóstico de compatibilidad física, resultados y marcas de diagnóstico; permite editar y exportar casos incompatibles. | Pintar/Girar capas → Verificar caso. |
| Presets | Guardar, cargar, sobrescribir, eliminar, buscar, paginar y consultar detalles; conserva cámara activa al cargar y aplica el encuadre guardado por separado. | Biblioteca. |
| Carpetas | Crear, renombrar, quitar sin borrar presets, filtrar, mover presets, reordenar carpetas y presets mediante botones o arrastre. | Biblioteca → Organizar. |
| Intercambio de biblioteca | Exportar e importar JSON; compatibilidad y migración de bibliotecas originales; mezcla de bibliotecas y carpetas. | Biblioteca → Exportar biblioteca / Importar. |
| Exportación | PNG y SVG vectorial editable; lado mayor de 1024/2048/4096 px, transparencia, ajuste al borde, recorte rectangular o lienzo cuadrado, nombre automático/regenerable o manual y vista previa. | Exportar. |
| Entorno | Todos los temas originales y el modo sistema; panel izquierdo/derecho, orden de pestañas, ventanas flotantes, arrastre, redimensionamiento, colapso y acoplamiento; ventanas independientes de Trazo y Color. | Entorno y botones de ventana en las propiedades. |
| Bloqueos | Cámara, escala, giros, pintura, selección, estilo, paleta, fondo, biblioteca y distribución; bloqueos por campo y posición de ventanas. | Candados y Entorno → Bloqueos/Paneles. |
| Restablecimientos | Herramienta, cámara, trazo, color/fondo, salida de ocultas, flecha, colores, cubo resuelto, estudio completo y distribución. | Cada grupo y menú Restablecer. |
| Persistencia y acceso | Sesión y biblioteca locales, preferencias del entorno, atajos 1–5/F/Ctrl Z/Ctrl Shift Z/Ctrl S/Ctrl E/barra invertida/?, navegación de pestañas con teclado y uso táctil. | Toda la aplicación. |

Las novedades son de presentación: títulos directos, tipografía de sistema, superficies neutras, colores de pincel con nombre, accesos fijos, controles de escala en el lienzo y temas Papel/Carbón. No se añadió un servicio remoto ni una dependencia de red.
