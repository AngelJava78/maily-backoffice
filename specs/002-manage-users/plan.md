# Implementation Plan: Administración de Usuarios y Roles de Sistema

**Branch**: `002-manage-users` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-manage-users/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Primera sección de administración del Backoffice y patrón que seguirán las demás: el operador consulta los usuarios de MailySoft en un listado paginado (solo activos), los encuentra por correo exacto con cualquier estatus, abre su detalle (datos, estatus y roles), crea usuarios con contraseña inicial y al menos un role, corrige su nombre y apellidos, agrega y quita roles uno por uno, y los bloquea, desbloquea, elimina y reactiva con confirmación. Todo se hace contra el servicio de usuarios (que además mantiene la cuenta del usuario en Auth0), con permisos por acción y autoprotección en la interfaz.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Dependencias y verificación previa**: MUI X Data Grid 9.15.0, React Hook Form 7.90.0 y `@hookform/resolvers` 5.9.2, comprobadas con una prueba de concepto fuera del repositorio (render en jsdom, axe, tipos estrictos, peso del chunk): D1.
2. **Estructura sin ciclos**: `features/users` no importa `auth`; las capacidades se calculan con `can()` en `features/auth/policy` y las entrega la capa `app` mediante adaptadores finos en las rutas (D2, D3).
3. **Rutas y estado de la URL**: `/users`, `/users/new`, `/users/:userId` y `/users/:userId/edit`; página, tamaño y búsqueda en los parámetros de la URL, validados con Zod; regreso al listado en la misma página (D5, [contracts/app-routes.md](contracts/app-routes.md)).
4. **Listado y búsqueda**: Data Grid con paginación en servidor y localización por el tema; búsqueda exacta por correo (la única forma de llegar a un usuario bloqueado o eliminado) con el `404` como resultado vacío (D6, D7).
5. **Servidor y formularios**: claves de TanStack Query por factorías con la matriz de invalidación del [modelo de datos](data-model.md); formularios con React Hook Form y Zod, errores del servidor por campo y contraseña que nunca se conserva fuera del formulario (D8, D9, D13).
6. **Operaciones compuestas y errores**: alta con roles en dos pasos con orden, fallos parciales y sin compensación definidos; confirmaciones que nombran al usuario; clasificación uniforme de errores del servicio ([contracts/users-service.md](contracts/users-service.md); D10 a D12).
7. **Calidad**: simulador con estado del servicio de usuarios para pruebas, lógica pura con prueba primero, componentes e integración por historia, axe, E2E preparado y presupuesto de bundle con el Data Grid fuera de la ruta de entrada (D14 a D16).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 LTS: sin cambios respecto a la 001.

**Primary Dependencies**: las de la 001 (Vite 8.3.4, react-router 8.4.0, @tanstack/react-query 5.104.4, @auth0/auth0-react 2.28.2, @mui/material y @mui/icons-material 9.5.0, zod 4.6.7) más **@mui/x-data-grid 9.15.0**, **react-hook-form 7.90.0** y **@hookform/resolvers 5.9.2**, todas MIT y verificadas el 2026-10-18 (D1). La de Data Grid se instala con versión explícita porque el tag `latest` sigue en 8.x.

**Storage**: N/A. Sin persistencia propia ni almacenamiento del navegador: el estado de la lista vive en la URL y el del servidor en la caché de TanStack Query. La contraseña inicial solo existe en el estado del formulario y en la solicitud (D13).

**Testing**: la infraestructura de la 001 (Vitest 5.0.5 con jsdom, Testing Library, user-event, MSW 3.0.3, vitest-axe, Playwright 1.64.1) más un **simulador con estado del servicio de usuarios** (D14). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, diseñada desde 1024 px y reacomodable hasta 320 px sin desplazamiento horizontal de la página (la tabla se desplaza dentro de su recuadro): sin cambios.

**Project Type**: Aplicación web de solo frontend, proyecto único en la raíz del repositorio: sin cambios.

**Performance Goals**: primera página del listado en menos de 2 s en el 95 % de las consultas (SC-002), con una sola solicitud y el Data Grid en un chunk perezoso; búsqueda por correo resuelta en menos de 30 s (SC-007); alta con roles en menos de 2 minutos de trabajo del operador (SC-001); JS de la ruta de entrada de 300 KB gzip o menos (hoy 264,8 KB), sin Data Grid en ella.

