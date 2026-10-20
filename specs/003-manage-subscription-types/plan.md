# Implementation Plan: Administración de Suscripciones

**Branch**: `003-manage-subscription-types` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-manage-subscription-types/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Segunda sección de administración del Backoffice, con el patrón de Usuarios (feature 002). El operador consulta las suscripciones (los planes que MailySoft ofrece a las clínicas) en un listado con un orden fijo: primero las Activas y después las demás, cada grupo por precio y, a igualdad, por nombre. Abre su detalle, crea y modifica suscripciones con un formulario compartido y cambia su estatus entre Activa, Inactiva y Bloqueada (con confirmación para inactivar y bloquear). También las elimina con confirmación, salvo cuando tienen clínicas asignadas. Todo se hace contra la API de suscripciones, que reenvía el token de la sesión al API de usuarios para decidir el permiso en cada petición.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas** (D1).
2. **Estructura**: una feature `subscriptions` que no importa `auth`. Las capacidades salen de `getSubscriptionCapabilities` (con `can()`) y las entregan adaptadores de `app/router/subscriptions/`. Cuatro piezas genéricas de la 002 pasan a capas comunes para reutilizarlas: `RequireCapability`, `atMost`, `RefreshFailedAlert` y el marco del formulario (D2, D3).
3. **Rutas y URL**: `/subscriptions`, `/subscriptions/new`, `/subscriptions/:subscriptionId` y `/subscriptions/:subscriptionId/edit`. La página y el tamaño viajan en la URL; los ids son enteros y no UUID como los de usuarios; se vuelve al listado en la misma página (D5, [contracts/app-routes.md](contracts/app-routes.md)).
4. **Listado**: una sola consulta del catálogo completo, ordenado (`sortCatalog`) y cortado (`pageOf`) en memoria y mostrado en el Data Grid con la paginación fuera del grid. Es un desvío de la constitución IV que impone el contrato, justificado en Complexity Tracking (D6).
5. **Presentación**: precio en pesos con formato de México y «/mes»; clínicas o «No disponible», también si el campo falta; etiqueta de estatus por id, sin atenuar filas (D7).
6. **Servidor y formulario**: claves por factoría con la matriz de invalidación del [modelo de datos](data-model.md). El formulario usa React Hook Form y Zod, con lo que incluye como lista de campos. El precio admite solo dígitos y punto. Se envía solo lo que cambió, y nada si no cambió nada (D8, D9).
7. **Estatus, eliminación y errores**: un menú con los estatus distintos del actual, «Eliminar» deshabilitado con el motivo cuando hay clínicas y cada rechazo de la API traducido por su código a un texto propio ([contracts/subscriptions-service.md](contracts/subscriptions-service.md); D10 a D12).
8. **Integración**: un cliente HTTP más con el mismo token; `VITE_SUBSCRIPTIONS_API_URL` pasa a ser obligatoria; un proxy de desarrollo `/proxy/subscriptions`, porque la API tiene CORS cerrado por defecto (D13).
9. **Calidad**: un simulador con estado de la API que toma los permisos del simulador del servicio de usuarios, lógica pura con prueba primero, integración por historia, axe y E2E preparado (D14 a D16).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios respecto a la 002.

**Primary Dependencies**: las de la 002, sin cambios: Vite 8.3.4, react-router 8.4.0, @tanstack/react-query 5.104.4, @auth0/auth0-react 2.28.2, @mui/material e @mui/icons-material 9.5.0, @mui/x-data-grid 9.15.0, react-hook-form 7.90.0, @hookform/resolvers 5.9.2 y zod 4.6.7. **Ninguna nueva** (D1).

**Storage**: N/A. Sin persistencia propia ni almacenamiento del navegador: el estado del listado vive en la URL y el del servidor en la caché de TanStack Query.

