# Implementation Plan: Salud de Servicios (Estado de los Componentes de Maily)

**Branch**: `016-health-dashboard` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-health-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

El Backoffice gana la página «Salud de servicios» (`/health`): el estado general de Maily y el de cada componente (los integrados, maily-system-api y la base de datos, y los del registro), con su latencia, su última comprobación y lo que tiene desplegado. Los datos vienen del agregador de maily-system-api (`GET /api/v1/health`, spec 005) y se actualizan solos cada `VITE_HEALTH_REFRESH_SECONDS` (30 s por defecto) con la pestaña visible. Quien tiene los permisos administra el registro de componentes (`/health/components`), sin desplegar nada. La página muestra también la versión del propio Backoffice. Cuando el agregador falla, y en la pantalla «No se pudo comprobar el acceso», el Backoffice muestra el estado público de maily-system-api (`GET /health/status`, sin credencial) y, si tampoco responde, una comprobación directa desde el navegador de `/health/live` y `/health/ready` de los servicios con URL base configurada.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Estructura**: una feature `health` que no importa `auth` (D1). `health` entra en `SECTION_RESOURCES`, con `getHealthCapabilities` en el módulo de políticas y las rutas bajo `RequirePermission` y `RequireCapability` (D2).
2. **Cliente HTTP**: el único cliente gana consultas `anonymous` (sin token, sin cookies, sin manejo de sesión), un tiempo límite por consulta, `probe` para las rutas de salud y clientes anónimos para los servicios de `VITE_HEALTH_DIRECT_SERVICES` (D3, D4).
3. **Esquemas**: forma estricta y valores tolerantes: un estado, tipo, chequeo o código desconocido nunca invalida la respuesta, y lo que falta se ve «No disponible» (D5).
4. **El ciclo**: una consulta de TanStack Query representa el ciclo y ejecuta la cadena (agregador → estado público → comprobación directa), cada paso con su propia consulta observada por la pantalla; el intervalo se cuenta desde que termina la cadena, nunca hay dos en curso y la pestaña oculta lo pausa (D6). Tiempos: 15 s y 1 reintento para el agregador, 10 s y 1 para el estado público, 5 s y ninguno por sondeo (D7). El 403 es un resultado «sin permiso» y no sigue la cadena (D8).
5. **Pantalla de acceso fallido**: `app/router` compone en ella, por un hueco (`children`), la cadena por rondas de `health`, en un fragmento diferido, pausada mientras se comprueba el acceso y sin cambiar sus reglas (D9).
6. **Presentación y accesibilidad**: estados derivados por funciones puras (D11), `Badge` con un icono distinto por estado (D12), un reloj compartido para «Actualizado hace» y la línea de regreso en la zona del navegador (D13), y anuncios corteses solo al aparecer y tras un pedido de la persona (D14).
7. **Registro**: listado paginado en el navegador (Complexity Tracking), detalle, formulario compartido y eliminación con confirmación, con los rechazos del servicio (409, 422 por campo, 404) traducidos a textos propios (D15, D16).
8. **Configuración y build**: `VITE_HEALTH_REFRESH_SECONDS` y `VITE_HEALTH_DIRECT_SERVICES` validadas al arrancar (D17); versión de `package.json` y commit y fecha inyectados al compilar con `define`, sin impedir nunca arrancar (D18).
9. **Despliegue**: el token nunca sale del origen de maily-system-api; la CSP debe incluir los orígenes de `VITE_HEALTH_DIRECT_SERVICES`; cada servicio debe responder con CORS en sus rutas de salud, y un script lo verifica por ambiente (D19).
10. **Tamaño**: todo lo de la feature es diferido, con guardas nuevas en `npm run size`. Con la línea base medida en 299,7 KB, la enmienda 1.7.0 subió el presupuesto a 320 KB para dar cabida a lo que la feature suma a la entrada (D20).
11. **Calidad**: simuladores MSW del agregador, el registro, el estado público y los sondeos; prueba primero en lo puro; reloj simulado; axe; E2E cuando haya ambiente (D22). Sin dependencias nuevas (D23).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS. Sin cambios.

**Primary Dependencies**: las existentes, sin cambios:
- Vite 8.3.4, react-router 8.4.0, @tanstack/react-query 5.104.4 (`queryOptions` y `queryClient.query`, que en esa versión reemplaza a `fetchQuery`, ya obsoleto) y @auth0/auth0-react 2.28.2;
- @mui/material 9.5.0 (`Alert`, `Collapse`, `Chip` por `Badge`), @mui/x-data-grid 9.15.0 (listado del registro), react-hook-form 7.90.0 con @hookform/resolvers 5.9.2, zod 4.6.7 y lucide-react 1.61.0 (iconos nuevos verificados en el paquete instalado).

**Ninguna nueva** (D23).

**Storage**: N/A. El último resultado del agregador vive en la caché de TanStack Query durante la sesión (`gcTime: Infinity`) y se borra al cerrarla o al perder `health:read`; las secciones de respaldo no se guardan entre apariciones. Nada en el almacenamiento del navegador (FR-029, FR-064, FR-070).