**Constraints**: el servicio exige token y permiso en cada operación; el listado solo trae usuarios activos y no incluye roles; los roles de un usuario no activo no se pueden consultar; no hay control de concurrencia ni clave de idempotencia; crear, bloquear, desbloquear, eliminar y reactivar llaman a Auth0 y pueden tardar hasta 10 s (límite de 30 s del cliente); el correo no se edita; mutaciones sin reintentos automáticos y con la acción deshabilitada mientras están pendientes; contraseñas y datos personales fuera de registros y de cualquier almacenamiento; interfaz en español, accesible (WCAG 2.1 AA) y fluida de 1024 a 320 px.

**Scale/Scope**: herramienta interna de decenas de operadores sobre una base de hasta 100 000 usuarios (el diseño del servicio); 4 rutas, 6 diálogos (bloquear, desbloquear, eliminar, reactivar, agregar role y quitar role) y 13 operaciones del servicio consumidas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.0.0. "Antes" es el estado al iniciar la investigación (⚠️ = dependía de un dato por verificar); "Después", tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; efectos solo con sistemas externos | Solo funciones y Hooks; efectos limitados a la normalización de la URL (sistema externo) y al foco; todo lo demás se deriva en el render | ✅ | ✅ |
| I. Estructura por features con límites en ESLint | `users` crece con `api/components/hooks/policy/schemas` y no importa `auth` (D2); `app` compone con adaptadores; el ciclo `auth ↔ users` que el lint permitiría se evita a propósito | ⚠️ | ✅ |
| I. Sin abstracciones ni memoización especulativas; componentes ≤ 250 líneas | `ConfirmDialog` se usa en cinco acciones; sin stores ni Context nuevos; el listado, el detalle, el formulario y cada diálogo son componentes aparte | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras (respuestas, parámetros de URL, estado de navegación, formularios) | Esquemas Zod para `UserPage`, `Role`, asignaciones, `UsersLocation`, `UserDetailLocationState` y los formularios; DTO a dominio en `api`; sin `as`: el mapa de campos de error es un `Map` ([data-model.md](data-model.md)) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; factorías de claves; mutaciones que invalidan | `userKeys` y `roleKeys` con la matriz de invalidación; sin copias a Context ni `useState` (D2, D8) | ✅ | ✅ |
| III. Formularios con React Hook Form y Zod; errores de la API por campo | D9; compatibilidad de `zodResolver` con Zod 4 comprobada con tipos estrictos y pruebas | ⚠️ | ✅ |
| III. Estado navegable del listado en la URL | `page`, `page_size` y `email` en los parámetros, validados (D5) | ✅ | ✅ |
| III. Vaciar la caché al cerrar sesión; no persistirla | Ya implementado en la 001; la mutación del alta usa `gcTime: 0` para no retener la contraseña (D13) | ⚠️ | ✅ |
| IV. Cliente HTTP único; mutaciones sin reintentos y deshabilitadas mientras están pendientes | `createHttpClient` y `MUTATION_RETRY` de la 001; botones deshabilitados (FR-007) | ✅ | ✅ |
| IV. Listados con paginación y orden en servidor; sin descargar colecciones | `page` y `page_size` del servicio; orden fijo del servicio; el catálogo de roles (≤ 100) se devuelve completo por contrato | ✅ | ✅ |
| IV. Varias llamadas: el spec define orden, fallos parciales y compensación (DEBE); preferir una operación única (DEBERÍA) | Orden, fallos parciales y ausencia de compensación definidos en D10 y FR-023; el DEBERÍA se desvía por la aclaración 2 | ⚠️ | ✅ (Complexity Tracking) |
| IV. Contratos documentados; tipos derivados de OpenAPI (DEBERÍA) | [contracts/users-service.md](contracts/users-service.md); esquemas Zod a mano (D4) | ⚠️ | ✅ (Complexity Tracking) |
| IV. Errores uniformes (401, 403, 404, 409/422, red/5xx) sin mensajes crudos | `describeUserError` y textos propios; solo los mensajes de campo de un `422` se muestran, junto a su campo (D12) | ✅ | ✅ |
| IV. Fechas ISO 8601 con formato solo en presentación | `formatDateTime` con `Intl` (D17) | ✅ | ✅ |
| V. Autorización en un único módulo de políticas; no comparar roles ni permisos sueltos | `can()` y `getUserCapabilities` en `features/auth/policy`; `getAvailableActions` solo cruza estatus y capacidades; el `403` sigue manejándose (D3) | ✅ | ✅ |
| V. Sin datos personales ni contraseñas en logs; token solo a hosts configurados | La feature no registra operaciones; si lo hiciera, `logger` solo con código, estado y operación; la contraseña nunca sale del formulario ni de la solicitud (D12, D13) | ✅ | ✅ |
| VI. MUI y MUI X Data Grid (community) con theme central; localización en español | Data Grid 9.15.0 con la localización aplicada por el tema (D6) | ⚠️ | ✅ |
| VI. Estados de carga, vacío, error y éxito; mutaciones que notifican | Tabla de estados de [contracts/app-routes.md](contracts/app-routes.md) y avisos de éxito o error por acción | ✅ | ✅ |
| VI. Mismo patrón de listar, mostrar, crear, modificar y eliminar; confirmación que nombra el recurso | Listado paginado, detalle, formulario compartido y diálogo de confirmación (`ConfirmDialog`), incluidos los cambios de role | ✅ | ✅ |
| VI. WCAG 2.1 AA, textos en un único módulo, diseño adaptable | Pruebas con axe, foco gestionado, `aria-live` en la búsqueda; `messages.users` en `es.ts`; verificación a 1024 y 320 px (D16) | ⚠️ | ✅ |
| VII. Pruebas en el mismo PR; primero en lógica pura; MSW; doble de Auth0 | Simulador con estado y capas de D14 | ✅ | ✅ |
| VII. Cobertura de 80 % en las capas definidas; E2E cuando exista entorno | Los archivos nuevos siguen las carpetas que cuentan; `e2e/users.spec.ts` omitido sin `E2E_*` | ✅ | ✅ |
| Stack: dependencias mínimas, licencias permisivas, sin funciones de pago de MUI X | Solo las tres del «Stack obligatorio», todas MIT; solo funciones community (D1) | ✅ | ✅ |
| Configuración: variables `VITE_*` validadas | Sin variables nuevas: `VITE_USERS_API_URL` ya existe | ✅ | ✅ |
| Rendimiento: `React.lazy`, presupuesto de 300 KB, filas ≤ `page_size`, `logger` y boundaries | Pantallas perezosas desde el `index.ts` de `users` (que `auth` importa de forma estática); `npm run size` falla si la entrada contiene los marcadores del Data Grid (`data-rowindex`, `data-colindex`); `ErrorBoundary` por ruta (D2, D15) | ⚠️ | ✅ |
| Flujo: spec y plan antes del código; puertas de CI; idioma; rama de feature | Rama `002-manage-users`; documentación en español y código en inglés | ✅ | ✅ |

