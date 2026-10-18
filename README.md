# MailySoft Backoffice

Backoffice de MailySoft: una aplicación de una sola página (React) con la que el equipo de la plataforma administrará usuarios y sus roles de sistema, tipos de suscripción y clínicas. Consume las APIs REST de la plataforma y se identifica con Auth0.

**Estado**: están implementadas la feature `001-auth-session-profile` (acceso, sesión y perfil) y la `002-manage-users` (administración de usuarios y de sus roles de sistema). Los tipos de suscripción y las clínicas llegan con las features siguientes.

## Qué hace hoy

- **Acceso** con Auth0 (flujo de código con PKCE, tokens solo en memoria). Solo entra quien está registrado en la plataforma de usuarios, tiene el estatus activo y al menos un role autorizado (`Administrator`, `Developer`, `Marketing` o `Billing`); el resto ve un "acceso denegado" con el motivo.
- **Permisos** `recurso:acción` (`users`, `subscriptions`, `tenants` con `read`, `write`, `update` y `delete`): el acceso se vuelve a comprobar cada 5 minutos y al volver a la pestaña, y la navegación solo ofrece las secciones que la persona puede leer.
- **Cierre de sesión** completo (también en Auth0), sincronizado entre pestañas y sin datos al pulsar Atrás.
- **Inactividad**: aviso a los 14 minutos y cierre a los 15; al volver a identificarse se regresa a la pantalla anterior. También se maneja la sesión vencida.
- **Perfil** de solo lectura con los datos del usuario de la plataforma.
- **Usuarios** (sección `/users`): listado paginado de los usuarios activos con detalle, búsqueda por correo (también encuentra bloqueados y eliminados), alta con sus roles, modificación de nombre y apellidos, agregar y quitar roles, bloquear y desbloquear, y eliminar y reactivar. Cada acción que cambia quién puede entrar o qué puede hacer una persona pide confirmación y nombra al usuario; lo que se ofrece depende de los permisos de quien opera y del estatus del usuario, y nadie puede bloquear, eliminar ni cambiar los roles de su propio usuario.
- Interfaz en español, accesible (WCAG 2.1 AA) y adaptable de 1024 px a 320 px.

## Requisitos

| Requisito            | Detalle                                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js y npm        | Node 24 LTS (ver `.nvmrc`) y npm 11.                                                                                                                                                                                                                              |
| Auth0                | Una aplicación _Single Page Application_ y una API, configuradas como indica [auth0-configuration.md](specs/001-auth-session-profile/contracts/auth0-configuration.md). La aplicación debe estar **autorizada para acceder a la API** (_User Access_ de la API).  |
| Servicio de usuarios | Repositorio `mailySoft-usuarios`, con la operación `GET /api/v1/authorization/me` (pendiente de implementar: [solicitud](specs/001-auth-session-profile/contracts/users-service-me-request.md)).                                                                  |
| Gestión de Auth0     | Para la feature 002, el servicio de usuarios necesita su aplicación _Machine to Machine_ autorizada para la Management API con `read:users`, `create:users` y `update:users`: crear, bloquear, desbloquear, eliminar y reactivar llaman a Auth0 a través de ella. |

## Puesta en marcha

```powershell
npm ci
Copy-Item .env.example .env.local   # completa el dominio, el client id y el audience de Auth0
npm run dev                         # http://localhost:5173 (puerto fijo: las URL de Auth0 dependen de él)
```

La guía completa para levantar el servicio de usuarios, cargar cuentas de prueba y validar la feature está en [quickstart.md](specs/001-auth-session-profile/quickstart.md); la de la administración de usuarios, en [quickstart.md](specs/002-manage-users/quickstart.md).

> **Crear un usuario desde el Backoffice crea una cuenta real en Auth0.** Para probar usa correos desechables que controles; eliminar un usuario desde el Backoffice deja su cuenta bloqueada y marcada en Auth0, no la borra.

