# Instrucciones generales del repositorio

Estas reglas aplican a todo KUMARA. Las instrucciones más específicas en `api/AGENTS.md`, `docs/AGENTS.md` y las skills del proyecto complementan estas reglas; si aplican a una tarea, léelas y síguelas.

## Estructura y comandos

- Este repositorio contiene proyectos independientes en `api/` y `app/`; cada uno tiene sus propias dependencias y comandos npm. No hay `package.json` en la raíz.
- Ejecuta instalaciones, builds y pruebas desde el proyecto correspondiente. Usa Node.js `22.23.2`, según `.nvmrc`.
- Antes de cambiar código, revisa la implementación y documentación relacionadas para seguir la arquitectura y los contratos existentes.

## Cambios y calidad

- Mantén los cambios acotados al requerimiento y reutiliza patrones, componentes y servicios existentes. Evita duplicar lógica o introducir dependencias sin necesidad.
- Conserva la separación entre módulos y responsabilidades ya establecida. No cambies contratos, modelos o comportamiento observable sin que el requerimiento lo justifique.
- Actualiza la documentación directamente relacionada cuando cambie el comportamiento, los contratos o los procedimientos.
- Para cada cambio de lógica, agrega o actualiza pruebas unitarias que cubran el comportamiento nuevo o modificado, siguiendo el framework y los patrones existentes en el proyecto afectado.
- Ejecuta las pruebas unitarias afectadas y las comprobaciones relevantes del proyecto; amplía la validación si los cambios abarcan más áreas. Comunica claramente cualquier validación que no se haya podido realizar.
- No declares funcionalidad como persistida, validada o disponible si el código no lo implementa.

## Flujo diario de Git

- Cuando el usuario inicie la jornada diciendo `Hola`, aplica la skill [`flujo-git-diario`](.github/skills/flujo-git-diario/SKILL.md) antes de comenzar el trabajo: inspecciona el estado y prepara una rama local `work/YYYY-MM-DD`, usando la fecha local. Reutiliza la rama de esa fecha si ya existe y es seguro hacerlo.
- Antes de crear o cambiar de rama, inspecciona el estado del árbol, la rama actual y la rama principal (`main` o `master`). Si hay cambios previos sin guardar, conflictos, una rama diaria con trabajo no integrado, o no se puede identificar con certeza la rama base, detente y consulta al usuario. No ocultes, muevas ni sobrescribas cambios por cuenta propia.
- Cuando el usuario cierre la jornada diciendo `Bye`, valida el trabajo realizado y deja la rama preparada para revisión. No integres a `main`/`master`, no hagas push y no elimines ramas sin aprobación explícita del usuario.

## Aplicación web

- La aplicación usa Angular 19, componentes standalone, PrimeNG 19, PrimeIcons y SCSS. Sigue las convenciones del módulo y reutiliza el diseño existente.
- Para crear, modificar o refactorizar cualquier interfaz de la app, aplica la skill [`diseno-global-angular`](.github/skills/diseno-global-angular/SKILL.md) para mantener coherencia visual entre módulos y páginas.
- Para crear, modificar o refactorizar formularios, aplica la skill [`crear-formularios-angular`](.github/skills/crear-formularios-angular/SKILL.md).
- No agregues datos ficticios como si fueran reales ni afirmes que una función está conectada a servicios o persistencia si no lo está.

## API

- La API usa NestJS, TypeScript, TypeORM y PostgreSQL. Sigue la organización y las decisiones documentadas en `api/README.md` y las instrucciones de `api/AGENTS.md`.
- Trata los secretos y la configuración local únicamente mediante variables de entorno; no incorpores credenciales ni archivos `.env` al repositorio.
- No uses datos clínicos reales en desarrollo o pruebas. Respeta las advertencias documentadas sobre sincronización de esquema y despliegue.