**Resultado**: sin violaciones sin justificar antes ni después del diseño. Dos desvíos de reglas con DEBERÍA, justificados en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-manage-users/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── app-routes.md
│   └── users-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que añade o cambia la 002; el resto de la estructura es la de la 001 ([../001-auth-session-profile/plan.md](../001-auth-session-profile/plan.md)).

```text
src/
├── app/
│   ├── navigation/sections.ts           # registra la sección Usuarios (id users, /users, recurso users)
│   ├── router/
│   │   ├── routes.tsx                   # rutas /users... dentro de la guarda, con RequirePermission
│   │   └── users/                       # adaptadores: UsersListRoute, UserDetailRoute, UserCreateRoute, UserEditRoute,
│   │                                    # y RequireCapability (redirige con aviso cuando falta una capacidad)
│   ├── layouts/useRouteAccessibility.ts # claves de título nuevas (users, userCreate, userDetail, userEdit)
│   └── theme/                           # theme.ts (+ localización del Data Grid) y themeAugmentation.d.ts
├── features/
│   ├── auth/policy/                     # permissions.ts (+ recurso roles), userCapabilities.ts
│   └── users/
│       ├── api/                         # usersApi, userRolesApi, rolesApi, assignRoles, createUserWithRoles,
│       │                                # userErrors (describeUserError)
│       ├── components/                  # UsersListPage, UsersGrid, UserSearchForm, UserSearchResult, UserDetailPage,
│       │                                # UserRolesPanel, UserStatusActions, AddRoleDialog, PendingRolesAlert, StatusChip,
│       │                                # UserForm, UserNameFields, PasswordField, RolesField, UserCreatePage, UserEditPage
│       ├── hooks/                       # userKeys, useUsersLocation, useUsersPage, useUserSearch, useUser, useUserRoles,
│       │                                # useRolesCatalog, useCreateUser, useAssignRoles, useUpdateUser,
│       │                                # useChangeUserStatus, useAddUserRole, useRemoveUserRole
│       ├── policy/                      # availableActions (estatus + capacidades + autoprotección)
│       ├── schemas/                     # user y userStatus (ya existen), userPage, role, userForm, usersLocation, userDetailState
│       └── index.ts                     # pantallas como componentes perezosos; solo lo ligero se reexporta de forma estática
├── shared/
│   ├── lib/formatDateTime.ts
│   ├── messages/es.ts                   # bloque users
│   └── ui/ConfirmDialog.tsx
└── test/
    ├── handlers/usersDirectory/         # simulador con estado del servicio de usuarios: model, authorize, behaviors,
    │                                    # seed, me y un archivo por grupo de operaciones (reads, create, ...)
    └── factories.ts                     # + userPageDto, variantes por estatus, catálogo de roles
scripts/check-entry-size.mjs             # + falla si el JS de la ruta de entrada contiene data-rowindex o data-colindex (Data Grid)
e2e/users.spec.ts                        # recorrido crítico (se omite sin variables E2E_*)
```

