# MailySoft Backoffice

Backoffice de MailySoft: una aplicación de una sola página (React) con la que el equipo de la plataforma administrará usuarios y sus roles de sistema, suscripciones y clínicas. Consume las APIs REST de la plataforma y se identifica con Auth0.

**Estado**: están implementadas la feature `001-auth-session-profile` (acceso, sesión y perfil), la `002-manage-users` (administración de usuarios y de sus roles de sistema), la `003-manage-subscription-types` (administración de suscripciones), la `005-postman-token-tool` (herramienta temporal Token para Postman), la `006-system-role-access` (acceso solo con rol de sistema), la `007-dashboard` (el Panel) y la `016-health-dashboard` (Salud de servicios). Las clínicas llegan con una feature siguiente.

## Qué hace hoy

- **Acceso** con Auth0 (flujo de código con PKCE, tokens solo en memoria). Solo entra quien está registrado en la plataforma de usuarios, tiene el estatus activo y al menos un rol activo de **tipo Sistema** (el tipo, no el nombre, decide: feature 006); el resto ve la página «Sin acceso» (`/access-denied`), con el correo de su cuenta y la opción de cerrar sesión.
- **Permisos** `recurso:acción` (`users`, `subscriptions`, `tenants` y `health` con `read`, `write`, `update` y `delete`; `token` con `read`): el acceso se vuelve a comprobar cada 5 minutos y al volver a la pestaña, y la navegación solo ofrece las secciones que la persona puede leer.
- **Cierre de sesión** completo (también en Auth0), sincronizado entre pestañas y sin datos al pulsar Atrás.
- **Inactividad**: aviso a los 14 minutos y cierre a los 15; al volver a identificarse se regresa a la pantalla anterior. También se maneja la sesión vencida.
- **Perfil** de solo lectura con los datos del usuario de la plataforma.
- **Usuarios** (sección `/users`): listado paginado de los usuarios activos con detalle, búsqueda por correo (también encuentra bloqueados y eliminados), alta con sus roles, modificación de nombre y apellidos, agregar y quitar roles, bloquear y desbloquear, y eliminar y reactivar. Cada acción que cambia quién puede entrar o qué puede hacer una persona pide confirmación y nombra al usuario; lo que se ofrece depende de los permisos de quien opera y del estatus del usuario, y nadie puede bloquear, eliminar ni cambiar los roles de su propio usuario.
- **Suscripciones** (sección `/subscriptions`): los planes que MailySoft ofrece a las clínicas, con dos pestañas: **Listado**, paginado con orden fijo (primero las Activas y después las Inactivas y Bloqueadas, cada grupo por precio mensual y, a igualdad, por nombre), con estatus y número de clínicas («No disponible» si la plataforma no puede contarlas); y **Comparativo**, una matriz de los planes vigentes lado a lado con un selector Mensual/Anual, sin pedir el catálogo de nuevo al cambiar de pestaña o de precio. Detalle y formulario compartido de alta y modificación con precio mensual y anual (con el ahorro del anual cuando aplica), días de prueba, autoconsumo en el portal de MailySoft, los módulos de clínica incluidos (de un catálogo fijo de nueve, con sus dependencias: marcar uno arrastra su requisito y desmarcar el requisito desmarca sus dependientes), los cuatro límites de la clínica (consultorios, doctores, asistentes y pacientes nuevos al año) y otras funcionalidades (hasta 20 elementos), con una vista previa en vivo de cómo lo verá la clínica; cambio de estatus entre Activa, Inactiva y Bloqueada; y eliminación, solo sin clínicas asignadas. Inactivar, bloquear y eliminar piden confirmación y nombran la suscripción, y cada acción se ofrece solo a quien tiene su permiso (`subscriptions:read`, `write`, `update` y `delete`).
- **Salud de servicios** (sección `/health`, con `health:read`): el estado de cada componente de Maily según el agregador de maily-system-api (`GET /api/v1/health`), con el estado general y cuántos están operativos, tipo, estado con icono y texto, latencia, última comprobación, versión, commit y fecha de build («No disponible» si faltan), el detalle de sus chequeos y los avisos de la base de datos detenida por horario (con cuándo vuelve) y del registro no disponible. Se actualiza sola cada `VITE_HEALTH_REFRESH_SECONDS` desde que terminó la consulta anterior, solo con la pestaña visible, con «Actualizado hace …» y «Actualizar». Si el agregador no responde, muestra «Estado de la plataforma» (`GET /health/status`, sin credencial) y, si eso también falla, la **comprobación directa** desde el navegador de `/health/live` y `/health/ready` de maily-system-api, mailySoft-usuarios y los servicios de `VITE_HEALTH_DIRECT_SERVICES`. Al final, el bloque «Backoffice» con la versión, el commit y la fecha de este build. La pantalla «No se pudo comprobar el acceso» muestra las mismas dos secciones.
- **Componentes monitoreados** (`/health/components`): el registro de componentes de maily-system-api, paginado en el navegador, con detalle, alta (un microservicio con las rutas del contrato v1 propuestas o un frontend con su ruta de salud), modificación (sin cambiar código ni tipo) y eliminación con confirmación, cada acción con su permiso (`health:write`, `health:update` y `health:delete`); los cambios se ven en «Salud de servicios» sin desplegar nada.
- **Token** (herramienta temporal, `/tools/postman-token`): genera un access token nuevo de Auth0 para usarlo en Postman. Al abrirla no muestra ningún token; «Generar» lo obtiene oculto, con «Mostrar», «Ocultar» y «Copiar», su fecha y hora de expiración y si sigue vigente, y el botón pasa a «Refrescar». La ve solo quien tiene el permiso `token:read`, que se asigna o se quita en la API de usuarios (solo a `Administrator` y `Developer`): no depende del entorno ni de ninguna variable de configuración.
- Interfaz en español, accesible (WCAG 2.1 AA) y adaptable de 1024 px a 320 px.

