---
name: diseno-global-angular
description: "Mantén la coherencia visual de toda la aplicación Angular para que sus páginas se sientan parte de un mismo producto. Úsala al crear, modificar o refactorizar pantallas, navegación, layouts, componentes compartidos, estilos globales o responsive."
---

# Diseño global de la aplicación Angular

Mantén una experiencia visual coherente en KUMARA. Las páginas, módulos y componentes deben sentirse parte de una sola aplicación, sin impedir que cada flujo resuelva sus necesidades particulares.

## Principio rector

Antes de diseñar, descubre y reutiliza el lenguaje visual existente. No inventes un tema paralelo ni uniformes pantallas con necesidades diferentes de manera artificial. La coherencia se logra con patrones compartidos de tipografía, color, espaciado, estructura, estados, controles e interacción.

## Inspección obligatoria

Antes de cambiar la interfaz:

1. Revisa `app/README.md`, `app/src/styles.scss` y el layout principal.
2. Inspecciona una o más pantallas existentes del mismo tipo y de otros módulos para reconocer patrones comunes y variaciones intencionales.
3. Revisa componentes compartidos, configuración de PrimeNG, assets, tokens SCSS y convenciones de responsive y accesibilidad.
4. Comprueba las versiones y APIs de Angular y PrimeNG usadas en el proyecto.
5. Si los patrones existentes son contradictorios, identifica cuál está más vigente y limita los cambios a lo necesario; no hagas una renovación visual global sin autorización.

## Elementos que deben mantener coherencia

- **Identidad:** logotipo, nombre, tono visual y uso de iconografía.
- **Estructura:** navegación, encabezados, títulos y descripciones de página, áreas de contenido y pie cuando corresponda.
- **Tipografía:** familias, jerarquía, tamaños, pesos, interlineado y contraste.
- **Color:** fondos, superficies, texto, bordes, estados y color de énfasis; reutiliza las variables o tokens existentes.
- **Espaciado y forma:** escala de márgenes y gaps, alineación, anchos de contenido, radios, bordes y densidad.
- **Componentes e interacción:** botones, enlaces, tarjetas, tablas, formularios, diálogos, tooltips, mensajes, estados de carga, error y vacío.
- **Responsive y accesibilidad:** comportamiento consistente en distintos anchos, foco visible, teclado, etiquetas accesibles y contraste suficiente.

El CSS actual usa una base clara con fondo `#f3f6f8`, texto `#233e4b`, identidad verde/teal y un layout con navegación lateral. Toma esos valores como referencias observadas, no como permiso para copiar colores literalmente en cada componente. Prefiere tokens compartidos; si todavía no existen, propón extraer solo los valores realmente reutilizados y evita una refactorización de estilos no relacionada.

## Implementación

- Extiende patrones o componentes compartidos cuando eso evite divergencias entre páginas. No abstraigas componentes por una única coincidencia superficial.
- Usa PrimeNG 19 y PrimeIcons según las dependencias y convenciones existentes; no introduzcas otra biblioteca visual sin autorización.
- Mantén los estilos locales cerca del componente y reserva `styles.scss` para reglas globales y tokens compartidos.
- Evita valores visuales arbitrarios, duplicación de reglas, `!important`, selectores frágiles sobre el DOM interno de PrimeNG y estilos inline innecesarios.
- No alteres la navegación, el comportamiento funcional, el contenido clínico ni los permisos solo para lograr una apariencia uniforme.
- Al modificar formularios, aplica también la skill `crear-formularios-angular` si está disponible.
- Conserva los cambios acotados a las pantallas relacionadas y actualiza `app/README.md` si se establece o cambia una convención visual compartida.

## Validación

1. Revisa la pantalla junto con el layout y, cuando sea posible, compárala con otras pantallas representativas.
2. Comprueba escritorio y móvil; verifica que no haya desbordamiento, pérdida de contenido ni acciones inaccesibles.
3. Verifica estados relevantes (normal, interacción, error, carga o vacío) que correspondan al cambio.
4. Ejecuta build o pruebas focalizadas si el cambio lo requiere y reporta lo que no se pudo validar.

## Criterio de aceptación

La pantalla respeta el lenguaje visual existente, reutiliza patrones apropiados, mantiene su comportamiento funcional, funciona en tamaños relevantes y es accesible. Las diferencias entre módulos son deliberadas y responden a su función, no a estilos inventados independientemente.