**Structure Decision**: se mantiene el proyecto único de la 001 y la regla `app → features → shared`. La feature `users` es autosuficiente (esquemas, API, hooks, pantallas y política de acciones) y no conoce a `auth`; la capa `app` es la única que las une, evaluando las capacidades con la política de `auth` y pasándolas a las pantallas como propiedades (D2). El catálogo de roles y las asociaciones usuario-rol viven en `users` porque nadie más los usa. Las pruebas van junto al código y el simulador del servicio, en `src/test/`.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001, FR-002 | `UsersListPage` y `UsersGrid` (paginación en servidor, tamaños 10/25/50, nombre, correo y fecha de alta) | Componentes; V1, V2 |
| FR-003 | Detalle y estado de navegación `listSearch` validado (D5) | Integración; V3 |
| FR-004 | Estados de [contracts/app-routes.md](contracts/app-routes.md) en listado, búsqueda y detalle | Componentes con MSW; V4 |
| FR-005, FR-006 | `UserForm` y esquema Zod del alta; `describeUserError` asigna los errores del servicio a su campo | Unitarias y componentes; V9, V10 |
| FR-007, SC-004 | Botones deshabilitados mientras la mutación está pendiente; sin reintentos automáticos | Componentes (doble clic); V11 |
| FR-008, FR-014 | `UserEditPage`; el `409` de estatus se informa y se vuelve a consultar; gana la última edición | Componentes e integración; V14, V18 |
| FR-009, FR-024 | `UserRolesPanel`, `AddRoleDialog` y `ConfirmDialog` que nombran al usuario y al role | Componentes; V15, V16 |
| FR-010, FR-020, FR-022, SC-003 | `UserStatusActions` y `useChangeUserStatus` con confirmación en las cuatro acciones; reactivar conserva datos y roles (lo hace el servicio) | Componentes e integración (una prueba recorre todas las acciones); V20, V22 |
| FR-011, FR-021, SC-006 | `describeUserError` y avisos; el usuario conserva su estatus si falla la cuenta de acceso | Unitarias e integración con el simulador; V10, V23 |
| FR-012 | `isSelf` en `getAvailableActions` y nota en el detalle propio | Unitarias y componentes; V17 |
| FR-013 | Matriz de invalidación de [data-model.md](data-model.md) | Integración |
| FR-015, FR-025 | `getUserCapabilities` con `can()` y adaptadores de `app`; la ruta sin permiso redirige con aviso | Unitarias (matriz de permisos) e integración; V6, V13, V24 |
| FR-016 | Textos en `messages.users`; `formatDateTime` con la zona horaria del operador | Unitarias; V25 |
| FR-017, FR-018, SC-007 | Listado solo de activos (servicio); `useUserSearch` con el `404` como resultado vacío y la búsqueda en la URL | Componentes e integración; V7, V8 |
| FR-019 | `StatusChip` y `getAvailableActions` por estatus | Unitarias y componentes; V19 |
| FR-023, SC-009 | `useCreateUser` (orden, continuar ante 4xx, detenerse ante infraestructura, sin compensación) y `PendingRolesAlert` | Hooks con MSW e integración; V12 |
| SC-001, SC-005 | Formularios y diálogos sin pasos innecesarios | Manual (V9, V15) |
| SC-002 | Una solicitud y un chunk perezoso; `keepPreviousData` | `npm run size`; medición manual (V26) |
| SC-008 | El detalle muestra siempre lo que devuelve el servicio (sin cambios optimistas) | Integración |
| FR-022 de la 001 | Diseño fluido; la tabla se desplaza en su recuadro | Playwright a 1024×768 y 320×640; V25 |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Alta con roles en dos pasos desde el frontend (crear el usuario y asignar cada role con llamadas aparte) en lugar de una operación única del backend (constitución IV: DEBERÍA preferirse una sola operación) | El servicio no ofrece una operación para crear un usuario con roles y la aclaración 2 de la spec decidió no esperarla: el alta exige al menos un role (FR-005) | Esperar a que el servicio la ofrezca: retrasa la feature y exige cambios en otro repositorio. Mitigación: orden, fallos parciales y ausencia de compensación definidos (D10, FR-023); la mutación no retiene la contraseña (`gcTime: 0`); pruebas de éxito, parcial y detención ante fallos de infraestructura. |
| Esquemas Zod escritos a mano en lugar de derivarlos del OpenAPI del servicio (constitución IV: DEBERÍAN derivarse) | Zod es la fuente única de cada entidad (constitución II); el OpenAPI vive en un repositorio privado ajeno y no estaría disponible en CI; son 13 operaciones con formas simples | Generar tipos de TypeScript: una segunda fuente de verdad junto a Zod. Generar esquemas Zod desde OpenAPI: una dependencia y un paso de generación que dependen de otro repositorio. Mitigación: validación en la frontera, simulador fiel al contrato y reevaluación con las APIs de clínicas y suscripciones (D4). |