**Testing**: la infraestructura de la 001 y la 002 (Vitest 5.0.5 con jsdom, Testing Library, user-event, MSW 3.0.3, vitest-axe, Playwright 1.64.1), más un **simulador con estado de la API de suscripciones** que comparte con el de la 002 el registro de solicitudes, los fallos inyectables y los permisos (D14). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`. En esta fase no se escriben ni se ejecutan pruebas (spec, Assumptions): se hacen en `/speckit-implement`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, diseñada desde 1024 px y reacomodable hasta 320 px sin desplazamiento horizontal de la página (la tabla se desplaza dentro de su recuadro), sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: primera página del listado en menos de 2 s en el 95 % de las consultas con el catálogo completo, de hasta 100 suscripciones (SC-002): una sola solicitud, ordenar y cortar en memoria, y ninguna solicitud al cambiar de página. Alta en menos de 2 minutos (SC-001), cambio de estatus en 3 interacciones o menos (SC-009) y JS de la ruta de entrada de 300 KB gzip o menos (274,3 KB tras la 005), con las pantallas en fragmentos perezosos.

**Constraints**: la API exige token y permiso en cada operación y los decide el API de usuarios. El catálogo llega completo, sin paginar ni en el orden pedido. No hay control de concurrencia (gana el último cambio) y el `PATCH` es parcial, con al menos un dato. El número de clínicas puede no estar disponible, y eliminar se rechaza si hay clínicas o si no puede comprobarse. Los estatus se reconocen por id, y los añadidos a mano son vigentes. Las mutaciones no se reintentan y se deshabilitan mientras están pendientes, y ningún texto de la API llega a la pantalla. CORS está cerrado por defecto en la API. La interfaz es en español, accesible (WCAG 2.1 AA) y fluida de 1024 a 320 px.

**Scale/Scope**: herramienta interna de decenas de operadores sobre un catálogo de unas decenas de suscripciones (la API lo entrega completo hasta 500). Comprende 4 rutas, un menú de estatus, 3 diálogos (inactivar, bloquear y eliminar) y 6 operaciones de la API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.2.1. «Antes» es el estado al iniciar la investigación (⚠️: dependía de una decisión por tomar; ❌: desvío que hay que justificar); «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; efectos solo con sistemas externos | Solo funciones y Hooks; los únicos efectos son la normalización de la URL y el foco | ✅ | ✅ |
| I. Estructura por features con límites en ESLint | `subscriptions` con `api/components/hooks/policy/schemas` e `index.ts`; no importa `auth` (regla `no-restricted-imports`); `auth` solo importa un tipo; `app` compone con adaptadores (D2) | ⚠️ | ✅ |
| I. Sin abstracciones especulativas ni memoización preventiva; componentes ≤ 250 líneas | Se reutilizan `ConfirmDialog`, `RequireCapability`, `FormFrame` y `RefreshFailedAlert`, que pasan a capas comunes porque ya tienen dos usos; sin stores ni Context nuevos; un componente por pieza de la pantalla (D2) | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras | Esquemas para `SubscriptionRead` (un `clinics_count` ausente es `null`), la URL, el estado de navegación y el formulario; DTO a dominio en `api`; sin `as` ([data-model.md](data-model.md)) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; factorías de claves; mutaciones que invalidan | `subscriptionKeys` y la matriz de invalidación (D8) | ✅ | ✅ |
| III. Formularios con React Hook Form y Zod; errores de la API por campo | D9, con un texto propio por campo (FR-010) | ✅ | ✅ |
| III. Estado navegable del listado en la URL | `page` y `page_size` validados (D5); el orden es fijo y no se navega | ✅ | ✅ |
| III. Vaciar la caché al cerrar sesión; no persistirla | Ya implementado en la 001 | ✅ | ✅ |
| IV. Todo por las APIs; el backend es la fuente de verdad; sin reglas autoritativas duplicadas | El orden es de presentación; deshabilitar «Eliminar» con clínicas es solo de interfaz: la API decide y vuelve a comprobarlo (D3, D6) | ✅ | ✅ |
| IV. URLs base por entorno, validadas al arrancar | `VITE_SUBSCRIPTIONS_API_URL` pasa a ser obligatoria y se valida (D13) | ⚠️ | ✅ |
| IV. Cliente HTTP único; token solo a los hosts configurados; tiempo límite y cancelación | Un cliente `subscriptions` creado con `createHttpClient` (D13) | ✅ | ✅ |
| IV. Mutaciones sin reintentos y deshabilitadas mientras están pendientes | `MUTATION_RETRY` de la 001; FR-007 | ✅ | ✅ |
| IV. Paginación en servidor; NO descargar una colección completa para paginarla en el cliente (DEBE) | **Desvío**: la API devuelve el catálogo completo, sin paginar y en otro orden; se ordena y se pagina en memoria, con una sola solicitud y nunca más filas que el `page_size` (D6) | ❌ | ✅ (Complexity Tracking) |
| IV. Errores uniformes (401, 403, 404, 409/422, red/5xx) sin mensajes crudos | `describeSubscriptionError`; ningún texto de la API en pantalla, tampoco los de campo (D12) | ✅ | ✅ |
| IV. Sin transacciones distribuidas | Cada acción es una sola llamada | ✅ | ✅ |
| IV. Contratos documentados; tipos derivados del OpenAPI (DEBERÍA) | [contracts/subscriptions-service.md](contracts/subscriptions-service.md); esquemas Zod a mano (D4) | ⚠️ | ✅ (Complexity Tracking) |
| IV. Fechas ISO 8601; formato solo en presentación con `Intl` | `formatDateTime` y `formatMxn` (D7, D17) | ✅ | ✅ |
| V. Auth0; tokens en memoria; sin secretos | Sin cambios: el mismo token de la sesión | ✅ | ✅ |
| V. Autorización en un único módulo de políticas; el 403 se maneja | `getSubscriptionCapabilities` con `can()`; el aviso global de la 001 (D3) | ✅ | ✅ |
| V. Sin tokens ni datos personales en registros; HTTPS fuera de local | La feature no registra operaciones; `isApiBase` exige `https` en los builds de producción | ✅ | ✅ |
| VI. MUI y Data Grid community con tema central y localización en español | Data Grid 9.15.0 con la localización del tema; colores del tema (D6, D7) | ✅ | ✅ |
| VI. Estados de carga, vacío, error y éxito; mutaciones que notifican | Tabla de estados de [contracts/app-routes.md](contracts/app-routes.md) y un aviso por resultado | ✅ | ✅ |
| VI. Mismo patrón de listar, mostrar, crear, modificar y eliminar | Listado paginado, detalle, formulario compartido y diálogo de confirmación | ✅ | ✅ |
| VI. Confirmación que nombra el recurso en acciones destructivas o de alto impacto | Eliminar, inactivar y bloquear (D10, D11) | ✅ | ✅ |
| VI. WCAG 2.1 AA, textos en un único módulo, diseño adaptable | Estatus con texto y sin atenuar filas; axe; `messages.subscriptions` en `es.ts`; de 1024 a 320 px (D16) | ⚠️ | ✅ |
| VII. Pruebas en el mismo PR; primero en lógica pura; MSW; doble de Auth0 | Simulador con estado y las capas de D14 | ✅ | ✅ |
| VII. Cobertura de 80 % en las capas definidas; E2E cuando exista entorno | Los archivos nuevos van en las carpetas que cuentan; `e2e/subscriptions.spec.ts` se omite sin `E2E_*` | ✅ | ✅ |
| Stack: dependencias mínimas, licencias permisivas, sin funciones de pago de MUI X | Ninguna dependencia nueva (D1) | ✅ | ✅ |
| Configuración: variables `VITE_*` validadas y documentadas | La variable obligatoria, con `.env.example`, el README y el contrato de entorno de la 001 al día (D13) | ⚠️ | ✅ |
| Rendimiento: `React.lazy`, presupuesto de 300 KB, filas ≤ `page_size`, `logger` y boundaries | Pantallas perezosas; el grid solo recibe la página; `npm run size`; `ErrorBoundary` por ruta (D6, D15) | ✅ | ✅ |
| Flujo: spec, clarify y plan antes del código; rama de feature; idiomas | Rama `003-manage-subscription-types`; documentación en español y código en inglés | ✅ | ✅ |

**Resultado**: sin violaciones sin justificar antes ni después del diseño. Hay un desvío de una regla con DEBE (paginación en servidor), que impone el contrato y que la spec pidió justificar aquí, y el de un DEBERÍA (tipos desde el OpenAPI), como en la 002. Ambos están en Complexity Tracking; la constitución no se enmienda.

## Project Structure

### Documentation (this feature)

```text
specs/003-manage-subscription-types/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── app-routes.md
│   └── subscriptions-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que añade o cambia la 003; el resto de la estructura es la de la 001 y la 002 ([../002-manage-users/plan.md](../002-manage-users/plan.md)).

