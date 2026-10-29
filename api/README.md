# API de APS

API REST de Admisión construida con NestJS y TypeScript. La estructura inicial separa:

- `src/aplicacion/`: casos de uso.
- `src/dominio/`: reservado para el modelo de dominio aprobado.
- `src/infraestructura/`: adaptadores de entrada HTTP.
- `src/modulo-aplicacion.ts`: composición de dependencias NestJS.

TypeORM se conecta a PostgreSQL mediante variables de entorno. Todavía no hay entidades ni migraciones de Admisión; faltan decisiones de modelo físico.

## PostgreSQL y entorno

Ejecuta los comandos desde `api/`. Copia `.env.example` a `.env` si este no existe y completa `DB_PASSWORD` localmente. No compartas ni subas ese archivo a Git.

| Variable | Configuración local |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `aps` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | Contraseña local; vacío solo si PostgreSQL permite esa autenticación |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes, exclusivo del entorno |

Las variables del proceso tienen precedencia sobre `.env`. Todas las variables de conexión deben estar definidas; solo la contraseña admite una cadena vacía. `JWT_SECRET` es obligatorio y no debe compartirse ni incorporarse al repositorio.

La base debe existir y PostgreSQL debe estar disponible: la API falla al iniciar si no puede conectarse. Por decisión del responsable del proyecto, se usa temporalmente `synchronize: true`: TypeORM sincroniza el esquema con las entidades registradas al iniciar la API. No se crean bases ni se ejecutan migraciones automáticamente; `migrationsRun` y `dropSchema` permanecen desactivados.

Esta sincronización es solo para desarrollo y puede modificar tablas o provocar pérdida de datos al cambiar entidades. No usarla en producción ni con datos clínicos reales; antes de esos entornos debe reemplazarse por migraciones revisadas y respaldos.

La configuración local no habilita TLS; no debe reutilizarse para conexiones remotas o producción sin definir su protección en tránsito.

## Requisitos

Usa Node.js `22.23.2` (raíz `.nvmrc`).

## Comandos

```bash
npm install
npm run start:dev
npm run build
npm test
npm run test:e2e
```

La comprobación inicial de disponibilidad responde en `GET /salud`.

Las pruebas e2e de HTTP sustituyen la conexión por un doble y no requieren una base local. No verifican conectividad real con PostgreSQL.

## Centros de Salud

Módulo hexagonal independiente en `src/modulos/centros/`, autorizado para la institución del despliegue. Administración mantiene los centros y Admisión consume el mismo catálogo; no hay mantenedor de instituciones ni persistencia de Persona/Paciente.

