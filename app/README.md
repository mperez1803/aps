# Aplicación web de KUMARA

Aplicación Angular 19 con PrimeNG 19. Usa componentes standalone, Angular Signals para estado y comunicación reactiva, y estilos SCSS.

Todos los formularios nuevos o modificados deben usar controles PrimeNG 19 (InputText, Select, DatePicker, Checkbox, RadioButton y otros según corresponda). El login es la única excepción. En Ingresos, identificación y datos demográficos usan cuatro columnas iguales (3-3-3-3) en escritorio y una columna en pantallas pequeñas.

Los campos de texto, selectores y fechas se presentan en InputGroup con InputGroupAddon e iconos representativos de PrimeIcons, cargados localmente desde la dependencia de la aplicación (sin CDN). Se conservan etiquetas visibles y nombres accesibles; los iconos decorativos no reemplazan las etiquetas ni agregan pasos de tabulación. El icono de identificación conserva su acción de abrir el modal.

Todos los addons con icono van a la derecha del control. El RUT se formatea sin puntos y con guion antes del verificador (K mayúscula) al salir del campo o registrarlo con Enter; la tabla de identificaciones aplica el mismo formato al salir del campo. El formato no corrige ni valida por sí solo el dígito verificador.

Las ayudas de los campos usan `pTooltip` de PrimeNG sobre el addon con icono del InputGroup o su botón existente, accesibles con ratón y foco de teclado. No se agregan iconos de información independientes ni una línea de ayuda bajo cada control. Los errores de validación permanecen visibles. Los DatePicker ocupan el ancho disponible dentro del InputGroup, sin contraerse al ancho del icono.

## Organización por módulos funcionales

- `src/app/app.component.*`: contenedor general con la salida del router.
- `src/app/app.routes.ts`: rutas principales y carga diferida de módulos.
- `src/app/modulos/admision/`: primer módulo funcional, con rutas propias en `admision.routes.ts` y pantallas en `paginas/`.

Los módulos son límites funcionales organizados por carpetas y rutas, no `NgModule`. Admisión se carga bajo demanda en `/admision`, incluyendo su página inicial standalone con PrimeNG y signals.

## Login y navegación

- `/login`: acceso real mediante usuario y contraseña contra la API. No hay acceso simulado ni registro público.
- `src/app/estructura/`: estructura general, menú lateral adaptable, encabezado con usuario/rol y cierre de sesión.
- `/admision`: primer módulo funcional; sus áreas todavía están en preparación, sin datos ni estadísticas ficticias.
- `/admision/ingresos`: formulario visual unificado Persona + Paciente, accesible desde el menú lateral y el dashboard. Permite explorar identidad provisional, identificaciones, contactos y direcciones múltiples con principal. No envía ni persiste información, no comprueba duplicidad y mantiene Guardar deshabilitado. No ingresar datos reales. Catálogos, estructura territorial, vigencias y contratos de persistencia siguen pendientes. El alta futura debe crear Persona y Paciente atómicamente, con ficha automática.
- Ingresos se organiza en dos pestañas: Datos Personales y Ficha Clínica (datos administrativos de Paciente). Nombres, Apellidos y Nombre Social están separados; identificaciones y contactos usan fieldsets. Se valida localmente RUT por módulo 11, formato internacional preliminar de teléfonos y formato de correo, sin verificar existencia o titularidad. Nacionalidades/idiomas repetibles tienen principal editable (Chile y español por defecto). Se usan los catálogos demográficos y territoriales descritos abajo. El formulario no está certificado como conforme a FHIR.

### Fuentes de los catálogos de Ingresos