```text
src/
├── app/
│   ├── config/env.ts                       # VITE_SUBSCRIPTIONS_API_URL pasa a ser obligatoria (D13)
│   ├── navigation/sections.ts              # registra Suscripciones (id subscriptions, /subscriptions, recurso subscriptions)
│   ├── providers/HttpClientsProvider.tsx   # + cliente subscriptions
│   ├── layouts/useRouteAccessibility.ts    # títulos nuevos y la clave de ruta subscriptionIdParam
│   └── router/
│       ├── routes.tsx                      # rutas /subscriptions... dentro de la guarda, con RequirePermission
│       ├── RequireCapability.tsx           # movido desde router/users: lo usan las dos secciones
│       └── subscriptions/                  # adaptadores: SubscriptionsListRoute, SubscriptionDetailRoute,
│                                           # SubscriptionCreateRoute y SubscriptionEditRoute
├── features/
│   ├── auth/
│   │   ├── policy/subscriptionCapabilities.ts  # getSubscriptionCapabilities, solo con can()
│   │   └── index.ts                        # lo exporta
│   ├── users/                              # importa de shared lo que pasó a ser común (D2)
│   └── subscriptions/
│       ├── api/                            # subscriptionsApi (S1 a S6) y subscriptionErrors
│       │                                   # (describeSubscriptionError, toNotification)
│       ├── components/                     # SubscriptionsListPage, SubscriptionsGrid, SubscriptionStatusChip,
│       │                                   # SubscriptionDetailPage, SubscriptionDetailFields, SubscriptionStatusMenu,
│       │                                   # DeleteSubscriptionAction, SubscriptionFormFields, FeaturesField,
│       │                                   # SubscriptionCreatePage y SubscriptionEditPage
│       ├── hooks/                          # subscriptionKeys, useSubscriptionsLocation, useSubscriptionCatalog,
│       │                                   # useSubscription, useCreateSubscription, useUpdateSubscription,
│       │                                   # useChangeSubscriptionStatus, useDeleteSubscription,
│       │                                   # useNotifySubscriptionError y refreshSubscription
│       ├── policy/                         # subscriptionActions (SubscriptionCapabilities, getStatusTargets,
│       │                                   # getDeleteAvailability) y catalogOrder (sortCatalog, pageOf)
│       ├── schemas/                        # subscription, subscriptionStatus, price (toCents), subscriptionsLocation
│       │                                   # (+ parseSubscriptionId), subscriptionDetailState y subscriptionForm (+ cuerpos)
│       └── index.ts                        # pantallas perezosas; estático solo parseSubscriptionId y los tipos
├── shared/
│   ├── api/httpClientsContext.tsx          # HttpClients + subscriptions
│   ├── lib/atMost.ts                       # movido desde users (atMost, REFRESH_WAIT_MS)
│   ├── lib/formatCurrency.ts               # formatMxn (Intl.NumberFormat, es-MX, MXN)
│   ├── messages/es.ts                      # bloque subscriptions, títulos y common.save
│   └── ui/                                 # FormFrame (el marco de UserForm) y RefreshFailedAlert (desde users)
└── test/
    ├── handlers/shared/                    # registro de solicitudes y fallos inyectables, parametrizados por URL base
    ├── handlers/subscriptionsCatalog/      # simulador con estado de la API de suscripciones: model, seed,
    │                                       # authorize (permisos del simulador de usuarios), validation y operaciones
    ├── renderApp.tsx, renderWithProviders.tsx  # + VITE_SUBSCRIPTIONS_API_URL y el cliente subscriptions
    ├── factories.ts                        # + subscriptionDto
    └── subscriptionCapabilities.ts         # capacidades de prueba
eslint.config.js                            # features/subscriptions tampoco importa features/auth
vite.config.ts                              # proxy /proxy/subscriptions (SUBSCRIPTIONS_API_PROXY_TARGET, por defecto 127.0.0.1:8010)
.env.example, README.md                     # la variable obligatoria y el proxy
specs/001-auth-session-profile/contracts/environment.md  # VITE_SUBSCRIPTIONS_API_URL obligatoria (feature 003)
e2e/subscriptions.spec.ts                   # recorrido crítico (se omite sin variables E2E_*)
```

