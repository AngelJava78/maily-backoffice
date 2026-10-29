# Implementation Plan: Catálogo dinámico de módulos de clínica en alta y edición de suscripciones

**Branch**: `021-dynamic-clinic-modules` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/021-dynamic-clinic-modules/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

El alta y la edición de suscripciones dejan de ofrecer una lista fija de nueve módulos de clínica
escrita en el código del Backoffice: la sección de módulos incluidos pasa a pedir el catálogo vigente
de módulos de clínica activos a `GET /api/v1/modules?type_id=2&status_id=1` (MailySoft Usuarios, el
mismo endpoint que ya consumen «Módulos» y «Roles y permisos»), mostrarlo en el orden que ya garantiza
ese contrato (`sort_order`) y enviar, al guardar, exactamente las keys que quedaron marcadas. Las dos
reglas de negocio que antes vivían en el frontend se resolvieron distinto en `/speckit-clarify`: las
dependencias entre módulos se retiran (ya no hay ninguna), pero «Pacientes» (key `patients`) conserva
su trato especial —siempre marcado, nunca removible— ahora evaluado contra el catálogo vigente en vez
de contra la lista fija.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **El endpoint ya está documentado** (D1): esta feature es un segundo consumidor de
   `GET /modules?type_id=1|2&status_id=1`, ya contratado en
   [../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md).
   Capa `api`/`schemas`/`hooks` propia de `features/subscriptions` (D2), sin importar de `features/
   roles` ni `features/modules` (constitución I).
2. **El catálogo fijo (`clinicModuleCatalog.ts`) no se borra** (D3, hallazgo de esta investigación): el
   Comparativo (020), el detalle de una suscripción y el simulador MSW de la propia API de Suscripciones
   siguen dependiendo de él, y el spec los deja fuera de alcance. Solo el formulario deja de consumirlo.
3. **Una única función pura, `resolveModuleSelection`** (D4), decide tanto qué aparece marcado como qué
   se guarda: quita keys que ya no están en el catálogo vigente (FR-009) y fuerza `patients` si el
   catálogo la trae (FR-007, Clarifications).
4. **`ModulesField` deja de pedir datos: replica el patrón ya existente de `RolesField`/
   `useRolesCatalog`/`UserCreatePage`** (D5) en `features/users`, incluido el prop `saveDisabled` de
   `FormFrame`, que ya existía para exactamente este caso.
5. **`SubscriptionPreviewPanel` entra en alcance** (D6, hallazgo de esta investigación): no es una
   pantalla de solo lectura aparte, es el espejo en vivo del propio formulario de alta.
6. **El catálogo de módulos se pide en paralelo con la suscripción, no en cascada**, en la edición (D7).
7. Piezas nuevas o que cambian: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios.

**Primary Dependencies**: las mismas ya en uso, sin cambios de versión ni dependencias nuevas. Zod (un esquema nuevo, lean, `schemas/clinicModule.ts`), TanStack Query (un hook de catálogo nuevo, mismo patrón que `useRolesCatalog`/`useModulesCatalog` de `roles`), MUI (`CircularProgress`, `Alert`, los mismos ya en uso por `RolesField`/`ErrorState`).

**Storage**: N/A, sin cambios. El catálogo de módulos de clínica es estado de servidor nuevo (TanStack Query, `clinicModuleKeys.catalog()`), con `staleTime` de 5 minutos (mismo valor que `useRolesCatalog`/`useModulesCatalog` de `roles`, research: Assumptions del spec). No es estado navegable de la URL (constitución III): no es un listado paginado/filtrable, es el catálogo de opciones de un campo de formulario.

**Testing**: la infraestructura ya existente (Vitest, Testing Library, user-event, MSW, vitest-axe), más un simulador MSW nuevo y propio de esta feature (`src/test/handlers/subscriptionModulesCatalog.ts`, research D10): ningún simulador ya existente (`modulesCatalog/` de `features/modules`, `rolesCatalog/` de `features/roles`) se reutiliza, siguiendo el patrón ya establecido de que cada feature simula sus propias dependencias externas. Cobertura mínima de 80 % de líneas en `api`, `schemas`, `policy` y `hooks`, sin cambios de umbral: los archivos nuevos (`schemas/clinicModule.ts`, `api/clinicModulesApi.ts`, `hooks/useClinicModulesCatalog.ts`, `hooks/clinicModuleKeys.ts`, `policy/clinicModuleSelection.ts`) son los que exige ese umbral. En esta fase no se escriben ni se ejecutan pruebas (se hacen en `/speckit-implement`).

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: el catálogo de módulos se pide una vez por apertura de pantalla (alta o edición), en paralelo con la propia suscripción en la edición (research D7, sin cascada); sin repetición automática mientras la pantalla sigue abierta (Assumptions del spec). El resto de los objetivos de rendimiento ya vigentes no cambian, salvo el tamaño propio de esta feature, medido al final de la implementación (presupuesto de 320 KB gzip, constitución).