## Notas de implementación

Decisiones tomadas al implementar que afinan lo planeado sin cambiar los requisitos, las medidas de tamaño y lo aprendido. Las tareas están en [tasks.md](tasks.md); los puntos de control manuales (T075, T106, T130, T142, T153) y la guía completa (T162) quedan para quien tenga Auth0, la consulta `me` y los datos de prueba.

### Resultado

- 138 archivos y 1682 pruebas (antes de la feature: 58 y 671); cobertura de líneas de las capas incluidas en `vite.config.ts`: 99,23 % (umbral: 80 %). `typecheck`, `lint` sin advertencias, `format:check`, `build` y `size` en verde. `npm audit --omit=dev`: 0 vulnerabilidades.
- Comprobaciones de seguridad (T160): sin `console.*` (solo comentarios en dos pruebas), `localStorage`, `dangerouslySetInnerHTML`, `any` ni aserciones `as` en `src/`; `sessionStorage` solo en `returnPathStorage.ts` fuera de las pruebas; `password` solo en el estado del formulario, el cuerpo de la solicitud y su mapeo de errores (nunca en `logger`, la URL, el estado de navegación ni las claves de consulta); `features/users` no importa `@/features/auth`.

### Tamaños medidos (T159)

| Medida | gzip |
|---|---|
| JS de la ruta de entrada (`npm run size`) | **273,6 KB** de 300 (264,8 KB tras la 001: +8,8 KB) |
| `UsersListPage` (Data Grid y tabla; solo se carga al entrar en `/users`) | 142,8 KB |
| `Autocomplete` (selector de roles) | 19,9 KB |
| `userKeys` (claves y hooks comunes de las pantallas de usuarios) | 19,4 KB |
| `userForm` (React Hook Form, su resolver y los esquemas del formulario) | 14,1 KB |
| `UserDetailPage` · `UserCreatePage` · `UserEditPage` | 4,8 KB · 2,8 KB · 1,6 KB |