- Incorporados país de dirección y usos de teléfono/correo/dirección, con etiquetas en español y No informado local. Usos: CodeSystem FHIR R4 4.0.1 `contact-point-use` y `address-use`, conforme a las referencias de CL Core.
- Territorio: CodeSystem de regiones (16), provincias (56) y comunas (346) desde las URLs permanentes EIS 0.2.0 incluidas en la instantánea. Los códigos numéricos de provincia y comuna se relacionan por división entera entre 10 y 100 respectivamente; se comprobó que cada referencia de padre existe. No convertirlos en IDs internos ni asumir longitudes de cadenas con ceros iniciales.
- Seleccionar Chile habilita región/provincia/comuna; cada nivel filtra el siguiente y al cambiar un padre se limpian sus descendientes a No informado. Un país distinto de Chile deshabilita y limpia el territorio chileno, conservando el resto de la dirección internacional.
- Pendientes: verificación de categorías familiares en manuales REM, relación del contacto y restantes catálogos internos. No se afirma que estos valores procedan de REM ni se incorporan reglas de reportabilidad a Admisión.

`src/app/modulos/admision/paginas/ingresos/catalogos-ingreso.ts` conserva una instantánea local consultada el 2026-10-27, con URL, sistema, versión y código por catálogo. No consulta servicios externos durante el registro ni envía datos de personas.