## Requisitos

| Requisito            | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js y npm        | Node 24 LTS (ver `.nvmrc`) y npm 11.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Auth0                | Una aplicación _Single Page Application_ y una API, configuradas como indica [auth0-configuration.md](specs/001-auth-session-profile/contracts/auth0-configuration.md). La aplicación debe estar **autorizada para acceder a la API** (_User Access_ de la API).                                                                                                                                                                                          |
| Servicio de usuarios | Repositorio `mailySoft-usuarios`, con la operación `GET /api/v1/authorization/me` (ya disponible en el servicio, su spec 009; la [solicitud](specs/001-auth-session-profile/contracts/users-service-me-request.md) que la originó queda como referencia).                                                                                                                                                                                                 |
| API de suscripciones | Repositorio `maily-system-api` (MailySoft System API). Su puerto documentado es el 8010 (en desarrollo, el proxy `/proxy/subscriptions` lo apunta ahí, o a `SUBSCRIPTIONS_API_PROXY_TARGET`), habilita CORS solo para los orígenes de `CORS_ALLOWED_ORIGINS` y pide los permisos al servicio de usuarios en cada petición. Para eliminar y ver el número de clínicas usa la API de clínicas; en desarrollo, la simulación que trae el propio repositorio. |
| Gestión de Auth0     | Para la feature 002, el servicio de usuarios necesita su aplicación _Machine to Machine_ autorizada para la Management API con **solo** `read:users`, `create:users`, `update:users` y `delete:users` (este último únicamente para deshacer un alta fallida: sin él quedaría una cuenta huérfana en Auth0): crear, bloquear, desbloquear, eliminar y reactivar llaman a Auth0 a través de ella.                                                           |

## Puesta en marcha

```powershell
npm ci
Copy-Item .env.example .env.local   # completa el dominio, el client id y el audience de Auth0
npm run dev                         # http://localhost:5173 (puerto fijo: las URL de Auth0 dependen de él)
```

La guía completa para levantar el servicio de usuarios, cargar cuentas de prueba y validar la feature está en [quickstart.md](specs/001-auth-session-profile/quickstart.md); la de la administración de usuarios, en [quickstart.md](specs/002-manage-users/quickstart.md); la de las suscripciones (la API, los permisos, el catálogo de prueba y la simulación de clínicas), en [quickstart.md](specs/003-manage-subscription-types/quickstart.md); la de la herramienta Token, en [quickstart.md](specs/005-postman-token-tool/quickstart.md); la del acceso por tipo de rol y la página «Sin acceso», en [quickstart.md](specs/006-system-role-access/quickstart.md); la de «Salud de servicios» (los servicios, los permisos `health:*`, las variables y la verificación de CORS), en [quickstart.md](specs/016-health-dashboard/quickstart.md).

> **Crear un usuario desde el Backoffice crea una cuenta real en Auth0.** Para probar usa correos desechables que controles; eliminar un usuario desde el Backoffice deja su cuenta bloqueada y marcada en Auth0, no la borra.

