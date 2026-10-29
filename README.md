# KUMARA

**Plataforma Integral de Gestión Clínica**

Tecnología al servicio de las personas

Monorepo de KUMARA. La API y la aplicación web son proyectos independientes y mantienen su propio `package.json` y archivo de dependencias. El nombre del producto es KUMARA; la base de datos local conserva el nombre técnico `aps`.

## Proyectos

- [`api/`](./api/README.md): API REST con NestJS, TypeORM y PostgreSQL. La estructura inicial separa aplicación e infraestructura; el dominio clínico se incorporará cuando sus contratos estén definidos.
- [`app/`](./app/README.md): aplicación Angular 19 con PrimeNG 19 y componentes standalone.

## Acceso local

La aplicación inicia en `/login`. El módulo Auth gestiona usuarios y cinco roles fijos (Super, Administrador, Usuario, Paciente y Tutor) en el esquema PostgreSQL `"Auth"`; Admisión permanece separado. Crea la primera cuenta Super desde `api/` con `npm run auth:crear-admin`, sin contraseñas predeterminadas. Consulta el README de la API para configurar `.env` y el de la app para el proxy de desarrollo.

## Convención de claves

Todas las tablas del sistema deben tener una PK técnica `INT` autoincremental y FK de tipo compatible, con integridad referencial real. Usuarios y Roles ya usan esa convención. RUT y ficha son identificadores de negocio, no claves primarias técnicas.

## Requisitos

- Node.js `22.23.2` (versión indicada en `.nvmrc`)
- npm

Instala dependencias dentro de cada proyecto y ejecuta sus comandos desde esa carpeta. No hay `package.json` en la raíz.