**Constraints**: dos reglas de negocio que antes vivían fijas en el frontend cambian de fuente o se retiran (Clarifications, research D3/D4): las dependencias entre módulos se eliminan por completo; «Pacientes» conserva su regla, ahora evaluada contra el catálogo vigente. Ninguna otra regla de negocio nueva: el resto de la validación y el guardado de la suscripción no cambian (research D11).

**Scale/Scope**: el catálogo de módulos de clínica es chico (una decena de filas, como el propio ejemplo del spec y el catálogo ya sembrado para 013/014 sugieren), igual de acotado que los catálogos de roles/usuarios/clínicas ya cargados enteros en otras pantallas de este mismo Backoffice. Dos pantallas ya existentes (alta y edición de suscripciones) más un tercer componente ya existente que las acompaña (la Vista previa del alta); cero rutas nuevas, una operación de API nueva (una lectura, ya contratada por otra feature).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Reutiliza el Constitution Check de la 020
([../020-subscriptions-ui-improvements/plan.md](../020-subscriptions-ui-improvements/plan.md)) para lo
que no cambia; solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado
al iniciar la investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Una feature no importa los internos de otra | `schemas/clinicModule.ts`/`api/clinicModulesApi.ts`/`hooks/useClinicModulesCatalog.ts` son copias propias de `features/subscriptions`, igual que `features/roles` ya hizo para este mismo endpoint, en vez de importar `features/roles` o `features/modules` (research D2) | ✅ | ✅ |
| I. Componentes pequeños, de responsabilidad única | `resolveModuleSelection` (una función pura, `policy/clinicModuleSelection.ts`) concentra la única regla de negocio que queda; `ModulesField`/`SubscriptionPreviewPanel` reciben el catálogo como prop, sin pedirlo ellos mismos (research D5, D6), igual que `RolesField` | ✅ | ✅ |
| I. Archivo de componente ≤ 250 líneas | Los cinco componentes que cambian (`ModulesField` 101, `SubscriptionFormFields` 135, `SubscriptionCreatePage` 125, `SubscriptionPreviewPanel` 117, `SubscriptionEditPage` 193 líneas antes de esta feature) ganan props y una función pura ya escrita en otro archivo, no lógica nueva embebida; `SubscriptionEditPage` es el de margen más ajustado (ver Structure Decision) | ✅ | ✅ |
| II. Datos validados en la frontera con Zod | `schemas/clinicModule.ts`: un esquema nuevo, DTO→dominio, que descarta del DTO real lo que esta feature no usa (`id`, `created_at`, `status`, `type`, `active_permissions_count`), igual que ya hace `roles/schemas/module.ts` con otro subconjunto (research D2) | ✅ | ✅ |
| II. Sin `any`/`as`; `moduleKeys` deja de ser una unión cerrada | `SubscriptionFormValues.moduleKeys`: `ReadonlySet<ClinicModuleKey>` → `ReadonlySet<string>` (research D11): ya no hay un catálogo fijo que tipar en compilación; sin aserciones nuevas | ✅ | ✅ |
| III. Estado de servidor con TanStack Query, con factoría de keys propia | `useClinicModulesCatalog` + `hooks/clinicModuleKeys.ts` (`clinicModuleKeys.catalog()`), mismo patrón que `useRolesCatalog`/`roleKeys`/`modulesCatalogKeys` | ✅ | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | Las dependencias entre módulos se retiran del frontend (ya no se duplica esa regla ahí); «Pacientes» es la única que el frontend sigue imponiendo, por decisión explícita de Clarifications, no porque el frontend decida solo qué es autoritativo | ✅ | ✅ |
| VI. Toda pantalla que dependa de datos remotos implementa carga/vacío/error/éxito | `ModulesField` (D5): `ErrorState` con reintento, `Alert` de catálogo vacío, indicador de carga, igual que `RolesField`; `FormFrame.saveDisabled` (ya existente, sin cambios) bloquea Guardar en los tres casos | ✅ | ✅ |
| VI. Textos en español, centralizados | `subscriptions.modules.loadError.{title,message}`, `subscriptions.modules.empty` (nuevos, mismo patrón que `users.form.rolesLoadError`/`rolesEmpty`); `subscriptions.modules.marked` gana un segundo parámetro (`total`) para dejar de mentir con un «de 9» fijo (research D8); `subscriptions.modules.catalog`/`.requires` no se tocan (D3, D9: siguen vivos para el Comparativo y el detalle) | ✅ | ✅ |
| VII. Pruebas sin mockear `fetch`; MSW a nivel de red | Simulador nuevo y propio, `src/test/handlers/subscriptionModulesCatalog.ts` (research D10), mismo patrón que `createUsersServiceMock`; `ModulesField`/`SubscriptionFormFields`/`SubscriptionPreviewPanel` reciben el catálogo por props, así que sus pruebas de componente no necesitan MSW (igual que `RolesField.test.tsx`) | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración
por entorno, paginación en servidor, rendimiento, flujo de desarrollo): sin cambios respecto de la 020,
que ya las cumplía, y esta feature no introduce nada que las afecte — el cliente `users` ya existe y ya
se usa para este mismo endpoint desde `features/roles`.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No hay ningún desvío nuevo de
la constitución que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/021-dynamic-clinic-modules/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera `contracts/`: el endpoint que esta feature consume ya está documentado en
[../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md)
(research D1); esta feature es un segundo consumidor, no un contrato nuevo.