Dependencias que añade la feature 002 (versiones exactas): `@mui/x-data-grid` (la tabla del listado, que se carga solo al entrar en `/users`), `react-hook-form` y `@hookform/resolvers` (los formularios, validados con los esquemas de Zod).

### Variables de entorno

Todas son públicas (`VITE_*`, nunca llevan secretos), se validan con Zod al arrancar y, si alguna es inválida, la aplicación muestra qué variable corregir. Los archivos `.env*` no se versionan; el modelo es [.env.example](.env.example). El detalle de cada regla está en [environment.md](specs/001-auth-session-profile/contracts/environment.md).

| Variable                            | Obligatoria | Uso                                                                                                                                                                                     |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_AUTH0_DOMAIN`                 | Sí          | Dominio del tenant de Auth0, sin esquema.                                                                                                                                               |
| `VITE_AUTH0_CLIENT_ID`              | Sí          | Client id de la aplicación SPA.                                                                                                                                                         |
| `VITE_AUTH0_AUDIENCE`               | Sí          | Identificador de la API de Auth0.                                                                                                                                                       |
| `VITE_USERS_API_URL`                | Sí          | Base del servicio de usuarios: `/proxy/users` en desarrollo o una URL `https`.                                                                                                          |
| `VITE_SUBSCRIPTIONS_API_URL`        | Sí          | Base de la API de suscripciones (feature 003): `/proxy/subscriptions` en desarrollo o una URL `https`.                                                                                  |
| `VITE_DASHBOARD_REFRESH_MINUTES`    | No          | Minutos entre actualizaciones del Panel (1 a 60; 5 por defecto). Se fija al compilar: cambiarla exige volver a compilar y desplegar.                                                    |
| `VITE_CLINICS_API_URL`              | No          | Base de la API de clínicas (feature 004).                                                                                                                                               |
| `VITE_MAILYSOFT_APP_URL`            | No          | URL de la aplicación de MailySoft para clínicas (feature 006). Sin ella, la página «Sin acceso» no muestra el enlace «Ir a MailySoft».                                                  |
| `VITE_HEALTH_REFRESH_SECONDS`       | No          | Segundos entre actualizaciones de «Salud de servicios» (10 a 300; 30 por defecto, feature 016). Se fija al compilar.                                                                    |
| `VITE_HEALTH_DIRECT_SERVICES`       | No          | Lista JSON de hasta 20 `{ code, name, url }` que la comprobación directa consulta además de maily-system-api y mailySoft-usuarios (feature 016; `[]` por defecto). Se fija al compilar. |
| `APP_COMMIT_SHA` y `APP_BUILD_DATE` | No          | Al compilar (las lee `vite.config.ts`): el commit y la fecha ISO 8601 del build que muestra el bloque «Backoffice»; sin ellas se ve «No disponible». La versión sale de `package.json`. |
| `USERS_API_PROXY_TARGET`            | No          | Solo desarrollo: destino del proxy `/proxy/users` (por defecto `127.0.0.1:8000`).                                                                                                       |
| `SUBSCRIPTIONS_API_PROXY_TARGET`    | No          | Solo desarrollo: destino del proxy `/proxy/subscriptions` (por defecto `127.0.0.1:8010`, el puerto que documenta la API).                                                               |
| `PATIENTS_API_PROXY_TARGET`         | No          | Solo desarrollo y opcional: si se define, el proxy `/proxy/patients` lleva a mailySoft-pacientes, para la comprobación directa sin su CORS.                                             |

## Scripts

| Script                                                                     | Qué hace                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                                              | Servidor de desarrollo con los proxies hacia el servicio de usuarios y la API de suscripciones.                           |
| `npm run build` y `npm run preview`                                        | Compilación de producción y su vista previa local.                                                                        |
| `npm run typecheck`                                                        | TypeScript estricto (`tsc -b`).                                                                                           |
| `npm run lint`                                                             | ESLint sin advertencias: tipos, accesibilidad y límites de capas.                                                         |
| `npm run format` y `npm run format:check`                                  | Prettier (escribe o solo comprueba).                                                                                      |
| `npm run test`, `test:watch` y `test:coverage`                             | Vitest; la cobertura exige un 80 % de líneas en las capas lógicas.                                                        |
| `npm run test:e2e`                                                         | Playwright; solo corre con cuentas de prueba (ver más abajo).                                                             |
| `npm run size`                                                             | Comprueba que el JS de la ruta de entrada pese como máximo 320 KB gzip.                                                   |
| `npm run check:health-cors -- --origin <origen> --status <base> <base>...` | Comprueba que `/health/live`, `/health/ready` y `/health/status` permitan el origen del Backoffice (CORS) en un ambiente. |

## Estructura

```text
src/
  app/        providers, enrutador, layouts, tema, configuración y navegación
  features/   una carpeta por capacidad; cada una expone solo su index.ts
    auth/     acceso, sesión, permisos, inactividad y cierre de sesión
    health/   salud de servicios: página, registro de componentes, estado público y comprobación directa
    home/     página principal
    postman-token/  herramienta Token: token de acceso para Postman
    profile/  perfil del operador
    subscriptions/  suscripciones: listado con orden fijo, detalle, formulario, estatus y eliminación
    users/    usuarios y roles de sistema: listado, búsqueda, detalle, formularios y acciones
  shared/     cliente HTTP, mensajes en español, utilidades y UI genérica
  test/       infraestructura de pruebas (MSW, doble de Auth0, simuladores del servicio de usuarios, de la API de suscripciones y de la salud de la plataforma, fábricas)