Dependencias que añade la feature 002 (versiones exactas): `@mui/x-data-grid` (la tabla del listado, que se carga solo al entrar en `/users`), `react-hook-form` y `@hookform/resolvers` (los formularios, validados con los esquemas de Zod).

### Variables de entorno

Todas son públicas (`VITE_*`, nunca llevan secretos), se validan con Zod al arrancar y, si alguna es inválida, la aplicación muestra qué variable corregir. Los archivos `.env*` no se versionan; el modelo es [.env.example](.env.example). El detalle de cada regla está en [environment.md](specs/001-auth-session-profile/contracts/environment.md).

| Variable                                             | Obligatoria | Uso                                                                               |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `VITE_AUTH0_DOMAIN`                                  | Sí          | Dominio del tenant de Auth0, sin esquema.                                         |
| `VITE_AUTH0_CLIENT_ID`                               | Sí          | Client id de la aplicación SPA.                                                   |
| `VITE_AUTH0_AUDIENCE`                                | Sí          | Identificador de la API de Auth0.                                                 |
| `VITE_USERS_API_URL`                                 | Sí          | Base del servicio de usuarios: `/proxy/users` en desarrollo o una URL `https`.    |
| `VITE_CLINICS_API_URL`, `VITE_SUBSCRIPTIONS_API_URL` | No          | Bases de las APIs de clínicas y de suscripciones (features 003 y 004).            |
| `VITE_FEATURE_POSTMAN_TOKEN`                         | No          | `true` o `false` (por defecto `false`); herramienta de token de la feature 005.   |
| `USERS_API_PROXY_TARGET`                             | No          | Solo desarrollo: destino del proxy `/proxy/users` (por defecto `127.0.0.1:8000`). |

## Scripts

| Script                                         | Qué hace                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                                  | Servidor de desarrollo con el proxy hacia el servicio de usuarios.      |
| `npm run build` y `npm run preview`            | Compilación de producción y su vista previa local.                      |
| `npm run typecheck`                            | TypeScript estricto (`tsc -b`).                                         |
| `npm run lint`                                 | ESLint sin advertencias: tipos, accesibilidad y límites de capas.       |
| `npm run format` y `npm run format:check`      | Prettier (escribe o solo comprueba).                                    |
| `npm run test`, `test:watch` y `test:coverage` | Vitest; la cobertura exige un 80 % de líneas en las capas lógicas.      |
| `npm run test:e2e`                             | Playwright; solo corre con cuentas de prueba (ver más abajo).           |
| `npm run size`                                 | Comprueba que el JS de la ruta de entrada pese como máximo 300 KB gzip. |

## Estructura

```text
src/
  app/        providers, enrutador, layouts, tema, configuración y navegación
  features/   una carpeta por capacidad; cada una expone solo su index.ts
    auth/     acceso, sesión, permisos, inactividad y cierre de sesión
    home/     página principal
    profile/  perfil del operador
    users/    usuarios y roles de sistema: listado, búsqueda, detalle, formularios y acciones
  shared/     cliente HTTP, mensajes en español, utilidades y UI genérica
  test/       infraestructura de pruebas (MSW, doble de Auth0, simulador del servicio de usuarios, fábricas)
e2e/          pruebas de punta a punta con Playwright
scripts/      utilidades de compilación y de lint
specs/        especificaciones por feature (Spec Kit)
```

Las dependencias fluyen `app → features → shared`, y una feature solo importa a otra por su `index.ts`; ESLint lo hace cumplir.

## Pruebas