### Source Code (repository root)

Solo lo que esta feature agrega o cambia sobre la estructura de la 020
([../020-subscriptions-ui-improvements/plan.md](../020-subscriptions-ui-improvements/plan.md)), que
sigue vigente en todo lo que no se lista aquí: rutas, navegación, capacidades, cliente HTTP, el
Comparativo, el detalle, el listado y el resto de `shared`.

```text
src/
├── features/
│   └── subscriptions/
│       ├── schemas/
│       │   ├── clinicModule.ts              # NUEVO: ClinicModule, clinicModuleSchema/sSchema,
│       │   │                                 #   REQUIRED_MODULE_KEY (D2, D3)
│       │   └── subscriptionForm.ts           # moduleKeysSchema: string (no ClinicModuleKey);
│       │                                     #   toFormValues ya no filtra contra CLINIC_MODULE_ORDER
│       │                                     #   (D7, D11)
│       ├── api/
│       │   └── clinicModulesApi.ts           # NUEVO: listClinicModules (D1, D2)
│       ├── hooks/
│       │   ├── clinicModuleKeys.ts           # NUEVO: factoría de query keys (D2)
│       │   └── useClinicModulesCatalog.ts    # NUEVO (D2)
│       ├── policy/
│       │   └── clinicModuleSelection.ts      # NUEVO: resolveModuleSelection, reemplaza a
│       │                                     #   moduleSelection.ts, que se borra (D3, D4)
│       └── components/
│           ├── ModulesField.tsx              # deja de pedir CLINIC_MODULE_ORDER; nuevos props
│           │                                 #   modules/loading/loadFailed/onRetry (D5, D8)
│           ├── SubscriptionFormFields.tsx    # + prop clinicModules, lo pasa a ModulesField
│           ├── SubscriptionPreviewPanel.tsx  # + prop modules, deja de iterar CLINIC_MODULE_ORDER
│           │                                 #   (D6)
│           ├── SubscriptionCreatePage.tsx    # useClinicModulesCatalog, saveDisabled, resuelve
│           │                                 #   moduleKeys antes de guardar (D11)
│           └── SubscriptionEditPage.tsx      # useClinicModulesCatalog en paralelo con
│                                             #   useSubscription (D7); mismo cableo que el alta
├── shared/
│   └── messages/es.ts                        # modules.marked gana `total` (D8); + modules.
│                                             #   loadError/.empty (D9); modules.catalog/.requires
│                                             #   sin cambios (D3)
src/test/handlers/
└── subscriptionModulesCatalog.ts              # NUEVO: simulador propio de GET /modules para esta
                                                #   feature (D10)
e2e/subscriptions.spec.ts                      # revisado, sin cambios esperados (D12)
```

No se tocan (research D3): `schemas/clinicModuleCatalog.ts`, `SubscriptionsComparisonTable.tsx`,
`SubscriptionDetailFields.tsx`, `src/test/handlers/subscriptionsCatalog/model.ts`. Se borran:
`policy/moduleSelection.ts` y su prueba (D3, D4).

**Structure Decision**: se mantiene la estructura por features ya vigente (`app → features → shared`).
Todo lo nuevo vive dentro de `features/subscriptions` (ningún archivo nuevo en `app` ni rutas nuevas) o
en `src/test/handlers` (infraestructura de prueba, no producción). `SubscriptionEditPage.tsx` (193
líneas antes de esta feature) es el archivo con el margen más ajustado frente al límite de 250 líneas
de la constitución: si sumar `useClinicModulesCatalog`, el cableo del prop nuevo y la resolución al
guardar lo superan, `EditSubscriptionForm` (la función interna que ya existe en ese mismo archivo) se
extrae a su propio archivo en `/speckit-implement`, sin que eso cambie ningún requisito de este plan.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: el Constitution Check no encontró desvíos nuevos, antes ni después
del diseño.