e2e/          pruebas de punta a punta con Playwright
scripts/      utilidades de compilación y de lint
specs/        especificaciones por feature (Spec Kit)
```

Las dependencias fluyen `app → features → shared`, y una feature solo importa a otra por su `index.ts`; ESLint lo hace cumplir.

## Pruebas

- **Unitarias y de integración** (Vitest, Testing Library, MSW): el servicio de usuarios y la API de suscripciones se simulan a nivel de red, con sus datos y sus reglas (la API de suscripciones toma los permisos del simulador de usuarios, como la real), y Auth0 con un doble centralizado, nunca con mocks del cliente HTTP. Incluyen pruebas de accesibilidad con axe.
- **De punta a punta** (`e2e/`): necesitan un entorno de Auth0 de pruebas y se omiten si faltan las variables `E2E_AUTH0_USER_A1` a `A9` y `E2E_AUTH0_PASSWORD_A1` a `A9` (las cuentas del quickstart). Instala el navegador una vez con `npx playwright install chromium`.
  - Las lecturas de la sección de usuarios (`e2e/users.spec.ts`) solo necesitan la cuenta A1 y los usuarios de prueba del quickstart de la feature 002.
  - El recorrido que **crea** un usuario (crear, agregar y quitar un role, bloquear, desbloquear, eliminar y reactivar) además exige `E2E_ALLOW_USER_CREATION=true`, `E2E_NEW_USER_EMAIL_DOMAIN` (dominio de los correos desechables, `qa+002-<marca de tiempo>@<dominio>`) y `E2E_NEW_USER_PASSWORD` (la contraseña inicial de esos usuarios); sin ellas se omite, porque cada ejecución deja una cuenta real en Auth0.
  - Las lecturas de la sección de suscripciones (`e2e/subscriptions.spec.ts`) necesitan la cuenta A1, los permisos `subscriptions:*` y el catálogo de prueba del quickstart de la feature 003. El recorrido que **modifica** el catálogo (crear «QA 003 <marca de tiempo>», editarla, cambiar su estatus y eliminarla) además exige `E2E_ALLOW_SUBSCRIPTION_WRITES=true` y la simulación de clínicas en marcha, para poder eliminar lo que crea.
  - La herramienta Token (`e2e/token.spec.ts`) necesita la cuenta A1 y `token:read` asignado a `Administrator`, y la A2 para comprobar que quien no lo tiene no ve la opción (guía en [quickstart.md](specs/005-postman-token-tool/quickstart.md)).
  - «Salud de servicios» (`e2e/health.spec.ts`) necesita la cuenta A1 con `health:read`, `health:write`, `health:update` y `health:delete`, y maily-system-api con su 005 y mailySoft-usuarios con su 016 desplegados; registra, edita, deshabilita y elimina un componente «QA 016 <marca de tiempo>» propio (guía en [quickstart.md](specs/016-health-dashboard/quickstart.md)). En las pruebas unitarias, el agregador, el registro y el estado público se simulan con `src/test/handlers/healthMonitoring/` y las rutas de salud de los servicios con `src/test/handlers/healthProbes/`.
  - Vitest limita los procesos de trabajo a 4 (`maxWorkers` en `vite.config.ts`): cada uno carga un jsdom con MUI y, con uno por procesador, un portátil con poca memoria los ve caer (`exit code 134`).

### Línea base de tamaño

JS de la ruta de entrada tras la feature 016: **306,6 KB gzip** de 320, medido el 2026-10-25 con `npm run build && npm run size` (la 016 suma 6,9 KB a la entrada; su página, su registro y sus secciones de respaldo son fragmentos aparte que suman 18,3 KB, y `npm run size` falla si las rutas de su capa de API aparecen en la entrada). Tras la feature 014: **299,7 KB gzip** (306 850 bytes; el límite de la constitución era de 300 KB, con 350 bytes de margen, y la 1.7.0 lo subió a 320 KB con esta medición para dar cabida a la feature 016), medido el 2026-10-24 con `npm run build && npm run size`. Fue 361,5 KB mientras la pantalla de Roles y permisos se exportaba de forma estática, 298,1 KB tras la 013, 276,8 KB tras la 003, 274,3 KB tras la 005, 273,6 KB tras la 002 y 264,8 KB tras la 001. Las secciones nuevas deben cargarse por ruta con `React.lazy` para no consumir ese margen: la tabla de `/users` y de `/subscriptions` (Data Grid), las pantallas de `/modules` y de `/roles` y la herramienta Token (5,3 KB sin comprimir) son fragmentos aparte, y `npm run size` también falla si algún marcador del Data Grid o de la herramienta aparece en la ruta de entrada o si esas comprobaciones quedaron obsoletas.

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
- **Salud de servicios** (feature 016):
  - maily-system-api debe permitir CORS para el origen del Backoffice, sin credenciales, también en `/health/status`, `/health/live` y `/health/ready`; mailySoft-usuarios y cada servicio de `VITE_HEALTH_DIRECT_SERVICES`, en `/health/live` y `/health/ready`. Un CORS mal configurado hace ver «No responde» un servicio en marcha, sin otro aviso: compruébalo en cada ambiente con `npm run check:health-cors`, antes de darlo por listo y cada vez que cambien los dominios.
  - Agrega a `connect-src` cada origen absoluto de `VITE_HEALTH_DIRECT_SERVICES`, salvo que sea una ruta del mismo origen. Un intermediario del mismo origen debe reenviar también esas rutas de salud.
  - El servidor debe devolver `index.html` también en `/health` y `/health/components…` (el _fallback_ de la SPA).
  - Inyecta el commit y la fecha al compilar, por ejemplo en Git Bash o en el pipeline: `APP_COMMIT_SHA=$(git rev-parse HEAD) APP_BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) npm run build`.
- Registrar en Auth0 las URL de callback (`/callback`), de cierre de sesión (`/access` y `/access/idle`) y los orígenes web de cada entorno.

## Documentación del proyecto

- [Constitución](.specify/memory/constitution.md): principios y puertas de calidad que rigen el desarrollo.
- [Feature 001: acceso, sesión y perfil](specs/001-auth-session-profile/spec.md), con su [plan](specs/001-auth-session-profile/plan.md), [tareas](specs/001-auth-session-profile/tasks.md) y [guía de validación](specs/001-auth-session-profile/quickstart.md).
- [Feature 002: administración de usuarios y roles de sistema](specs/002-manage-users/spec.md), con su [plan](specs/002-manage-users/plan.md), [tareas](specs/002-manage-users/tasks.md) y [guía de validación](specs/002-manage-users/quickstart.md).
- [Feature 003: administración de suscripciones](specs/003-manage-subscription-types/spec.md), con su [plan](specs/003-manage-subscription-types/plan.md), [tareas](specs/003-manage-subscription-types/tasks.md) y [guía de validación](specs/003-manage-subscription-types/quickstart.md).
- [Feature 005: herramienta Token para Postman](specs/005-postman-token-tool/spec.md), con su [plan](specs/005-postman-token-tool/plan.md), [tareas](specs/005-postman-token-tool/tasks.md) y [guía de validación](specs/005-postman-token-tool/quickstart.md).
- [Feature 006: acceso al Backoffice solo con rol de sistema](specs/006-system-role-access/spec.md), con su [plan](specs/006-system-role-access/plan.md), [tareas](specs/006-system-role-access/tasks.md) y [guía de validación](specs/006-system-role-access/quickstart.md).
- [Feature 007: el Panel](specs/007-dashboard/spec.md), con su [plan](specs/007-dashboard/plan.md), [tareas](specs/007-dashboard/tasks.md) y [guía de validación](specs/007-dashboard/quickstart.md).
- [Feature 016: Salud de servicios](specs/016-health-dashboard/spec.md), con su [plan](specs/016-health-dashboard/plan.md), [tareas](specs/016-health-dashboard/tasks.md) y [guía de validación](specs/016-health-dashboard/quickstart.md).
- El desarrollo sigue Spec Kit (`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`); los commits siguen Conventional Commits en inglés.