**Testing**:
- **Herramientas**: las existentes (Vitest 5.0.5 con jsdom y `TZ=UTC`, Testing Library, user-event, MSW 3.0.3, vitest-axe y Playwright 1.64.1).
- **Simuladores nuevos**: `healthMonitoring` (agregador, estado público y registro con estado) y `healthProbes` (rutas de salud de los tres servicios, con 503 del contrato, HTML, red y tiempo agotado), sobre las piezas compartidas de la 003 (D22).
- **Reloj, visibilidad y zonas**: temporizadores simulados y visibilidad como en la 007; las zonas horarias se pasan a `formatReturnLine`, porque Vitest fija `TZ=UTC`.
- **Cobertura**: 80 % de líneas en `api`, `schemas`, `policy` y `hooks` de `health` y en lo nuevo de `shared/api` y `shared/lib`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 px a 320 px sin desplazamiento horizontal (sin cambios).

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio (sin cambios).

**Performance Goals**:
- **Primera carga** (SC-001): el estado de todos los componentes en menos de 5 s en el 95 % de las visitas con maily-system-api disponible: una sola consulta, que el agregador responde en ≤ `HEALTH_CHECK_TIMEOUT_SECONDS` + 1 s (4 s por defecto).
- **Registro sin despliegue** (SC-002): un componente nuevo aparece en menos de 1 min (ciclo de 30 s y caché del agregador de 15 s).
- **Ciclos** (SC-004): `floor(600 / intervalo)` consultas en 10 min con la página a la vista; 0 con la pestaña oculta o fuera de ella.
- **Cadena con maily-system-api detenido** (SC-019, SC-020): ≤ 10 s (≈ 7 s en la página y ≈ 6 s en la pantalla de fallo, D7). **SC-013** (≤ 5 s con la base detenida) depende de la agregación de system-api 005.
- **Tamaño** (SC-005): ver D20 y [Lo que necesita aprobación](#lo-que-necesita-aprobación).

**Constraints**:
- **Dependencias externas**: system-api 005 (agregador, registro y estado público) y usuarios 016 (permisos `health:*`) no están implementados; los contratos salen de sus specs ([contracts/](contracts/)). La comprobación directa necesita CORS en cada servicio, y pacientes 008 todavía no lo tiene.
- **Seguridad**: el token solo al origen de maily-system-api; el estado público y los sondeos, sin credencial ni cookies; ninguna dirección del registro se consulta ni se enlaza.
- **Reglas de acceso**: la pantalla «No se pudo comprobar el acceso» no cambia sus reglas (features 001 y 006); mientras se comprueba el acceso no se hace ninguna consulta de la cadena.
- **Código**: render puro, sin `Date.now()` (constitución I); `fetch` solo en el cliente compartido.
- **Interfaz**: en español, WCAG 2.1 AA, temas claro y oscuro.

**Scale/Scope**:
- **Uso**: herramienta interna de decenas de operadores; una consulta al agregador por persona cada 10 a 300 s con la página a la vista.
- **Datos**: 2 componentes integrados y hasta unos 50 registrados (30 en las pruebas de diseño); hasta 22 servicios en la comprobación directa (2 fijos y 20 configurables).
- **Pantallas**: 5 rutas y 2 secciones en la pantalla de fallo; 9 operaciones consumidas (el agregador, las 5 del registro, el estado público y los dos sondeos); 2 variables `VITE_*` nuevas y 2 variables de compilación.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución **v1.5.0** (2026-10-23) y revisado contra la **v1.6.0** (2026-10-24), la enmienda MINOR de FR-054 que aprobó el responsable y que solo amplía el «Alcance del producto». «Antes» es el estado al iniciar la investigación (⚠️: dependía de una decisión por tomar; ❌: desvío que hay que justificar o aprobar); «Después», tras el diseño y la enmienda.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; efectos solo con sistemas externos | El reloj se lee con `useSyncExternalStore` (`useNow`), nunca con `Date.now()` en el render; `Date.now()` solo en `refetchOnWindowFocus` y en las funciones de consulta, que corren fuera del render. Los efectos sincronizan la caché (cancelar y quitar pasos al pausar o salir; `useForgetHealthData`) (D6, D9, D13, D21) | ⚠️ | ✅ |
| I. Estructura por features con límites en ESLint | `health` con `api`, `schemas`, `policy`, `hooks`, `components`, `pages` e `index.ts`; `forbidAuthImports('health')`; `auth` solo importa el tipo de las capacidades (`import type`); `app` compone las rutas y la pantalla de fallo (D1, D9) | ⚠️ | ✅ |
| I. Sin abstracciones especulativas ni memoización preventiva; componentes de 250 líneas o menos | El ciclo como consulta reutiliza TanStack en lugar de un temporizador propio (D6); no hay Context nuevo (se amplían `AppSettings` y `HttpClients`); `probe` y las consultas anónimas los exige la spec (D3); un componente por pieza (D12) | ⚠️ | ✅ |
| II. TypeScript estricto y Zod en las fronteras; DTO a dominio en `api`/`schemas` | Esquemas del agregador, del estado público, del contrato v1 y del registro, el formulario, las dos variables, el build y los parámetros de la URL; los cuerpos de `probe` se validan antes de usarse; sin `as` (D3, D5, D17, D18) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query, sin copiarlo; factorías de claves | `healthKeys`; cada paso es una consulta; las vistas se derivan con funciones puras; el estado de UI es solo lo desplegado y lo anunciado (D6, D11) | ✅ | ✅ |
| III. Formularios con React Hook Form y Zod; errores por campo de la API mapeados | `componentFormSchema`; `describeMonitoredComponentError` lleva cada `field` del 422 a su campo (D15, D16) | ✅ | ✅ |
| III. Estado navegable del listado en la URL | `?page=` y `?pageSize=` del registro (D15) | ✅ | ✅ |
| III. Vaciar la caché al cerrar sesión; no persistirla | El `clear()` de la 001; `useForgetHealthData` al perder `health:read`; nada en el almacenamiento (D21) | ✅ | ✅ |
| IV. Todo por las APIs; sin reglas de negocio duplicadas | Los estados se muestran como llegan, sin recalcular (FR-010); la unicidad del código y la lista permitida las decide el servicio; las reglas de formato del navegador son de UX (D5, D15) | ✅ | ✅ |
| IV. URL base por entorno, validada; sin hosts en el código | `VITE_SUBSCRIPTIONS_API_URL` y `VITE_USERS_API_URL` existentes y `VITE_HEALTH_DIRECT_SERVICES` validada al arrancar (D4, D17) | ✅ | ✅ |
| IV. Cliente HTTP único; token solo a los hosts configurados; tiempo límite y cancelación | Las consultas anónimas, el tiempo por consulta, `probe` y los clientes anónimos salen del mismo módulo; el token solo va al origen de la base; tiempos explícitos; la señal llega a cada paso. `probe` devuelve el 503 del contrato v1 como respuesta, no como error, porque lo es; la red y el tiempo agotado siguen siendo `ApiError`, y una regla de ESLint limita `probe` a `directCheckApi.ts` (D3, D7) | ⚠️ | ✅ |
| **IV. Actualización periódica** (pedido del coordinador): intervalo definido, pausa con la pestaña oculta, sin consultas iguales en curso y sin contar como actividad | Intervalo acotado y configurable (10 a 300 s, 30 por defecto) y cuándo sí y cuándo no, en FR-020 a FR-029. **Pausa**: `refetchIntervalInBackground: false` y ninguna cadena empieza con la pestaña oculta. **Sin superposición**: el ciclo es una consulta deduplicada que incluye la cadena; «Actualizar» y el intervalo se unen al que esté en curso. **Sin actividad**: el temporizador de inactividad solo escucha `mousedown`, `keydown` y `touchstart`; una prueba de integración lo afirma con los ciclos en marcha. La pantalla de fallo no repite nada sola (rondas por «Reintentar») (D6, D9) | ⚠️ | ✅ |
| IV. Reintentos solo en GET, como mucho 2, con espera, ante red o 5xx; mutaciones sin reintentos y deshabilitadas | 1 en el agregador y en el estado público, 0 en los sondeos, 2 en las lecturas del registro, 0 en sus mutaciones, con «Guardar» y «Eliminar» deshabilitados mientras tanto (D7) | ✅ | ✅ |
| IV. Paginación en el servidor; no descargar una colección para paginarla en el cliente (DEBE) | **Desvío**: system-api 005 entrega el registro completo, sin paginar (máximo esperado: 50); se pagina en memoria con una sola consulta y nunca más filas que el tamaño de página, como en la 003 (D15) | ❌ | ✅ (Complexity Tracking) |
| IV. Errores uniformes; sin mensajes crudos | 401 con el manejo de sesión; 403 como «sin permiso» sin cerrar sesión (y sin el aviso global duplicado en la página); 404, 409 y 422 con textos propios por campo; red y 5xx con mensaje genérico y reintento (botón o ciclo) (D8, D16) | ✅ | ✅ |
| IV. Contratos documentados; tipos derivados del OpenAPI (DEBERÍA) | [contracts/](contracts/); esquemas Zod a mano: system-api 005 todavía no publica su contrato (D5) | ⚠️ | ✅ (Complexity Tracking) |
| IV. Fechas ISO 8601; formato solo en presentación con `Intl` | `formatDateTime`, `formatCount` y `formatReturnLine` con `Intl` en la zona del navegador (D12, D13) | ✅ | ✅ |
| V. Auth0; tokens en memoria; sin secretos | Sin cambios; `APP_COMMIT_SHA` y `APP_BUILD_DATE` no son secretos (D18) | ✅ | ✅ |
| V. Rutas protegidas y *fail closed* | `/health/*` bajo `ProtectedRoute` y `RequirePermission`; la pantalla de fallo solo añade información pública, nunca contenido interno, y no consulta mientras se comprueba el acceso (D9) | ✅ | ✅ |
| V. Autorización en un único módulo de políticas; el 403 se maneja | `can()` y `getHealthCapabilities`, con prueba primero; `RequireCapability` en el alta y la edición; el 403 de cada operación (D2, D8, D16) | ✅ | ✅ |
| V. Sin tokens ni datos personales en registros | No se registra ningún cuerpo; las respuestas de los sondeos nunca se muestran ni se registran (D3, D10) | ✅ | ✅ |
| VI. MUI con el tema central; textos en el módulo de mensajes; localización | `Badge`, `Icon`, `Alert`, `Collapse` y el Data Grid en español; `messages.health` (D12, data-model §13) | ✅ | ✅ |
| VI. Estados de carga, vacío, error y éxito; reintento (que puede ser el ciclo); mutaciones notificadas | Tablas de estados de [data-model.md](data-model.md#10-estados-de-la-página); las secciones se reintentan con «Reintentar», «Actualizar» o el ciclo; avisos de éxito y de error en el registro (D11, D15) | ✅ | ✅ |
| VI. Patrón de recursos administrados; confirmación que nombra el recurso | Listado, detalle, formulario compartido y eliminación con `ConfirmDialog` que nombra el componente, como Usuarios y Suscripciones (D15) | ✅ | ✅ |
| **VI. WCAG 2.1 AA; axe en las pantallas principales** (pedido del coordinador) | Encabezados por nivel, cada componente y fila por su nombre, estados con texto e icono, foco al `h1` y en los diálogos, anuncios corteses una vez y los fallos primero (D14). axe en cada estado de SC-003, SC-016 y SC-022 en las dos pantallas, más `jsx-a11y`; el contraste se revisa en el navegador porque jsdom no calcula colores (V14) | ✅ | ✅ |
| VI. Diseño adaptable | De 1024 a 320 px, en E2E y en V14 (D12) | ✅ | ✅ |
| **VII. Pruebas en el mismo PR; prueba primero en lo puro; MSW sin simular `fetch`; deterministas** (pedido del coordinador) | Simuladores de red del agregador, el registro, el estado público y los sondeos; nada simula el cliente ni `fetch`; reloj simulado y zonas por parámetro; ninguna prueba toca la red real (D22) | ✅ | ✅ |
| **VII. Cobertura de 80 % en `api`, políticas, esquemas y hooks** (pedido del coordinador) | Los archivos nuevos de esas capas cuentan con el `include` actual de `vite.config.ts` (`src/features/*/{api,policy,schemas,hooks}/**`, `src/shared/api/**`, `src/shared/lib/**`) (D22) | ✅ | ✅ |
| Alcance del producto | En la 1.5.0 no estaban la página, el registro, el estado público ni la comprobación directa. La enmienda MINOR 1.5.0 → 1.6.0 (FR-054), aprobada y aplicada con `/speckit-constitution` el 2026-10-24, los agrega: (5) el registro de componentes monitoreados entre lo que se administra y un párrafo con el monitoreo de salud, como hizo la 007 con el Panel. Integrada en `main` el 2026-10-24 | ❌ | ✅ (v1.6.0) |
| Stack: dependencias mínimas y licencias permisivas | Ninguna dependencia nueva (D23) | ✅ | ✅ |
| Configuración: `VITE_*` validadas al arrancar y documentadas | Las dos variables en `env.ts` con su regla, `.env.example`, el README y `environment.md` de la 001. La identificación del build (versión de `package.json`, `APP_COMMIT_SHA` y `APP_BUILD_DATE`) no es configuración: no cambia el comportamiento. Va por `define`, se valida con Zod al arrancar (`parseBuildInfo`) y se documenta igual, pero un valor ausente o inválido se ve «No disponible» y nunca impide arrancar, como exige FR-045. Si la revisión no acepta esta lectura, se aclara con un PATCH de «Configuración y secretos» (D17, D18) | ✅ | ✅ |
| **Rendimiento: rutas diferidas con `React.lazy`; presupuesto de la ruta de entrada** (pedido del coordinador) | Las cinco páginas y la sección de la pantalla de fallo son diferidas, el Data Grid va con el listado y dos guardas nuevas impiden que `health` llegue a la entrada (D20). **Pero** `main` medía 361,5 KB por la 014 (corregido en `d3ae7f8`) y, aun corregida, el margen esperado (0 a 2 KB) no alcanza para lo que la feature añade a la entrada (unos 4 KB, sobre todo textos). Medida la línea base en 299,7 KB (T001), la enmienda 1.7.0 subió el presupuesto a 320 KB | ❌ | ✅ (v1.7.0) |
| Rendimiento: los listados no renderizan más filas que el `page_size` | `pageOf` con el tamaño elegido (D15) | ✅ | ✅ |
| Observabilidad: `logger` y Error Boundaries | Las rutas tienen `RouteErrorBoundary`; la sección diferida, un `ErrorBoundary` con el fallo de FR-060; sin `console.*` (D9) | ✅ | ✅ |
| Flujo: spec → (clarify) → plan → tasks → implement; documentación en español | Este plan; `/speckit-clarify` no se ejecutó (la spec lista sus decisiones como revisables). La enmienda 1.6.0 se aplicó antes de `/speckit-tasks`, como pide FR-054 | ✅ | ✅ |

**Resultado**: el diseño no deja violaciones sin justificar. El alcance quedó resuelto con la enmienda 1.6.0 y el presupuesto de la ruta de entrada, con la 1.7.0 (320 KB, D20).

Además, dos desvíos registrados en Complexity Tracking: paginar el registro en el navegador (DEBE) y los esquemas Zod a mano (DEBERÍA).

## Lo que necesita aprobación

1. ~~**Enmienda MINOR 1.5.0 → 1.6.0** (FR-054)~~: **aprobada, aplicada con `/speckit-constitution` e integrada en `main` el 2026-10-24**. Agrega al «Alcance del producto» la página «Salud de servicios» (de solo lectura, con actualización periódica), la administración del registro de componentes monitoreados que sirve maily-system-api, el estado público que se muestra cuando no se puede comprobar el acceso y la comprobación directa que lo respalda cuando maily-system-api no responde. Ningún principio cambia: el IV ya cubre la actualización periódica y el VI, el nuevo recurso administrado. El presupuesto del paquete no cambia en ella.
2. ~~**Presupuesto del paquete** (D20)~~: **resuelto el 2026-10-24** con la enmienda 1.7.0 (320 KB gzip), tras medir la línea base en T001. Lo que se propuso:
   - ~~corregir aparte la carga de Roles y permisos~~: hecho en `main` el 2026-10-24 (`d3ae7f8`, `RolesPage` diferida como `6de221e` hizo con Módulos, y `6389891`, el título de su pestaña);
   - ~~medir la línea base en esta rama~~: 299,7 KB gzip (T001, «Notas de implementación»);
   - si el margen no alcanza para la 016, decidir entre una enmienda del presupuesto con la línea base medida (la constitución lo prevé: «ajustable mediante enmienda tras medir la línea base»; iría en una 1.7.0, porque la 1.6.0 ya está integrada) o recuperar margen con una mejora aparte de la entrada. Mi recomendación es la primera, con el valor que dé la medición, y abrir después el estudio de cargar los textos por feature, porque cada feature consume de 1 a 3 KB de textos en la entrada.
3. ~~**Precisión de la cadena en la pantalla de fallo** (D9)~~: **aprobada el 2026-10-24** y aplicada en FR-071, SC-015 y SC-021 de la spec.

## Project Structure

### Documentation (this feature)

```text
specs/016-health-dashboard/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones D1 a D24
├── data-model.md        # Fase 1: DTO → dominio, textos, caché, ciclo y estados
├── quickstart.md        # Fase 1: guía de validación V1 a V16 y verificación de CORS y CSP
├── contracts/
│   ├── health-aggregator.md     # GET /api/v1/health (system-api 005) y reacción a cada respuesta
│   ├── monitored-components.md  # /api/v1/monitored-components: operaciones, forma del 422 y mapeo
│   ├── public-status.md         # GET /health/status, sin credencial
│   ├── health-v1-probes.md      # /health/live y /health/ready en la comprobación directa
│   ├── app-routes.md            # Rutas, pantallas, estados, foco, anuncios y las secciones de respaldo
│   └── environment.md           # VITE_HEALTH_REFRESH_SECONDS, VITE_HEALTH_DIRECT_SERVICES y datos de build
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── config/
│   │   ├── env.ts                          # + VITE_HEALTH_REFRESH_SECONDS y VITE_HEALTH_DIRECT_SERVICES (D17)
│   │   ├── env.test.ts
│   │   ├── buildInfo.ts                    # NUEVO: parseBuildInfo de las constantes de define (D18)
│   │   └── buildInfo.test.ts
│   ├── layouts/
│   │   ├── AppLayout.tsx                   # + useForgetHealthData(!canReadHealth) (D21)
│   │   └── useRouteAccessibility.ts        # + titleKeys de health y componentIdParam (D2)
│   ├── navigation/sections.ts              # + «Salud de servicios», antes de Token
│   ├── providers/
│   │   ├── AppSettingsProvider.tsx         # + healthRefreshMs y backofficeBuild
│   │   └── HttpClientsProvider.tsx         # + healthServices (clientes anónimos) (D4)
│   └── router/
│       ├── ProtectedRoute.tsx              # el caso 'failed' pinta AccessCheckFailedScreen
│       ├── AccessCheckFailedScreen.tsx     # NUEVO: rondas, pausa y hueco de la cadena (D9)
│       ├── routes.tsx                      # + /health y /health/components/*
│       └── health/                         # NUEVO: healthRoutes.tsx (el subárbol /health), las cinco rutas
│                                           # y sus *.integration.test.tsx
├── features/
│   ├── auth/
│   │   ├── components/AccessCheckFailedPage.tsx  # + children (hueco para las secciones)
│   │   ├── hooks/useOperatorAccess.ts            # 'failed' + isChecking
│   │   ├── policy/permissions.ts                 # + 'health' en SECTION_RESOURCES
│   │   ├── policy/healthCapabilities.ts          # NUEVO: getHealthCapabilities
│   │   └── index.ts
│   └── health/                             # NUEVA feature (no importa auth)
│       ├── api/
│       │   ├── healthApi.ts                # getHealthResult, getPublicStatus y sus rutas
│       │   ├── directCheckApi.ts           # sondeos de vida y disponibilidad → filas
│       │   ├── monitoredComponentsApi.ts   # listar, consultar, registrar, modificar y eliminar
│       │   └── monitoredComponentErrors.ts # describeMonitoredComponentError (D16)
│       ├── schemas/                        # healthResult, publicStatus, healthV1, monitoredComponent,
│       │                                   # componentForm, componentsLocation, componentId
│       ├── policy/                         # mapeos de estado, isRefreshDue, startsFallbackChain,
│       │                                   # decideDirectStatus, formatElapsed, formatReturnLine
│       ├── hooks/
│       │   ├── healthKeys.ts
│       │   ├── healthQueries.ts            # queryOptions de cada paso
│       │   ├── useHealthCycle.ts           # el ciclo y la cadena de la página (D6)
│       │   ├── useAccessCheckFallback.ts   # la cadena por rondas (D9)
│       │   ├── fallbackChain.ts            # runFallbackChain: estado público → comprobación directa
│       │   ├── useNow.ts                   # reloj compartido (D13)
│       │   ├── useForgetHealthData.ts
│       │   └── useMonitoredComponent*.ts   # lecturas y mutaciones del registro, y la ubicación del listado
│       ├── components/                     # estado general, componente y detalle, Badge de estado,
│       │                                   # avisos, «Actualizado hace», bloque Backoffice, la barra,
│       │                                   # el aviso de fallo y el resultado de la página (HealthToolbar,
│       │                                   # HealthFailureNotice, HealthResultView), las secciones de
│       │                                   # respaldo (FallbackSections), AccessCheckFallback, grid y formulario
│       ├── pages/                          # HealthPage y las cuatro del registro
│       └── index.ts                        # páginas lazy, AccessCheckFallback lazy y sus marcadores,
│                                           # parseComponentId, useForgetHealthData y tipos
├── shared/
│   ├── api/
│   │   ├── httpClient.ts                   # + anonymous, timeoutMs, probe, createAnonymousHttpClient (D3)
│   │   ├── httpClientsContext.tsx          # + healthServices: NamedHttpClient[]
│   │   └── retry.ts                        # + retryUpTo(max)
│   ├── lib/pageOf.ts                       # MOVIDO desde subscriptions (lo usan dos listados)
│   ├── messages/es.ts                      # messages.health, títulos, menú y reglas de configuración
│   └── ui/iconRegistry.ts                  # + health, refresh y los seis iconos de estado (D12)
├── test/
│   ├── factories.ts                        # + DTOs de salud
│   ├── fetchCalls.ts                       # NUEVO: espía de fetch con el credentials de cada llamada
│   ├── renderApp.tsx, renderWithProviders.tsx  # + variables, ajustes y healthServices
│   └── handlers/
│       ├── healthMonitoring/               # NUEVO: agregador, estado público y registro (D22)
│       └── healthProbes/                   # NUEVO: /health/live y /health/ready de los servicios
└── vite-env.d.ts                           # + las dos variables y las tres constantes de build

scripts/
├── check-entry-size.mjs                    # + guardas de health (D20)
└── check-health-cors.mjs                   # NUEVO: verificación de CORS por ambiente (D19)

e2e/health.spec.ts                          # NUEVO (D22)
vite.config.ts                              # define del build y /proxy/patients opcional
package.json                                # + "version" y el script check:health-cors
eslint.config.js                            # forbidAuthImports('health', …)
.env.example, README.md                     # variables, build, CSP, CORS y fallback de /health
specs/001-auth-session-profile/contracts/environment.md  # filas de las variables nuevas
```

**Structure Decision**: proyecto único en la raíz con la estructura por features de la constitución (I). La feature nueva `src/features/health` lleva el dominio: la página, el registro, el estado público y la comprobación directa, porque comparten esquemas, claves y textos. En `src/app` quedan la composición: las rutas con sus capacidades y ajustes, y la pantalla de acceso fallido con su hueco. Lo genérico que se toca vive en `src/shared` (el cliente HTTP, `pageOf`, los mensajes y los iconos).

### Cobertura de requisitos

| Requisitos | Diseño | Verificación |
|---|---|---|
| FR-001 a FR-005 (acceso y navegación), SC-008 en parte | `SECTION_RESOURCES`, `getHealthCapabilities`, `RequirePermission`, `RequireCapability`, `sections.ts`, títulos y foco (D2) | Unitarias (políticas), integración (menú, títulos, foco, 0 peticiones sin permiso); V1 |
| FR-006 a FR-009 (origen y seguridad), SC-008 | Cliente `subscriptions`; consultas anónimas; destinos solo de configuración; esquemas (D3 a D5) | API (rutas, token solo al origen, sin `Authorization` ni cookies), esquemas; V7, V10, V11 |
| FR-010 a FR-019 (contenido), SC-006 | Mapeos puros, «No disponible», detalle, avisos (D5, D11, D12) | Unitarias (mapeos), componentes con axe, integración; V3 a V5 |
| FR-020 a FR-029 (actualización), SC-004, SC-010 | El ciclo como consulta, `useNow`, caché de sesión (D6, D7, D13, D21) | Hook con reloj simulado y visibilidad, integración (inactividad, cierre de sesión); V6 |
| FR-030 a FR-033 (fallos y permisos) | Resultado «sin permiso», causa del 503, cadena, manejo de sesión (D8) | Hook e integración (403 sin aviso global, 401, 503); V7 |
| FR-034 a FR-043 (registro), SC-002, SC-007 | Listado paginado en el navegador, detalle, formulario, eliminación, mapeo de rechazos (D15, D16) | Unitarias (formulario, mapeo), API, integración con 409, 422 y 404; V2, V8 |
| FR-044 y FR-045 (versión), SC-011 | `define` y `parseBuildInfo` (D18) | Unitarias, componentes; V9 |
| FR-046 a FR-048 (configuración), SC-011 | `env.ts`, `ConfigErrorScreen`, documentación (D17) | `parseEnv`; V12 |
| FR-049 a FR-053 (accesibilidad, textos, calidad), SC-003, SC-005, SC-012 | D12, D14, D20, D22 | axe en cada estado, `npm run size` con guardas, cobertura; V14, V15 |
| FR-054 (gobernanza) | Enmienda 1.6.0, integrada en `main` el 2026-10-24 | Revisión del PR |
| FR-055 a FR-066 (estado público), SC-013 a SC-018 | Consulta anónima, cadena en el ciclo y por rondas, sección y línea de regreso (D3, D6, D9, D11, D13, D14) | Esquema, hook (rondas, pausa, sin repetición), componentes con axe y zonas horarias, integración; V10 |
| FR-067 a FR-078 (comprobación directa), SC-019 a SC-025 | `probe`, destinos, decisión de filas, configuración, CSP y CORS (D3, D4, D6, D7, D9, D10, D17, D19) | Unitarias (`decideDirectStatus`, env), API (`probe` con 503, HTML, red, tiempo), hook, integración, script de CORS; V11 a V13 |
| SC-001 | Una sola consulta con 15 s de límite (D7) | Medición manual en V3: pestaña Red, primera visita de la sesión, en al menos 20 visitas |
| SC-009 y SC-017 | Textos y avisos de D12 y D13 | Revisión con al menos 3 personas que operan el Backoffice (fuera de las pruebas automáticas) |

## Complexity Tracking

> Un desvío de un DEBE (paginación en el servidor), que la spec pidió justificar aquí, y el de un DEBERÍA (tipos desde el OpenAPI), como en la 002, la 003 y la 007.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| El listado del registro descarga la lista completa y la pagina en el navegador (constitución IV: DEBE paginar en el servidor y NO DEBE descargar una colección completa para paginarla en el cliente) | system-api 005 entrega el registro como una lista sin envoltorio y sin paginar, y declara para este catálogo la excepción del principio IV con un máximo esperado de 50 componentes (su FR-023). La spec del Backoffice pide un listado paginado con Data Grid, como Usuarios y Suscripciones (FR-034), y pidió registrar el desvío (restricción 1) | Pedir paginación a system-api: su spec ya la descartó y es un cambio en otro repositorio. Mostrar la lista sin paginar: contradice FR-034 y el patrón común de la constitución VI. Mitigación: una sola consulta por montaje del listado, el grid nunca recibe más filas que el tamaño de página, y si el registro se acerca al límite (system-api lo versionaría como un cambio incompatible), el listado pasa a paginarse en el servidor y el desvío se retira, como en la 003 |
| Esquemas Zod escritos a mano en lugar de derivarlos del OpenAPI (constitución IV: DEBERÍAN derivarse) | Zod es la fuente única de cada entidad (constitución II) y system-api 005 todavía no tiene implementación ni OpenAPI publicado; las formas son sencillas y la tolerancia a valores desconocidos (FR-009) no se expresa en un `enum` del OpenAPI | Generar tipos de TypeScript: sería una segunda fuente de verdad junto a Zod. Generar Zod desde el OpenAPI: añade una dependencia y un paso que necesita el servicio o su repositorio en CI. Mitigación: validación en la frontera, simuladores fieles a [contracts/](contracts/) y la revisión de esos contratos cuando system-api 005 publique los suyos |

## Notas para las tareas

- **Antes de implementar**: la decisión del presupuesto. La enmienda 1.6.0 y la corrección de Roles (`d3ae7f8` y `6389891`) ya están en `main`.
- **Cambios en lo existente que mueven pruebas**:
  - `httpClient.ts` (consultas anónimas, `timeoutMs`, `probe` y `createAnonymousHttpClient`), con prueba primero en `httpClient.test.ts`;
  - `HttpClients.healthServices`: `renderWithProviders.tsx`, `renderApp.tsx` y `HttpClientsProvider.test.tsx` crean la lista;
  - `AppEnv` con las dos variables y `AppSettings` con `healthRefreshMs` y `backofficeBuild`: `renderApp.tsx`, `renderWithProviders.tsx`, `env.test.ts` y `AppSettingsProvider.test.tsx`;
  - `sections.ts` con la entrada nueva: `sections.test.ts`, `sections.token.test.ts` y `sections.roles.test.ts` (orden con Token al final);
  - `AccessCheckFailedPage` con `children` y `useOperatorAccess` con `isChecking`: sus pruebas y `accessFlow.test.tsx`, sin cambiar lo que afirman;
  - `pageOf` pasa a `shared/lib`: se actualiza su importación en `subscriptions`.
- **Trampa de `queryOptions`**: los componentes observan cada paso con las **mismas** opciones y `enabled: false`, no con `skipToken`, para que un observador no reemplace la función ni los reintentos del paso que el ciclo ejecuta.
- **Pruebas de visibilidad y reloj** (lecciones de la 007): `visibilitychange` sobre `window` (o `document` con `bubbles: true`), `focusManager.setFocused(undefined)` al terminar, `defer()` para retener respuestas y vueltas reales al bucle de eventos para afirmar que no se pidió nada.
- **Simulador de usuarios**: el Administrator no recibe `health:*` por defecto; las pruebas de la feature lo conceden.
- **`credentials`**: MSW reconstruye la petición y pierde ese modo, así que `requestLog` guarda solo `authorization`, y `watchFetchCalls` (`src/test/fetchCalls.ts`, un espía de `fetch` que deja pasar la llamada) da el `credentials` de cada una, para las afirmaciones de FR-056 y FR-076 (cambio de la implementación, 2026-10-24).
- **Observado fuera de alcance**: `useRouteAccessibility` no tiene la clave `roles` en su lista, aunque `routes.tsx` la usa (la pestaña de Roles y permisos queda sin título). No se corrige aquí; se reporta.
- **Precisiones que conviene pasar a la spec** (como hizo la 007; T156): el reloj de 24 h en la línea de regreso (D13), que «Actualizar» no se deshabilita (D12) y que un «sin permiso» guardado muestra la carga al volver a entrar (data-model §10). Las de FR-014 (D5) y de la cadena interrumpida (D9) ya se aplicaron.
- **Documentación**: README («Qué hace hoy», variables, «Despliegue» con CSP, CORS, el *fallback* de `/health` y la inyección del build, estructura y pruebas), `.env.example`, `environment.md` de la 001 y una nota en la spec de la 001 y la 006 sobre las secciones nuevas de su pantalla de fallo.

## Preguntas abiertas

1. ~~**Enmienda 1.6.0**~~: aprobada y aplicada el 2026-10-24.
2. ~~**Presupuesto**~~: resuelto el 2026-10-24 con la enmienda 1.7.0 (320 KB gzip).
3. ~~**Cadena interrumpida** (D9)~~: aprobada el 2026-10-24.
4. ~~**Versión inicial del Backoffice**~~: `1.0.0` en `package.json`, confirmada el 2026-10-24.
5. **Coordinación con system-api 005** (su plan está en curso):
   - ~~que el host fuera de `HEALTH_ALLOWED_HOSTS` llegue como `validation_error` con `field: "base_url"`~~: confirmado en su plan ([contracts/monitored-components.md](contracts/monitored-components.md#confirmado-con-el-plan-de-system-api-005));
   - que ningún ambiente suba `HEALTH_CHECK_TIMEOUT_SECONDS` por encima de 4 sin avisar, porque el agregador pasaría de los 15 s del Backoffice;
   - que el estado público con la base detenida responda en ≤ 5 s (SC-013).

## Notas de implementación

Mediciones y decisiones de `/speckit-implement` que afinan lo planeado sin cambiar los requisitos.

### Tamaño del paquete

- **Línea base** (T001, 2026-10-24, rama `016-health-dashboard` desde `678f17b`, que ya trae la corrección de Roles): `npm run build` y `npm run size` dan **299,7 KB gzip** de 300, igual que el CI de `6389891`: `index` 168,5 KB, `useFocusOnMount` 77,7 KB (núcleo de MUI), `Grow` 44,3 KB, `Menu` 6,1 KB, `MenuItem` 1,7 KB y piezas de menos de 1 KB.
- **Margen**: 0,3 KB, frente a los unos 4 KB que la 016 suma a la entrada (research D20). No alcanzaba.
- **Decisión** (2026-10-24, de la persona): enmienda 1.7.0 de la constitución, que sube el presupuesto a **320 KB gzip** con esta línea base; `scripts/check-entry-size.mjs` y el README pasan a 320 KB en el mismo cambio. Recuperar margen difiriendo el menú de perfil, el aviso de inactividad o las notificaciones queda como estudio aparte.
- **Medición con la 016** (T151, 2026-10-25): **306,6 KB gzip** de 320 en la ruta de entrada, con las guardas de T150 en verde (ni `/api/v1/monitored-components` ni `/health/status` están en la entrada, y los dos están en fragmentos diferidos). La 016 suma **6,9 KB** a la entrada, más que los unos 4 KB estimados: los textos de `es.ts` (también los del registro y de las secciones), los iconos, la validación de las dos variables, el `index` de `health` con sus marcadores ligeros, `AccessCheckFailedScreen` y las rutas. Los fragmentos diferidos de `health` suman 18,3 KB gzip: la página 4,6 KB, las secciones de respaldo 4,0 KB (compartidas por las dos pantallas), la sección de la pantalla de fallo 0,6 KB y el registro unos 9 KB (listado 1,8, detalle 1,7, alta 0,8, edición 1,0, formulario 2,1, API 1,1 y hooks 0,7).

### Precisiones de la implementación

- **`fetchQuery` → `queryClient.query`**: en TanStack Query 5.104.4 `fetchQuery` está obsoleto; `query` hace lo mismo para la cadena (lo comprobé en su código).
- **`credentials`**: MSW reconstruye la petición que intercepta y pierde ese modo, así que el registro de solicitudes no lo guarda y `watchFetchCalls` (`src/test/fetchCalls.ts`) lo lee de las llamadas a `fetch` (T030).
- **La pantalla de fallo durante una comprobación**: TanStack Query devuelve a `pending`, sin error, una consulta sin datos mientras vuelve a pedir; `useOperatorAccess` sigue en `failed` (con `isChecking`) mientras `errorUpdatedAt > 0` y no hay datos, para que la pantalla no se desmonte en cada reintento ni en cada recomprobación (T118). Las pruebas de la 001 y la 006 pasan sin cambiar lo que afirman.
- **Formulario del registro**: ninguna regla de `componentFormSchema` usa `abort`, porque Zod 4 saltaría la comprobación de las rutas (que depende del tipo) y no se avisaría junto a cada campo antes de enviar; el formulario muestra el primer error de cada campo.
- **Data Grid vacío**: «Nuevo componente» queda junto al título y no dentro de la cuadrícula, porque axe no admite un enlace como hijo de una `grid`.
- **Validación pendiente**: la de `quickstart.md` (V1 a V16, la verificación de CORS y CSP y la revisión con personas de SC-009 y SC-017) necesita los servicios reales y queda para cuando estén desplegados (T158).