- Tablas `"Administracion"."centros_salud"` y `"Administracion"."sectores"`, PK INT autoincrementales y FK `centroId` RESTRICT. Se crean con el mecanismo de sincronización de desarrollo existente, sin borrar datos ni insertar ejemplos.
- Centro: `codigo` interno único (trim y mayúsculas, hasta 40), `nombre`/descripción (160), `codigoDeis` opcional (dígitos, hasta 20), `comunaCodigo` (código oficial EIS 0.2.0 o vacío para No informado), `direccion` (300), `telefonos` y `correos` (listas de hasta 20), `activo`, `utilizaSectores`. Código, nombre y dirección obligatorios. DEIS se almacena como texto para conservar dígitos significativos; la validación de formato no verifica su existencia ni correspondencia con el nombre.
- Contactos: `telefonos` y `correos` son arrays JSONB de `{ valor, uso, principal }`, no listas de texto. `uso` conserva el código de ContactPoint.use (`home`, `work`, `temp`, `old`, `mobile`) o vacío para No informado. Cada colección no vacía exige exactamente un principal; no se infiere autorización ni titularidad. Validación de formato telefónico internacional y correo, sin publicar sus valores en errores.
- Sector: `id` técnico generado, `nombre` (120), `color` hexadecimal `#RRGGBB` normalizado a mayúsculas y `activo`. Sin código funcional ni unicidad de nombre inventada. `centroId` viene de la ruta, nunca del cuerpo; no se permite mover sectores entre centros ni asignar el ID desde el cliente.
- POST/PATCH del centro admiten `sectores` opcional: lista de `{ nombre, color, activo }` nuevos y, solo en PATCH, `{ id, nombre, color, activo }` existentes de ese centro. Se valida toda la entrada y se guardan centro y sectores en una única transacción; un error revierte el conjunto. Los IDs existentes no pueden repetirse ni pertenecer a otro centro. Omitir `sectores` o enviar `[]` conserva los existentes: no son instrucciones de borrado. La interfaz utiliza este contrato para preparar sectores en el mismo formulario de alta/edición, sin guardados parciales. Se conservan las rutas individuales para compatibilidad.
- Este ajuste sustituye el contrato provisional de contactos `string[]` y código de sector. Se verificaron ambas tablas vacías antes de ajustar el esquema de desarrollo. No aplicar `synchronize` a instalaciones con datos: requieren una migración revisada que preserve contactos y acuerde los colores de sectores existentes.
- No hay DELETE: desactivar conserva centros, sectores y referencias. Agregar sectores exige centro activo y sectorización habilitada. Desactivar la sectorización no borra sectores. Los PATCH reciben el conjunto completo de atributos editables de su entidad.
- Todos los endpoints aplican la guardia global de sesión y CSRF en mutaciones con cookie. Conservan la política provisional ya acordada: usuarios autenticados sin distinción de rol. No desplegar con datos clínicos reales ni en producción antes de definir permisos institucionales y auditoría persistente.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/centros-salud` | Centros con todos sus sectores y estados, incluidos inactivos para mantenimiento |
| POST | `/centros-salud` | Centro creado con ID técnico y sus sectores (lista vacía si no se enviaron) |
| PATCH | `/centros-salud/:id` | Centro actualizado con sus sectores |
| POST | `/centros-salud/:id/sectores` | Sector creado dentro de ese centro |
| PATCH | `/centros-salud/:id/sectores/:sectorId` | Sector actualizado; 404 si no pertenece al centro |

Errores: 400 para entrada inválida, 401 sin sesión, 403 para CSRF inválido, 404 para referencia inexistente y 409 por código duplicado. Sin valores de contactos en mensajes de error.

Referencia semántica: [Organization CL Core 1.9.3](https://hl7chile.cl/fhir/ig/clcore/StructureDefinition-CoreOrganizacionCl.html) y [Location CL Core 1.9.3](https://hl7chile.cl/fhir/ig/clcore/StructureDefinition-CoreLocalizacionCl.html), FHIR R4 4.0.1. No se acopla el dominio a recursos ni se implementan adaptadores aún. El [catálogo DEIS EIS 0.2.0](https://interoperabilidad.minsal.cl/fhir/ig/eis/0.2.0/CodeSystem-eis-establecimientoscodigodeis-CS.html) incluye institutos Teletón, pero no se importa automáticamente ni se supone cobertura completa/actualizada.

Validación enfocada:

```bash
npm run test:e2e -- centros.e2e-spec.ts
CENTROS_INTEGRATION=1 npm run test:e2e -- centros-postgres.e2e-spec.ts
```

La integración utiliza credenciales locales internamente, crea un esquema sintético aleatorio y lo elimina al finalizar; no modifica registros del catálogo real. Sin `CENTROS_INTEGRATION=1` se omite.

## Módulo Auth

Se autorizó un módulo de autenticación independiente de Admisión. Sus tablas son `"Auth"."usuarios"` y `"Auth"."roles"` (nombre de esquema con mayúscula). En modo `synchronize`, el arranque crea primero los esquemas declarados en las entidades si no existen y después sincroniza las tablas; el usuario de PostgreSQL necesita permisos para crear esquemas y tablas en la base de desarrollo. Cada usuario tiene un único rol mediante una FK obligatoria con eliminación y actualización restringidas. Las cuentas son técnicas y no se vinculan todavía con Persona ni establecen acceso entre instituciones.

- Todas las tablas del sistema deben usar una PK técnica `INT` autoincremental; las FK deben tener el mismo tipo. Usuarios y Roles ya aplican esta convención. No usar RUT ni número de ficha como PK.
- Se autoriza recrear las dos tablas Auth con descarte de sus datos de desarrollo para sustituir UUID por INT. Es una operación puntual autorizada, no un borrado de arranque; el resto de datos/esquemas no se modifica. Las cuentas anteriores deben crearse de nuevo y sus JWT con UUID dejan de ser válidos.
- Login por nombre de usuario, normalizado a minúsculas y único.
- Contraseñas de 6 a 128 caracteres, almacenadas con scrypt y sal aleatoria; nunca se devuelven por API. El mínimo de 6 fue definido para esta etapa de desarrollo y debe reevaluarse antes de usar datos clínicos reales.
- JWT HS256 con emisor y audiencia verificados, duración inicial de 30 minutos y clave privada de entorno.
- El servidor verifica en cada petición la cuenta activa, su rol actual y su versión de sesión. Cambiar rol, estado o contraseña y cerrar sesión invalida todos los JWT anteriores de ese usuario.
- Catálogo cerrado de cinco roles: `super` (Super), `administrador` (Administrador), `usuario` (Usuario), `paciente` (Paciente) y `tutor` (Tutor). El arranque inserta los faltantes de forma idempotente sin sobrescribir nombres editados.
- Temporalmente, todas las rutas funcionales requieren únicamente JWT válido y cuenta activa, sin restricciones por rol. Cualquier usuario conectado puede gestionar usuarios y editar nombres de roles; los permisos por rol se definirán más adelante. Esta política de desarrollo no debe usarse con datos clínicos reales ni en producción.
- Los códigos de rol son únicos e inmutables. No hay endpoints de creación o eliminación de roles ni registro público. Paciente y Tutor son roles de autenticación, no entidades clínicas ni evidencia de representación, consentimiento o autorización de ficha.
- Se impide desactivar o quitar permisos de gestión al último usuario activo con rol Super o Administrador, incluso con actualizaciones concurrentes.
- El login limita a 5 intentos por IP por minuto en este proceso. Tras un proxy se debe definir explícitamente una política segura para identificar al cliente; despliegues con varias instancias requieren un limitador compartido.
- Todas las rutas son privadas por defecto salvo las marcadas públicas (`POST /auth/login` y `GET /salud`). Los guardias de Angular no reemplazan la autorización del servidor.

### Primera cuenta Super

Desde `api/`, con PostgreSQL y el `.env` configurados:

```bash
npm run auth:crear-admin
```

El comando conserva el nombre `auth:crear-admin` y crea una cuenta con rol Super. Solicita usuario y contraseña de forma interactiva, con entrada oculta y confirmación de contraseña. Solo funciona cuando no hay usuarios. No hay cuentas ni contraseñas predeterminadas. Al usar `synchronize`, el comando también sincroniza las entidades registradas; úsalo solo sobre la base de desarrollo autorizada.

### Contratos REST

| Método | Ruta | Acceso / cuerpo |
|---|---|---|
| POST | `/auth/login` | Público: `{ nombreUsuario, clave }`; devuelve `{ token, usuario, expiraEnSegundos }` |
| GET | `/auth/yo` | Usuario autenticado |
| POST | `/auth/logout` | Usuario autenticado; revoca sus sesiones |
| GET | `/auth/usuarios` | Usuario autenticado |
| POST | `/auth/usuarios` | Usuario autenticado: `{ nombreUsuario, clave, rolId }` |
| PATCH | `/auth/usuarios/:id` | Usuario autenticado: `{ activo?, rolId?, clave? }` |
| GET | `/auth/roles` | Usuario autenticado |
| PATCH | `/auth/roles/:id` | Usuario autenticado: `{ nombre }` |

Las rutas privadas aceptan la cookie de sesión HttpOnly (prioritaria) o `Authorization: Bearer <JWT>` para clientes explícitos. El navegador usa exclusivamente cookie: `POST /auth/login` responde `{ usuario, expiraEnSegundos }`, sin token, y envía Set-Cookie. `GET /auth/yo` devuelve esa misma forma con los segundos restantes y Cache-Control: no-store; no renueva el token. Logout invalida la versión de sesión y elimina la cookie. Los errores de login no distinguen cuenta inexistente, inactiva o contraseña incorrecta.

Protección CSRF: login y todas las mutaciones autenticadas mediante cookie requieren `X-Kumara-CSRF: 1`; se rechaza además `Sec-Fetch-Site: cross-site`. La cabecera no simple obliga a preflight entre orígenes; la API no habilita CORS. App/API deben exponerse bajo el mismo origen mediante proxy. No autorizar CORS para sitios arbitrarios: es parte de esta protección. Clientes Bearer sin cookie no requieren CSRF (login sí). Los GET/HEAD no deben modificar datos.

En producción configurar `NODE_ENV=production` y HTTPS: cookie `__Host-kumara-sesion`, Secure, HttpOnly, SameSite=Strict, Path=/, sin Domain, máximo 30 minutos. En desarrollo HTTP se usa `kumara-sesion`, HttpOnly y SameSite=Strict, sin Secure. No ejecutar el modo desarrollo como despliegue productivo. Estas medidas no sustituyen autorización por rol/institución, mitigación de XSS ni MFA.

Los identificadores en respuestas y cuerpos (`id`, `rolId`) son números enteros positivos hasta 2147483647, no cadenas ni UUID. El `sub` del JWT también es numérico. Las FK con RESTRICT impiden eliminar registros referenciados incluso por SQL; no se habilita borrado en cascada.

### Validación y límites actuales

```bash
# Contratos HTTP con repositorio doble; sin conexión real
npm run test:e2e
# Añade integración real usando un esquema sintético aislado y eliminado al finalizar
AUTH_INTEGRATION=1 npm run test:e2e
```

La integración no lee ni modifica usuarios reales de `"Auth"`. Comprueba unicidad, FK, exclusión del hash y conservación de administrador con cambios concurrentes.

Esta base es para desarrollo, no está certificada para producción. La duración de sesión y política de contraseñas son iniciales; faltan validar permisos clínicos e institucionales, MFA, recuperación de contraseñas, protección TLS de despliegue y auditoría persistente protegida. Los eventos actuales son operacionales sin credenciales ni datos personales, no sustituyen esa auditoría.