La guarda se comprobó por mutación: importar `UsersListPage` de forma estática en `routes.tsx` hace fallar `npm run size` (462,0 KB; `data-rowindex` y `data-colindex` en la ruta de entrada) y al revertirlo vuelve a pasar. Las ramas de la guarda (limpio, fuga, marcadores obsoletos, solo la clave del tema y presupuesto excedido) se verificaron con carpetas `dist` sintéticas.

### Desviaciones del texto de las tareas

| Tareas | Qué se hizo | Por qué |
|---|---|---|
| T004 | El texto del pie del Data Grid es `paginationRowsPerPage` («Filas por página:») | La localización de la versión 9.15 no trae `MuiTablePagination`. |
| T012 | La prueba acepta `8:20` y `08:20` | Node 24 formatea la hora de Ciudad de México sin cero. |
| G1 | `test.env.TZ = 'UTC'` en `vite.config.ts` | Las fechas se muestran en la zona del navegador; así las pruebas pasan igual en el portátil (México) y en CI (UTC). |
| T028 | El mapa de campos de error es un `Map` | Con un objeto, un campo llamado `constructor` encontraría una función. |
| T014, T016 | `ConfirmDialog` tiene la propiedad `tone` (`default` o `danger`) | Es la «variante delicada» de D11; bloquear y eliminar usan `danger`. |
| T037, T038 | El simulador tiene archivos extra (`requestLog.ts`, `handle.ts`, `identity.ts`) y `failNext` admite `after` | Registro de solicitudes (con `aborted`) y orden fijo: quién pregunta, fallo inyectado, permiso y operación. |
| T084, T085, T100 | `useAssignRoles(userId)` con `mutate({ roles })`; `assignRoles` es genérica sobre `{ id, name }` | El reintento desde el estado de navegación no tiene el `Role` completo. |
| T111 a T113, T124, T133, T139 | Los hooks reciben el id al crearse (`useUpdateUser(userId)`, `useChangeUserStatus(userId)`…) y las variables llevan solo `{ values }`, `{ role }` o `{ action }` | Cada pantalla trabaja con un solo usuario; es el mismo patrón que `useAssignRoles`. |
| T115, T126 (U6) | `UserRolesPanel` recibe `userName`, `canAddRoles` y `canRemoveRoles`; no `actionsAllowed` | Lo decide una sola vez el detalle con `getAvailableActions`. |
| T134, T140 | `UserStatusActions` recibe `{ user, available }` y nombra al usuario con `getFullName` | El detalle ya calcula las acciones disponibles; el nombre completo es el que muestran el listado y el detalle (`getDisplayName` es el del encabezado). |
| T120, T148 | Textos extra: `roles.removeLabel` («Quitar», visible; el nombre accesible es `roles.remove(role)`) y `edit.inactive.backToList` (U2) | El botón por role necesita texto visible; la vista de edición inactiva ofrece también volver al listado. |
| T127 | Guardar una edición navega con `replace: true` | Atrás no vuelve a un formulario con valores viejos. |

Módulos añadidos que las tareas no nombran: `hooks/refreshUser.ts` (qué se invalida cuando el servicio dice que el usuario ya no es como la pantalla cree), `hooks/useNotifyUserError.ts` y `toNotification` en `api/userErrors.ts` (gravedad del aviso por tipo de error; `forbidden` no se repite porque ya lo avisa la aplicación), `hooks/useRoleActions.ts` (estado de los diálogos de roles), `app/pages/LazyNotFoundPage.ts` (una sola carga perezosa de «Página no encontrada» para que siga siendo un fragmento aparte) y `StatusCheck` en el modelo del simulador (el servicio comprueba el estatus, luego la cuenta de acceso y solo entonces cambia al usuario).

Configuración de pruebas: `maxWorkers: 4` (con un proceso por procesador, un portátil de 8 GB se quedó sin memoria y los procesos caían con `exit code 134` o `spawn UNKNOWN`), `testTimeout: 15 s` (los diálogos con selector tardan unos segundos cuando compiten varios procesos o la cobertura) y `networkMode: 'always'` en `createQueryClient` (sin red se ve un error en lugar de una espera infinita).

