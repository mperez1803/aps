---
name: crear-formularios-angular
description: >
  Estándar obligatorio para crear, modificar y refactorizar formularios Angular 18+
  con PrimeNG 19, PrimeIcons y SCSS. Aplicar a formularios CRUD, registro,
  edición, consulta, búsqueda, diálogos y componentes de captura de datos.
  Mantiene el diseño del sistema, separa HTML/TS/SCSS, utiliza Signals en
  componentes reutilizables, organiza formularios extensos con Fieldset y
  sitúa acciones con iconos y tooltips en una Toolbar superior.
---

# Skill: crear-formularios-angular

## 1. Objetivo y prioridad

Crear y mantener formularios Angular siguiendo **un único patrón de diseño**, coherente con el sistema principal. La prioridad es:

1. Respetar el diseño y las convenciones existentes del proyecto.
2. Reutilizar componentes, estilos y patrones ya implementados.
3. Priorizar PrimeNG 19 y PrimeIcons.
4. Separar siempre TypeScript, HTML y SCSS.
5. Ubicar las acciones en una Toolbar superior.
6. Usar Signals cuando el componente sea reutilizable.
7. Agrupar formularios extensos mediante Fieldset.
8. Garantizar accesibilidad, validación y diseño responsive.

**Nunca inventar un patrón visual nuevo si el proyecto ya dispone de uno.**

## 2. Inspección obligatoria antes de generar código

Antes de crear o modificar un formulario:

- Comprobar versiones instaladas de Angular y PrimeNG.
- Inspeccionar formularios similares del módulo y del sistema principal.
- Revisar tema, tokens de diseño, variables SCSS, tipografías, espaciados, colores y densidad visual.
- Identificar componentes compartidos, directivas, servicios, interfaces y convenciones de carpetas.
- Revisar cómo el proyecto gestiona Reactive Forms, errores, permisos, notificaciones y estados de carga.
- Reutilizar la grilla, Toolbar, Fieldset y estilos existentes si ya hay una implementación establecida.

No agregar bibliotecas visuales nuevas ni cambiar el tema global por iniciativa propia. Si hay patrones contradictorios, seguir el patrón vigente del módulo principal y evitar cambios fuera del alcance.

## 3. Estructura obligatoria de archivos

Todos los componentes Angular deben separar sus archivos:

```text
paciente-form/
├── paciente-form.component.ts
├── paciente-form.component.html
└── paciente-form.component.scss
```

- `.ts`: lógica, estado, eventos, validaciones y coordinación de servicios.
- `.html`: estructura y presentación.
- `.scss`: estilos específicos, reutilizando las variables y clases globales.

Usar `templateUrl` y `styleUrl`/`styleUrls`, según las convenciones del proyecto. No utilizar templates ni estilos inline en el decorador. Evitar lógica compleja en el HTML y duplicación de estilos globales.

## 4. Signals para componentes reutilizables

Si el formulario o componente está pensado para reutilizarse, **usar Angular Signals** para su estado reactivo.

- `signal()` para carga, modo, selección y estado local.
- `computed()` para estados derivados y habilitación de acciones.
- `input()` para entradas reactivas.
- `output()` para emitir eventos.
- `model()` solo si se requiere enlace bidireccional.
- `effect()` únicamente para efectos secundarios justificados; no usarlo para propagar estados derivados.

Para formularios complejos, usar **Reactive Forms** (`FormGroup`, `FormControl`, `FormArray`) cuando corresponda; Signals complementa el estado de interfaz y no sustituye innecesariamente el modelo de validación.

```typescript
readonly cargando = signal(false);
readonly soloLectura = signal(false);
readonly modoEdicion = signal(false);
readonly puedeGuardar = computed(
  () => !this.cargando() && !this.soloLectura()
);
```

Evitar crear abstracciones genéricas para formularios simples que no serán reutilizados.

## 5. PrimeNG 19 y PrimeIcons

Usar los componentes y APIs vigentes de **PrimeNG 19** antes de crear controles propios:

| Necesidad | PrimeNG 19 |
|---|---|
| Texto | `pInputText` |
| Texto multilínea | `pTextarea` |
| Número | `p-inputnumber` |
| Fecha | `p-datepicker` |
| Selección | `p-select` |
| Selección múltiple | `p-multiselect` |
| Booleano | `p-checkbox`, `p-toggleswitch` |
| Agrupación | `p-fieldset` |
| Acciones | `p-toolbar`, `p-button` |
| Ayuda | `pTooltip` |
| Mensajes | `p-message`, `p-toast` |
| Confirmación | `p-confirmdialog` o patrón existente |
| Diálogo | `p-dialog` |
| Tabla | `p-table` |

Usar **PrimeIcons** (`pi pi-*`) en acciones. No incorporar Angular Material, Bootstrap u otras bibliotecas de UI sin autorización. Comprobar las APIs y los imports reales del proyecto antes de generar código.

## 6. Estructura visual del formulario

Orden obligatorio:

1. **Toolbar superior** con las acciones disponibles.
2. Contenido del formulario.
3. Fieldsets de agrupación cuando el volumen o la naturaleza de los datos lo justifique.
4. Mensajes de validación junto a sus campos.

No crear una segunda barra de acciones CRUD al pie del formulario salvo que el sistema principal ya exija explícitamente ese patrón.

### 6.1 Toolbar superior

**Izquierda: acciones CRUD**, según el formulario:

| Acción | Icono sugerido |
|---|---|
| Nuevo | `pi pi-plus` |
| Guardar | `pi pi-save` |
| Editar | `pi pi-pencil` |
| Eliminar | `pi pi-trash` |

**Derecha: acciones utilitarias**, según el formulario:

| Acción | Icono sugerido |
|---|---|
| Buscar | `pi pi-search` |
| Cancelar | `pi pi-times` |
| Actualizar | `pi pi-refresh` |
| Limpiar filtros | `pi pi-filter-slash` |

**Los botones NO son obligatoriamente los mismos en todos los formularios.** Mostrar únicamente acciones necesarias, autorizadas y funcionales, de acuerdo con el modo, permisos y caso de uso. No generar botones sin implementación.

### 6.2 Botones solo con iconos

Todos los botones de acción de la Toolbar deben:

- Mostrar **solo el icono**, sin texto visible.
- Tener un `pTooltip` descriptivo.
- Incluir `aria-label` accesible.
- Respetar las variantes, tamaños, colores y estilos del sistema principal.
- Gestionar correctamente `disabled`, carga y permisos.
- Ejecutar una acción real.

Ejemplo orientativo de HTML para un componente que define `nuevo()`, `guardar()`, `eliminar()`, `buscar()`, `cancelar()` y `puedeGuardar()`:

```html
<p-toolbar styleClass="form-toolbar">
  <ng-template #start>
    <div class="form-actions">
      <p-button
        icon="pi pi-plus"
        pTooltip="Nuevo registro"
        tooltipPosition="bottom"
        aria-label="Nuevo registro"
        severity="success"
        [text]="true"
        (onClick)="nuevo()" />

      <p-button
        icon="pi pi-save"
        pTooltip="Guardar cambios"
        tooltipPosition="bottom"
        aria-label="Guardar cambios"
        [text]="true"
        [disabled]="!puedeGuardar()"
        (onClick)="guardar()" />

      <p-button
        icon="pi pi-trash"
        pTooltip="Eliminar registro"
        tooltipPosition="bottom"
        aria-label="Eliminar registro"
        severity="danger"
        [text]="true"
        (onClick)="eliminar()" />
    </div>
  </ng-template>

  <ng-template #end>
    <div class="form-actions">
      <p-button
        icon="pi pi-search"
        pTooltip="Buscar registros"
        tooltipPosition="bottom"
        aria-label="Buscar registros"
        severity="secondary"
        [text]="true"
        (onClick)="buscar()" />

      <p-button
        icon="pi pi-times"
        pTooltip="Cancelar operación"
        tooltipPosition="bottom"
        aria-label="Cancelar operación"
        severity="secondary"
        [text]="true"
        (onClick)="cancelar()" />
    </div>
  </ng-template>
</p-toolbar>
```

Este ejemplo **no implica que deban mostrarse todos los botones**. Adaptar la Toolbar al formulario real y a la identidad visual existente. Importar `ToolbarModule`, `ButtonModule` y `TooltipModule` cuando corresponda.

## 7. Fieldsets y agrupación lógica

Cuando el formulario tenga muchos datos, usar `p-fieldset` para agrupar campos por significado funcional, por ejemplo:

- Identificación.
- Información general.
- Datos de contacto.
- Dirección.
- Información administrativa.
- Configuración.
- Observaciones.

Reglas:

- Evitar Fieldsets innecesarios en formularios pequeños.
- Agrupar por dominio funcional, no únicamente por cantidad de controles.
- Usar títulos breves y claros.
- Evitar anidamiento excesivo.
- Aplicar `toggleable` solo cuando facilite la navegación.
- Mantener márgenes y espaciados uniformes.

```html
<p-fieldset legend="Identificación">
  <div class="form-grid">
    <!-- Campos de identificación -->
  </div>
</p-fieldset>

<p-fieldset legend="Datos de contacto">
  <div class="form-grid">
    <!-- Campos de contacto -->
  </div>
</p-fieldset>
```

## 8. Grilla y responsive

Respetar el sistema de grilla del proyecto. Si no existe uno, utilizar una grilla responsive consistente:

- Escritorio: 2 a 4 columnas, según espacio y contenido.
- Tablet: 1 o 2 columnas.
- Móvil: 1 columna.
- Campos largos y observaciones: ancho completo cuando corresponda.
- Alinear etiquetas, controles y mensajes.
- Evitar anchos rígidos y espacios vacíos injustificados.

SCSS de referencia **solo si el proyecto no cuenta con una grilla equivalente**:

```scss
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.form-field {
  grid-column: span 4;
  min-width: 0;
}

.form-field--wide {
  grid-column: span 6;
}

.form-field--full {
  grid-column: span 12;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

@media (max-width: 1024px) {
  .form-field {
    grid-column: span 6;
  }
}

@media (max-width: 640px) {
  .form-field,
  .form-field--wide {
    grid-column: span 12;
  }
}
```

## 9. Validaciones

Priorizar Angular Reactive Forms cuando se necesiten validaciones.

- Mostrar errores cerca del campo correspondiente.
- Mostrar errores al interactuar con el campo o intentar guardar, no prematuramente.
- Indicar claramente los campos obligatorios.
- Utilizar mensajes concretos y comprensibles.
- Aplicar estilos de error del sistema sin depender solo del color.
- Bloquear operaciones duplicadas durante guardado.
- Mantener validación en backend como fuente definitiva.

Ejemplos de mensajes: «El nombre es obligatorio», «Ingrese un correo electrónico válido», «La fecha de término no puede ser anterior a la fecha de inicio».

## 10. Estados y comportamiento

Considerar solo los estados necesarios: nuevo, consulta, edición, guardando, eliminando y error.

- La Toolbar debe reflejar modo, permisos y estado.
- En consulta, impedir modificaciones.
- En edición, habilitar guardar y cancelar según corresponda.
- Durante guardado, evitar solicitudes duplicadas.
- Antes de eliminar, solicitar confirmación.
- Al cancelar con cambios pendientes, respetar el patrón de confirmación existente.
- Ante fallas de red, conservar los datos capturados cuando sea posible.
- Informar éxito y error mediante los mecanismos del sistema.

## 11. Coherencia visual obligatoria

Respetar tipografía, tamaños, colores, espaciados, bordes, radios, sombras, alturas, iconografía, densidad y responsive del sistema principal.

Prohibido:

- Inventar una estética independiente para cada formulario.
- Agregar colores arbitrarios o estilos inconsistentes.
- Cambiar estilos globales para resolver detalles locales.
- Duplicar clases o componentes compartidos.
- Abusar de estilos inline.
- Sobrescribir estilos internos de PrimeNG de forma frágil.

**Si hay conflicto entre un ejemplo de esta skill y el diseño real del sistema, prevalece el diseño real del sistema**, manteniendo las reglas estructurales de separación de archivos, Toolbar y accesibilidad.

## 12. Accesibilidad

- Asociar cada etiqueta con su control.
- Usar `aria-label` y tooltip en cada botón de solo icono.
- Garantizar navegación por teclado y foco visible.
- Comunicar errores mediante texto y no solo color.
- Confirmar acciones destructivas.
- Mantener feedback de carga y resultados.

## 13. Procedimiento obligatorio del agente

1. Inspeccionar el proyecto y sus formularios existentes.
2. Identificar el patrón visual que se debe seguir.
3. Determinar si el componente será reutilizable.
4. Definir campos, validaciones y grupos funcionales.
5. Seleccionar únicamente las acciones necesarias.
6. Crear la Toolbar superior con CRUD a la izquierda y utilitarios a la derecha.
7. Implementar controles PrimeNG 19 y Fieldsets cuando corresponda.
8. Usar Signals en componentes reutilizables y Reactive Forms cuando aplique.
9. Separar siempre `.ts`, `.html` y `.scss`.
10. Verificar responsive, accesibilidad, estados y tooltips.
11. Comprobar compilación y pruebas si el entorno lo permite.
12. Informar cualquier verificación que no se haya podido ejecutar; no afirmar que se probó sin hacerlo.

No modificar archivos fuera del alcance sin justificación técnica.

## 14. Criterios de aceptación

- [ ] Mantiene la identidad visual del sistema principal.
- [ ] Se inspeccionaron patrones y componentes existentes.
- [ ] HTML, TypeScript y SCSS están separados.
- [ ] PrimeNG 19 y PrimeIcons tienen prioridad.
- [ ] La Toolbar está en la parte superior.
- [ ] Las acciones CRUD están a la izquierda.
- [ ] Las acciones utilitarias están a la derecha.
- [ ] Los botones de acción muestran solo iconos.
- [ ] Cada botón de acción tiene tooltip y `aria-label`.
- [ ] Solo aparecen botones necesarios y funcionales.
- [ ] Los formularios extensos se agrupan en Fieldsets.
- [ ] Los componentes reutilizables utilizan Signals.
- [ ] Las validaciones y estados están implementados.
- [ ] El diseño es responsive y accesible.
- [ ] No se duplican estilos ni componentes existentes.
- [ ] No se introducen bibliotecas visuales innecesarias.
- [ ] Se verificó compilación cuando fue posible.

## 15. Instrucción final

**Aplicar automáticamente esta skill al crear, ampliar, modificar o refactorizar cualquier formulario Angular.** La coherencia con el sistema principal es prioritaria. No cambiar el patrón visual por preferencias estéticas del agente ni exigir que todos los formularios tengan los mismos botones.