**Structure Decision**: se mantiene el proyecto único y la regla `app → features → shared`. La feature `subscriptions` es autosuficiente (esquemas, API, hooks, pantallas y política de acciones) y no conoce a `auth`. La capa `app` es la única que las une: evalúa las capacidades con la política de `auth` y se las pasa a las pantallas como propiedades (D2). Lo que la 002 escribió dentro de `users` y la 003 también necesita (la guarda de capacidad, la espera acotada, el aviso de refresco fallido y el marco del formulario) pasa a `app` o a `shared` sin cambiar su comportamiento. Las pruebas van junto al código, y el simulador de la API, en `src/test/`.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001, FR-015, SC-007 | `useSubscriptionCatalog` (`select: sortCatalog`), `pageOf` y `SubscriptionsGrid` (paginación fuera del grid, tamaños 10/25/50, una página inexistente pasa a la última); los grupos solo ordenan | Unitarias (orden y página) y componentes; V1 a V3 |
| FR-002, FR-016 | Columnas del grid; `SubscriptionStatusChip` por id, sin atenuar filas | Componentes con axe; V1, V24 |
| FR-003 | `SubscriptionDetailPage` y estado de navegación `listSearch` (D5) | Integración; V5 |
| FR-004 | Estados de [contracts/app-routes.md](contracts/app-routes.md) en el listado, el detalle y la edición | Componentes con MSW; V6 |
| FR-005, FR-006, FR-023 | `SubscriptionFormFields`, `FeaturesField`, `subscriptionFormSchema` y `toCreateSubscriptionBody` | Unitarias y componentes; V9, V10 |
| FR-007, SC-004 | Botones y diálogos deshabilitados mientras la mutación está pendiente; sin reintentos automáticos | Componentes (doble clic) e integración (una sola solicitud); V11, V20, V23 |
| FR-008, FR-012 | `SubscriptionEditPage` y `toUpdateSubscriptionBody` (solo lo que cambió; `null` sin cambios) | Unitarias, componentes e integración (cuerpo registrado por el simulador); V13 a V15 |
| FR-009, SC-003 | `DeleteSubscriptionAction` con `ConfirmDialog`; inactivar y bloquear, en `SubscriptionStatusMenu` | Componentes e integración (ninguna solicitud antes de confirmar); V17, V21 |
| FR-010, SC-005 | `describeSubscriptionError` y textos propios para cada código | Unitarias (cada código) e integración con el simulador; V10, V15, V19, V22 |
| FR-011 | Matriz de invalidación y navegación tras cada acción | Hooks con MSW e integración; V9, V13, V17, V21 |
| FR-013, SC-010 | `getSubscriptionCapabilities` con `can()`, adaptadores de `app` y `RequireCapability` | Unitarias (matriz de permisos) e integración; V8, V12, V16, V20, V23 |
| FR-014 | `formatMxn` con «/mes» y `formatDateTime` | Unitarias; V4, V5, V25 |
| FR-017, SC-009 | `SubscriptionStatusMenu` y `getStatusTargets` | Unitarias, componentes e integración; V17 a V20 |
| FR-018, SC-008 | `getDeleteAvailability`, el motivo visible y los rechazos de la API | Unitarias, componentes e integración; V21 a V23 |
| FR-019 | `clinicsCount` `null` o ausente es «No disponible» | Unitarias (esquema) y componentes; V4 |
| FR-020 | Etiqueta neutra, segundo grupo y tres estatus de destino | Unitarias y componentes; V24 |
| FR-021 | Constructores de cuerpos sin id, estatus, clínicas ni fechas | Unitarias e integración (cuerpos registrados) |
| FR-022, SC-011 | Cliente `subscriptions` con `createHttpClient` (token solo al origen configurado) y proxy de desarrollo | Integración (cabecera y host de cada solicitud); V27 |
| SC-001, SC-006 | Formulario y navegación sin pasos de más | Manual; V9, V26 |
| SC-002 | Una solicitud, orden y corte en memoria y fragmentos perezosos | `npm run size`; medición manual en V26 |
| FR-022 de la 001 | Diseño fluido; la tabla se desplaza dentro de su recuadro | Playwright a 1024×768 y 320×640; V25 |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| El listado descarga el catálogo completo y lo ordena y pagina en el cliente (constitución IV: DEBE paginar en servidor y NO DEBE descargar una colección completa para paginarla en el cliente) | La API devuelve el catálogo sin paginar y ordenado por fecha de creación (su spec decidió «no es necesario paginar»), mientras que la spec del Backoffice pide un orden fijo distinto (aclaraciones 1 y 7) y una tabla paginada (FR-001). La propia spec del Backoffice pidió registrar este desvío y justificarlo aquí | Pedir paginación y orden a la API: es un cambio incompatible en otro repositorio, que su spec descartó y retrasaría esta feature. Mostrar el catálogo sin paginar: contradice FR-001 y el patrón común de la constitución VI. Mitigación: catálogo esperado de unas decenas (la API lo garantiza completo hasta 500), una sola solicitud, el grid nunca recibe más filas que el `page_size` y, si la API empieza a paginar (un cambio versionado), la feature se revisa. |
| Esquemas Zod escritos a mano en lugar de derivarlos del OpenAPI de la API (constitución IV: DEBERÍAN derivarse) | Zod es la fuente única de cada entidad (constitución II). El OpenAPI publicado difiere en detalles del documentado (por ejemplo, `clinics_count` no figura como obligatorio), y son seis operaciones con formas sencillas | Generar tipos de TypeScript: sería una segunda fuente de verdad junto a Zod. Generar esquemas Zod desde el OpenAPI: añade una dependencia y un paso que necesita el servicio en marcha, o su repositorio, en CI. Mitigación: validación en la frontera, un simulador fiel al contrato y las diferencias anotadas en [contracts/subscriptions-service.md](contracts/subscriptions-service.md) (D4). |