### Lo aprendido

**Data Grid (`@mui/x-data-grid@9.15.0`, fijada: la etiqueta `latest` es la 8.x).** La clase `MuiDataGrid-` no sirve para detectar que entró en la ruta de entrada, porque la compilación no la deja; los marcadores fiables son los atributos `data-rowindex` y `data-colindex`, y la guarda avisa si ya no aparecen en ningún fragmento. Con `paginationMode="server"` la página es base 1 fuera y base 0 dentro; el Data Grid no limita una página profunda mientras `rowCount` es desconocido, así que el listado calcula la página real y reemplaza la URL. La tabla se desplaza dentro de su recuadro y la página no desborda a 320 px.

**React Hook Form.** Se llama a `mutateAsync` dentro de `handleSubmit`: así `isSubmitting` cubre todo el guardado y pulsar «Guardar» varias veces envía una sola solicitud. Conserva el valor tal como se escribió (el recorte se hace al enviar). El formulario de edición se construye con el usuario ya cargado y no se reinicia, de modo que una nueva carga no pisa lo escrito. `FormEventHandler` está obsoleto en los tipos de React 19: se usa `SubmitEventHandler`.

**Cachés y diálogos.** Los hooks de cambio devuelven la promesa de `invalidateQueries` desde `onSettled`, `onSuccess` u `onError`: la mutación sigue pendiente hasta que la pantalla muestra lo real y el diálogo se cierra con los datos ya al día. Las funciones de `mutate(…, { onSuccess })` no se ejecutan si el componente se desmonta, así que el estado de los diálogos de roles vive en el panel (`useRoleActions`) y no en cada fila, que desaparece con su role. Un enlace que se encuentra mientras carga debe seguir siendo el mismo nodo cuando llegan los datos (la barra de acciones del detalle es el primer hijo en todos los estados), o un clic puede perderse. Si el botón que abrió un diálogo desaparece (quitar un role, eliminar), el foco pasa al encabezado de los roles o al botón principal que queda.

**Simulador y pruebas.** Un simulador con estado y reglas del contrato detectó más errores que los dobles por solicitud: el orden de las comprobaciones, el correo reservado de un usuario eliminado y la restauración de roles al reactivar salen del propio modelo. Con MSW 3 y Node 24, una solicitud abortada deja un instante en el que la segunda solicitud de la prueba siguiente puede escaparse a la red real; `setup.ts` cede un turno del bucle de eventos antes de reiniciar los manejadores. `userEvent` no puede pulsar un botón de MUI con `loading` (`pointer-events: none`): se usa `fireEvent`. Mientras un diálogo se desvanece, el resto de la página sigue oculto para los roles de accesibilidad: las pruebas esperan a que desaparezca antes de buscar enlaces.

### Revisión antes de subir

Con el commit local hecho y antes de subirlo, tres lectores independientes (API, caché y permisos; interfaz y accesibilidad; pruebas, simulador y herramientas) revisaron el diff y se comprobó cada hallazgo contra el código, contra el servicio real y, para lo que jsdom no ve (diseño, consultas de medios, colores calculados), en un navegador real (Chromium con Playwright a 1024, 599 y 320 px). No hubo fallos críticos; el contrato con el servicio coincidía. Se corrigió todo lo confirmado, cada punto con su prueba:

| Hallazgo | Qué se hizo |
|---|---|
| Cada navegación de la misma ruta (paginar, cambiar el tamaño, buscar, limpiar) llevaba el foco al `h1` (WCAG 2.4.3) | `useRouteAccessibility` mueve el foco solo si cambia la ruta, no su query string. El formulario de búsqueda ya no se reconstruye con cada búsqueda (su campo sigue a la dirección con `values`) y al limpiar la búsqueda el foco vuelve al campo. Una región `role="status"` que ya está en la página (`LiveStatus`) dice «Mostrando X a Y de Z usuarios.» y «Se encontró un usuario.» (WCAG 4.1.3) |
| «Filas por página» desaparecía por debajo de 600 px (medido: `display: none`), sin poder pedir 25 o 50 usuarios en un teléfono | Se mantiene visible y el pie de la tabla pasa a dos líneas; la página no desborda a 320 px |
| El borde de los campos tenía 1,74:1 sobre blanco (WCAG 1.4.11) | `FIELD_BORDER_COLOR` `#757575` (4,61:1) en el tema, con prueba |
| Un refresco fallido sustituía lo ya cargado por un bloque de error, y el formulario de edición perdía lo escrito | El error bloqueante solo sale si no hay datos; con datos se muestran, con un aviso no bloqueante y «Reintentar» en el detalle y los roles, y sin aviso en la edición, el alta y la búsqueda |
| «Reintentar asignación» fallaba en silencio | Explica el motivo con `describeUserError` (también la falta de permiso, que no pasa por el aviso global porque el fallo viene dentro de un resultado) y refresca lo que quedó viejo (el usuario, el catálogo o los roles). El aviso de roles pendientes se oculta si el usuario ya no está activo |
| Cancelar, o salir, mientras se guardaba llevaba luego a la persona al detalle | «Cancelar» se deshabilita mientras se guarda y la navegación va en la llamada (`onSuccess` de `mutateAsync`), que no se ejecuta si el formulario ya no está |
| Un alta podía quedar sin roles si el catálogo cambiaba con el formulario abierto | Se detecta, se podan los roles que quedan y se avisa; `createUserWithRoles` rechaza cero roles antes de enviar nada (FR-005) |
| Los avisos de resultado se escribían mientras un diálogo ocultaba la página a los lectores de pantalla | Se guardan (`useDeferredNotice`) y se muestran cuando el diálogo ha terminado de cerrarse (`onExited`) |
| Un diálogo que se cerraba aún aceptaba un clic, y si el botón que lo abrió desaparecía (quitar un role, eliminar) el foco se perdía salvo en un resultado correcto | La confirmación no hace nada si el diálogo ya se está cerrando; el foco va al encabezado de los roles o al botón principal con cualquier resultado (`focusIfLost`) |
| Un error general quedaba lejos de «Guardar» en pantallas estrechas | Recibe el foco |
| Esperar a que la pantalla se refresque podía dejar un diálogo ocupado hasta unos 90 s si una consulta se colgaba | Esa espera se acota a 10 s (`atMost`) |
| Al editar el propio nombre, el encabezado y el perfil seguían con el viejo hasta 5 minutos | El adaptador de ruta vuelve a pedir el acceso (`useRefreshOperatorAccess`) si lo editado es el propio operador |
| Los textos de los diálogos concordaban mal («Ana Pérez … esté bloqueado») | «El usuario {nombre} …» |
| Las direcciones con un id que no es un número se titulaban «Detalle del usuario» (WCAG 2.4.2) | El título es «Página no encontrada» |
| Simulador | Quitar un role que no está activo da `404 role_not_found`, como el servicio real. El servicio real acepta un `email` en el PATCH; el simulador lo rechaza a propósito porque la interfaz nunca lo envía |
| E2E | `getByText` exacto (coincidía también con el texto de ayuda de la búsqueda y con los avisos) y `expect.timeout` de 15 s |
| Pruebas | Negativos que no esperaban a la página perezosa, un `.catch` que tragaba el fallo que debía contar, «una sola vez» sin esperar al segundo envío, títulos con marcadores equivocados, y la prueba de «no registra el cuerpo» ahora también cubre el fallo y `console` |
| Arquitectura | La regla `no-restricted-imports` impide que `features/users` importe `features/auth` (antes solo lo comprobó una búsqueda) |
| Documentación | La aplicación M2M necesita también `delete:users` (para deshacer un alta fallida: sin él queda una cuenta huérfana en Auth0); la consulta `me` ya existe en el servicio; el riesgo del borrador `010-user-id-uuid` del servicio; los números U6 a U9 de los comentarios; la referencia a una «constitución VIII» que no existe |

Se revisó y se dejó como está: el indicador de foco de los botones de MUI es visible pero tenue (cumple WCAG 2.1, 2.4.7; mejorable con un contorno propio); `autoComplete="new-password"` puede no impedir que el navegador ofrezca guardar la contraseña de la persona nueva (se comprueba a mano en el quickstart V9); la feature no registra operaciones fallidas con `logger`.

Con esta pasada: 138 archivos y 1682 pruebas, entrada de 273,6 KB gzip.