- Referencia: [CorePacienteCl, build continuo](https://build.fhir.org/ig/HL7Chile/clcore_ig/branches/master/StructureDefinition-CorePacienteCl.html), versión observada 2.0.1, FHIR 4.0.1. No se adopta el build cambiante como contrato de exportación aprobado.
- Países/nacionalidad (249), sexo biológico (4), sexo registral (5), identidad de género (7), estado civil (7) y pueblos originarios (13): CodeSystem MINSAL EIS 0.2.0, siguiendo los bindings del perfil/extensiones. Sexo registral y pueblos originarios se obtuvieron del build EIS porque el artefacto de pueblos originarios no estaba disponible en la URL publicada. Las fuentes exactas quedan en la instantánea.
- Género administrativo: FHIR R4 4.0.1, cuatro códigos; traducción local al español sin cambiar códigos.

El formulario solo captura sexo biológico e identidad de género, ambos opcionales y con No informado inicial, sin inferencias entre ellos. Sexo registral y género administrativo no tienen controles ni valores en el formulario; sus catálogos se conservan como referencia, sin habilitar captura ni un mapeo FHIR automático.

Datos Personales incluye el fieldset **3. Contactibilidad** en distribución 4-4-4: Teléfonos, Correos y Contactos. Direcciones se ubica en **2. Datos demográficos**. Cada resumen del principal abre una tabla modal mediante su icono derecho. Cada colección, incluidos los contactos de emergencia existentes, mantiene un único principal si contiene registros y reasigna al primero al eliminar el principal. En móvil se apilan. Ser contacto principal no implica tutoría ni autorización de acceso clínico. No existe una pestaña Contactibilidad separada.

Todos los modales de Ingresos usan Table de PrimeNG, ToggleSwitch para el principal y Toolbar superior con Agregar a la izquierda y Cerrar a la derecha, sin acciones al pie. Activar otro interruptor cambia el principal; intentar apagar el principal actual lo mantiene activo para conservar uno por colección. Las columnas Principal y Acciones tienen ancho compacto; los datos ocupan el espacio restante y las tablas permiten desplazamiento horizontal en pantallas pequeñas. Las filas simples no repiten las etiquetas de sus encabezados y mantienen nombres accesibles.

Los modales ocupan el 40% del ancho de la pantalla (`40vw`); hasta 960px utilizan `95vw` mediante los breakpoints de Dialog.

La navegación actual de Ingresos tiene dos pestañas: **1. Datos Personales** y **2. Ficha Clínica**. Esta última muestra datos administrativos de Paciente: ficha de solo lectura (asignación futura por servidor), un centro de salud y un sector perteneciente a ese centro cuando corresponda. Carga los centros activos de la API; el sector aparece solo si el centro utiliza sectores y ofrece sus sectores activos, opcionales con No informado. Cambiar de centro limpia el sector. Actualizar el catálogo conserva las selecciones solo si siguen activas. Los errores de carga son visibles, deshabilitan selección y permiten reintentar. No se admiten varios centros/sectores simultáneos ni inferencias por domicilio. Persona/Paciente y su adscripción no se guardan todavía.

### Administración de centros

`/administracion/centros-salud`, accesible desde menú y dashboard: tabla PrimeNG paginada (10/25/50 filas) y búsqueda por código, nombre o DEIS. Creación/edición en modales de 40vw (95vw hasta 960px), con Toolbar superior: Guardar/Modificar a la izquierda y Cancelar a la derecha. Comuna oficial con No informado, dirección y DEIS opcional separado del código interno. Teléfonos y correos siguen el patrón de Admisión: resumen principal, icono derecho que abre tabla modal, valor, uso y ToggleSwitch para elegir un único principal; al quitarlo se reasigna al primer registro. Los cambios permanecen locales hasta guardar el centro y Cancelar no los persiste. El contrato de centros transporta el código de uso, no el ID interno de la instantánea del selector de Admisión.

La Toolbar del listado utiliza botones PrimeNG sólidos del mismo estilo para Nuevo centro y Actualizar. La búsqueda tiene ancho acotado y comparte una fila con Actualizar, sin el salto provocado por un InputGroup al 100%; en móvil se permite distribución en varias filas.

El color del sector se elige exclusivamente con ColorPicker de PrimeNG en la celda de la tabla, sin InputGroup ni entrada hexadecimal manual. El contrato conserva el formato hexadecimal.

Los ID técnicos de las tablas auxiliares no se muestran al usuario (incluidos Roles y Sectores). Se conservan en los contratos y relaciones internas; los códigos funcionales, como código de centro o DEIS, son independientes y siguen visibles cuando corresponde.

ToggleSwitch para Activo y Utiliza sectores. Al habilitar sectores aparece su resumen con icono de gestión dentro del formulario del centro, igual que teléfonos y correos. Abre una tabla modal editable y paginada con Toolbar Agregar/Cerrar, sin editor independiente ni guardado anticipado. Se pueden preparar sectores durante el alta del centro: centro y sectores se guardan en una única transacción. Cerrar solo vuelve al formulario; Cancelar el centro descarta todos los cambios locales. Campos: ID técnico generado de solo lectura (Al guardar para filas nuevas), nombre, color (selector visual y hexadecimal) y activo; sin código ni traslado entre centros. Solo se quitan filas nuevas; los sectores persistidos se desactivan para conservar referencias. Apagar Utiliza sectores no elimina registros ni descarta silenciosamente filas nuevas: estas deben quitarse o reactivarse la sectorización antes de guardar. Los errores de persistencia permanecen en el editor del centro y conservan el borrador. Se reutilizan las instantáneas territoriales y validadores existentes; `src/app/compartido/centros-salud/servicio-centros.ts` centraliza el contrato HTTP consumido por Administración y Admisión. No se insertan centros de ejemplo.

Ingresos presenta una Toolbar PrimeNG superior con Guardar y Modificar a la izquierda y Cancelar a la derecha (retorno al dashboard de Admisión). Guardar y Modificar permanecen deshabilitados hasta implementar persistencia y carga de registros. El aviso de no ingresar datos reales se mantiene debajo; no se duplican acciones al pie.
- Idiomas: 56 códigos del [ValueSet languages de FHIR R4](https://hl7.org/fhir/R4/valueset-languages.json), sistema `urn:ietf:bcp:47`, etiquetas españolas mediante `Intl.DisplayNames`. Es una lista inicial de idiomas comunes, no una expansión exhaustiva de `all-languages` referenciado por CL Core. Las variantes BCP-47 adicionales requieren ampliar este catálogo.
- Los selectores guardan IDs internos numéricos, no etiquetas ni códigos oficiales. Todos los catálogos deben ofrecer **No informado** para datos ausentes, especialmente en migraciones. El ID `1` es una convención de esta instantánea, no una exigencia universal; no renumerar registros existentes para imponerla. La opción local tiene código oficial vacío (sin mapeo establecido). Las otras opciones conservan su código, sistema y versión originales; un código oficial `1` no es el ID interno `1`. No equiparar automáticamente ausencia de información con «desconocido», «otro» ni una categoría oficial de nombre parecido. No aplicar Chile/español a datos ausentes en migraciones. Los recuentos anteriores corresponden a valores oficiales y excluyen la opción local agregada. Los IDs de la instantánea no deben regenerarse al actualizar fuentes. Los catálogos internos siguen separados del futuro adaptador FHIR; este cambio no implementa persistencia ni certifica conformidad.
- `/administracion`: inicio de Administración con acceso a sus mantenedores. Cuenta con rutas propias en `src/app/modulos/administracion/administracion.routes.ts`, listas para incorporar los mantenedores que se aprueben.
- `/administracion/roles`: tabla con toolbar superior y acción Editar que abre un modal con Toolbar superior Modificar/Cancelar. El catálogo contiene cinco roles fijos (Super, Administrador, Usuario, Paciente, Tutor); solo se edita el nombre, sin creación ni eliminación, y el código permanece inmutable.
- `/administracion/usuarios`: tabla paginada y mantenedor en modal con Toolbar superior Guardar/Modificar y Cancelar, para crear y editar cuentas, asignar un rol, cambiar contraseñas y activar/desactivar usuarios. Mantiene la invalidación de sesiones al modificar la cuenta. La ruta anterior `/administracion/usuarios-roles` redirige aquí.
- Temporalmente, todos los módulos y mantenedores requieren sesión JWT pero no un rol concreto. El menú Administración es visible para cualquier usuario conectado y la API aplica la misma política. Login y salud son públicos; los permisos según rol se definirán posteriormente. No usar esta política provisional en producción ni con datos clínicos reales.
- `src/app/modulos/auth/`: login, estado de sesión con signals, interceptor HTTP y guardias. La interfaz de administración de cuentas pertenece al módulo Administración.

La sesión se transporta en cookie HttpOnly y SameSite=Strict; el JWT no aparece en las respuestas JSON ni en el estado JavaScript. NgRx SignalStore 19.2.1 mantiene únicamente el usuario. Al recargar una ruta protegida, la guardia espera `GET /api/auth/yo` antes de decidir el acceso y restaura el vencimiento restante (30 minutos desde el login, sin renovación automática). No se utiliza localStorage/sessionStorage. Logout revoca la sesión en el servidor y elimina la cookie.

Las mutaciones `/api/` llevan `X-Kumara-CSRF: 1`, también el login. Es una cabecera no simple que requiere preflight entre orígenes, no un secreto; la API no habilita CORS. Mantener app y API bajo el mismo origen mediante proxy. En producción `NODE_ENV=production` activa la cookie `__Host-kumara-sesion` con Secure, Path=/ y sin Domain; HTTPS es obligatorio. Solo desarrollo HTTP utiliza `kumara-sesion` sin Secure. No habilitar CORS para orígenes arbitrarios ni permitir esta cabecera a sitios no confiables.

Los errores de restauración distintos de 401 se muestran en el login, no se confunden con una restauración exitosa. La cookie protege contra lectura de credenciales por JavaScript, pero no evita que un XSS opere con una sesión abierta: siguen siendo necesarios controles de contenido y autorización.

Los contratos de usuarios y roles usan identificadores numéricos (`INT` autoincremental en PostgreSQL). Los selectores de rol envían números, no UUID ni cadenas.

En desarrollo, `proxy.conf.json` envía `/api` a `http://localhost:3000`, retirando ese prefijo. Inicia también la API y crea el primer administrador con el comando documentado en su README. Después de cambiar el proxy se debe reiniciar `npm start`.

En producción se requiere configurar un reverse proxy HTTPS equivalente para `/api`; el proxy de Angular CLI es solo de desarrollo. No se deben incluir secretos de API en el frontend.

Las pruebas de navegación cubren redirección al login y acceso a los mantenedores con sesión, independientemente del rol. Su ejecución con Karma requiere Chrome/Chromium configurado mediante `CHROME_BIN`.

## Requisitos

Usa Node.js `22.23.2` (raíz `.nvmrc`).

## Comandos

```bash
npm install
npm start
npm run build
npm test
```

El proyecto está preparado con el tema Aura de PrimeNG. Las pantallas y flujos funcionales de Admisión se incorporarán conforme se definan sus requisitos.