- **Unitarias y de integración** (Vitest, Testing Library, MSW): el servicio de usuarios se simula a nivel de red y Auth0 con un doble centralizado, nunca con mocks del cliente HTTP. Incluyen pruebas de accesibilidad con axe.
- **De punta a punta** (`e2e/`): necesitan un entorno de Auth0 de pruebas y se omiten si faltan las variables `E2E_AUTH0_USER_A1` a `A9` y `E2E_AUTH0_PASSWORD_A1` a `A9` (las cuentas del quickstart). Instala el navegador una vez con `npx playwright install chromium`.
  - Las lecturas de la sección de usuarios (`e2e/users.spec.ts`) solo necesitan la cuenta A1 y los usuarios de prueba del quickstart de la feature 002.
  - El recorrido que **crea** un usuario (crear, agregar y quitar un role, bloquear, desbloquear, eliminar y reactivar) además exige `E2E_ALLOW_USER_CREATION=true`, `E2E_NEW_USER_EMAIL_DOMAIN` (dominio de los correos desechables, `qa+002-<marca de tiempo>@<dominio>`) y `E2E_NEW_USER_PASSWORD` (la contraseña inicial de esos usuarios); sin ellas se omite, porque cada ejecución deja una cuenta real en Auth0.
  - Vitest limita los procesos de trabajo a 4 (`maxWorkers` en `vite.config.ts`): cada uno carga un jsdom con MUI y, con uno por procesador, un portátil con poca memoria los ve caer (`exit code 134`).

### Línea base de tamaño

JS de la ruta de entrada tras la feature 002: **273,3 KB gzip** (límite de la constitución: 300 KB; fue 264,8 KB tras la 001), medido el 2026-10-18 con `npm run build && npm run size`. Las secciones nuevas deben cargarse por ruta con `React.lazy` para no consumir ese margen: la tabla de `/users` (Data Grid) es un fragmento aparte, y `npm run size` también falla si algún marcador del Data Grid aparece en la ruta de entrada o si esa comprobación quedó obsoleta.

## Despliegue

- Servir la aplicación y consumir las APIs por **HTTPS**.
- Servir `index.html` con `Cache-Control: no-store` y una Content Security Policy restrictiva. Punto de partida (sustituye los dominios):

  ```text
  default-src 'self'; script-src 'self'; style-src 'self' 'nonce-<NONCE>';
  connect-src 'self' https://<dominio-de-auth0> https://<origen-de-las-apis>;
  frame-src https://<dominio-de-auth0>; worker-src blob:; img-src 'self' data:;
  object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  ```

  - `connect-src` y `frame-src` permiten a Auth0 (el SDK renueva el token con una petición o, de respaldo, con un iframe); `worker-src blob:` es necesario porque el SDK guarda el _refresh token_ en un Web Worker creado desde un _blob_. Quita de `connect-src` los orígenes de las APIs si las sirve el mismo origen mediante proxy.
  - MUI (Emotion) crea elementos `<style>` en tiempo de ejecución. Para no usar `'unsafe-inline'`, el servidor debe generar un _nonce_ distinto en cada respuesta, enviarlo en la cabecera y escribirlo en `<meta property="csp-nonce" content="">` de `index.html`; la aplicación lo copia a cada `<style>` (`src/app/providers/styleCache.ts`). Si el hosting es estático y no puede generarlo, usa `style-src 'self' 'unsafe-inline'`.

- Las APIs deben estar en el mismo origen (proxy inverso) o permitir CORS para el origen de la aplicación, incluida la cabecera `Authorization`.
- Registrar en Auth0 las URL de callback (`/callback`), de cierre de sesión (`/access` y `/access/idle`) y los orígenes web de cada entorno.

## Documentación del proyecto

- [Constitución](.specify/memory/constitution.md): principios y puertas de calidad que rigen el desarrollo.
- [Feature 001: acceso, sesión y perfil](specs/001-auth-session-profile/spec.md), con su [plan](specs/001-auth-session-profile/plan.md), [tareas](specs/001-auth-session-profile/tasks.md) y [guía de validación](specs/001-auth-session-profile/quickstart.md).
- [Feature 002: administración de usuarios y roles de sistema](specs/002-manage-users/spec.md), con su [plan](specs/002-manage-users/plan.md), [tareas](specs/002-manage-users/tasks.md) y [guía de validación](specs/002-manage-users/quickstart.md).
- El desarrollo sigue Spec Kit (`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`); los commits siguen Conventional Commits en inglés.
