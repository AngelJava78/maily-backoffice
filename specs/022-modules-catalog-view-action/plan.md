# Implementation Plan: Módulos de suscripción según el catálogo de la API y acción «Ver» editable

**Branch**: `022-modules-catalog-view-action` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/022-modules-catalog-view-action/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Dos frentes, en dos features distintas, sin ningún archivo compartido (research D1):

1. **Suscripciones**: el detalle de una suscripción y la tabla comparativa dejan de recorrer la lista
   fija de nueve módulos (`CLINIC_MODULE_ORDER`, con keys que ya no existen) y pasan a mostrar el
   catálogo vigente de módulos de clínica activos, el mismo que el formulario de alta y edición ya
   consume desde la 021 (`GET /api/v1/modules?type_id=2&status_id=1`), con el mismo esquema de
   carga/error-con-reintento/vacío que `ModulesField` ya usa. Con eso, `clinicModuleCatalog.ts` —que la
   021 dejó vivo a propósito mientras estos dos consumidores lo siguieran necesitando— se borra entero
   (`CLINIC_MODULE_ORDER`, `MODULE_PREREQUISITE`, `ClinicModuleKey`), y el manejo del error 409
   `subscription_module_prerequisite_missing` se retira de `subscriptionErrors.ts`. Los dos simuladores
   de prueba de esta feature (el catálogo de módulos y la validación de la propia API de Suscripciones)
   pasan a validar cada uno contra su propio catálogo simulado de 18 módulos reales, sin ninguna regla
   de dependencia.
2. **Módulos**: la acción «Ver» deja de estar permanentemente marcada y deshabilitada en los paneles de
   alta y edición; se vuelve una casilla más, sujeta a una regla nueva y más laxa (Crear/Modificar/
   Eliminar la requieren; un módulo se puede guardar sin ninguna acción marcada).

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Tres historias, código disjunto** (D1): US1 (detalle/comparativo) y US3 (limpieza de
   dependencias y mocks) viven en `features/subscriptions`; US2 (acción «Ver») vive entera en
   `features/modules`. Solo hay una dependencia de orden dentro de `subscriptions`: US1 debe migrar los
   dos últimos consumidores de `clinicModuleCatalog.ts` antes de que US3 pueda borrarlo.
2. **El detalle y el comparativo se vuelven componentes "tontos"** (D2): reciben el catálogo por props,
   pedido por su página (`SubscriptionDetailPage`, `SubscriptionsListPage`) en paralelo con su propia
   consulta ya existente — mismo patrón que `ModulesField`/`RolesField` (021, research D5) y el mismo
   "en paralelo, no en cascada" que la edición de suscripciones ya usa (021, research D7).
3. **Los estados de carga/error se acotan a la sección de módulos**, no a toda la pantalla (D3): ambas
   pantallas ya muestran el resto de sus datos de forma progresiva; solo la sección de módulos espera
   su propio recurso.
4. **`clinicModuleCatalog.ts` se borra ahora** (D4): la 021 lo dejó pendiente a propósito, documentando
   que estos dos componentes y el simulador de Suscripciones seguían dependiendo de él; esta feature
   migra los tres.
5. **Los dos simuladores de prueba quedan desacoplados entre sí**, cada uno con su propia lista literal
   de los 18 módulos reales (D6), igual que ya lo estaban del simulador de `roles`/`modules` (021,
   research D10).
6. **La acción «Ver» es un cambio mínimo y puntual** (D7): se quita un `disabled`, se cambia un
   `refine` de Zod y su mensaje, y se simplifica un toggle; la confirmación al desmarcar una acción
   existente ya es genérica y no se toca.
7. Piezas nuevas o que cambian: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios.

**Primary Dependencies**: las mismas ya en uso, sin cambios de versión ni dependencias nuevas. TanStack Query (reutiliza `useClinicModulesCatalog` ya existente desde la 021, sin hooks nuevos), Zod (ningún esquema nuevo: `ClinicModule`, `ModuleFormValues` ya existen, solo cambia un `refine`), MUI (los mismos `CircularProgress`/`ErrorState`/`Alert` que `ModulesField` ya usa).

**Storage**: N/A, sin cambios. Ningún estado de servidor nuevo: `clinicModuleKeys.catalog()` ya existe desde la 021 y esta feature solo le agrega dos consumidores (`SubscriptionDetailPage`, `SubscriptionsListPage`).

**Testing**: la infraestructura ya existente (Vitest, Testing Library, user-event, MSW, vitest-axe), sin ningún simulador nuevo: se reescriben los dos ya existentes de `subscriptions` (`subscriptionModulesCatalog.ts`, `subscriptionsCatalog/model.ts`, research D6), sin tocar los de `features/modules` ni `features/roles`. Cobertura mínima de 80 % de líneas en `api`, `schemas`, `policy` y `hooks`, sin cambios de umbral: ningún archivo de esas capas es nuevo, pero `moduleForm.ts` (schemas) y `moduleActionSelection.ts`/`clinicModule.ts`-adjacent (policy) cambian de comportamiento y sus pruebas ya existentes se reescriben. En esta fase no se escriben ni se ejecutan pruebas (se hacen en `/speckit-implement`).

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: el catálogo de módulos de clínica, ya cacheado con `staleTime` de 5 minutos desde la 021, gana dos consumidores más (detalle, comparativo); ambos lo piden en paralelo con su propia consulta ya existente, sin cascada (research D2). Ningún objetivo de rendimiento nuevo; el tamaño propio de esta feature se mide al final de la implementación (presupuesto de 320 KB gzip, constitución).

**Constraints**: dos reglas de negocio se retiran por completo del código de producción y de prueba (dependencias entre módulos de clínica, FR-008/FR-011) y una regla de formulario se reemplaza por una más laxa (la acción «Ver» ya no es obligatoria por sí sola; Crear/Modificar/Eliminar la requieren, FR-015/FR-016). Ninguna regla de negocio nueva aparte de esas dos.

**Scale/Scope**: dos features existentes (`subscriptions`, `modules`), cero rutas nuevas, cero operaciones de API nuevas (la lectura de módulos ya está contratada desde la 014/021; la acción «Ver» usa el mismo endpoint de permisos que ya usan las otras tres acciones). El catálogo simulado de prueba crece de 9 a 18 entradas literales, sin cambiar de forma.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Reutiliza el Constitution Check de la 021
([../021-dynamic-clinic-modules/plan.md](../021-dynamic-clinic-modules/plan.md)) para lo que no cambia;
solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado al iniciar la
investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Una feature no importa los internos de otra | Sin cambios: `SubscriptionDetailFields`/`SubscriptionsComparisonTable` siguen dentro de `features/subscriptions`, consumiendo su propio `schemas/clinicModule.ts`/`hooks/useClinicModulesCatalog.ts` ya existentes; la acción «Ver» no toca ningún límite de importación | ✅ | ✅ |
| I. Componentes pequeños, de responsabilidad única | `SubscriptionDetailFields`/`SubscriptionsComparisonTable` reciben el catálogo como props, sin pedirlo ellos mismos (research D2), igual que `ModulesField` ya hace | ✅ | ✅ |
| I. Archivo de componente ≤ 250 líneas | `SubscriptionDetailFields.tsx` (177 líneas) y `SubscriptionsComparisonTable.tsx` (221 líneas) ganan cuatro props y un estado de carga/error dentro de su sección de módulos, no lógica nueva extensa; `SubscriptionsComparisonTable.tsx` es el de margen más ajustado (ver Structure Decision) | ✅ | ✅ |
| II. Sin `any`/`as`; sin nuevo catálogo fijo tipado en compilación | `clinicModuleCatalog.ts` (y su tipo `ClinicModuleKey`, una unión cerrada) se borra; ningún tipo nuevo lo sustituye, `ClinicModule`/`string` ya cubren lo que falta (research D4) | ✅ | ✅ |
| III. Estado de servidor con TanStack Query, con factoría de keys propia | Sin cambios: `useClinicModulesCatalog`/`clinicModuleKeys` ya existen desde la 021; esta feature solo agrega dos llamadas más al mismo hook | ✅ | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | Las dependencias entre módulos de clínica, la última regla de negocio que el frontend todavía duplicaba del backend para esto, se retira por completo (research D4, D5, D6) | ✅ | ✅ |
| VI. Toda pantalla que dependa de datos remotos implementa carga/vacío/error/éxito | El detalle y el comparativo ganan los mismos tres estados que `ModulesField` ya tiene, acotados a su sección de módulos (research D3) | ✅ | ✅ |
| VI. Textos en español, centralizados | `subscriptions.modules.catalog`/`.requires` se borran (sin consumidores); `subscriptions.errors.fields.moduleKeys` pierde una cláusula; un texto nuevo para un `key` "(no disponible)"; `modules.validation.actionsReadRequired` se reemplaza por un mensaje de grupo nuevo (research D5, D7) | ✅ | ✅ |
| VII. Pruebas sin mockear `fetch`; MSW a nivel de red | Los dos simuladores ya existentes de `subscriptions` se reescriben con datos literales nuevos, mismo mecanismo (`http.get`/`http.post` de MSW); ningún simulador nuevo (research D6) | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | `moduleForm.ts` (schemas) y `moduleActionSelection.ts` (policy) cambian de comportamiento con pruebas ya existentes que se reescriben, sin bajar su cobertura actual | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración
por entorno, paginación en servidor, rendimiento, accesibilidad, flujo de desarrollo): sin cambios
respecto de la 021/020, que ya las cumplían, y esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No hay ningún desvío nuevo de
la constitución que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/022-modules-catalog-view-action/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera `contracts/`: ningún endpoint nuevo. `GET /api/v1/modules?type_id=2&status_id=1` ya está
documentado en [../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md);
la creación/eliminación del permiso `<key>:read` usa el mismo contrato de permisos que ya usan las
otras tres acciones de `features/modules` (sin contrato nuevo que escribir).

### Source Code (repository root)

Solo lo que esta feature agrega o cambia sobre la estructura de la 021
([../021-dynamic-clinic-modules/plan.md](../021-dynamic-clinic-modules/plan.md)), que sigue vigente en
todo lo que no se lista aquí.

```text
src/
├── features/
│   ├── subscriptions/
│   │   ├── schemas/
│   │   │   └── clinicModuleCatalog.ts        # SE BORRA (+ su .test.ts), research D4
│   │   ├── api/
│   │   │   └── subscriptionErrors.ts         # - case 'subscription_module_prerequisite_missing'
│   │   └── components/
│   │       ├── SubscriptionDetailFields.tsx  # + props modules/loading/loadFailed/onRetry (D2, D3)
│   │       ├── SubscriptionDetailPage.tsx    # + useClinicModulesCatalog en paralelo (D2)
│   │       ├── SubscriptionsComparisonTable.tsx  # + props modules/modulesLoading/
│   │       │                                 #   modulesLoadFailed/onModulesRetry (D2, D3)
│   │       └── SubscriptionsListPage.tsx     # + useClinicModulesCatalog (D2)
│   └── modules/
│       ├── schemas/
│       │   ├── moduleActionCatalog.ts        # - REQUIRED_ACTION_KEY (D7)
│       │   └── moduleForm.ts                 # refine nuevo: Crear/Modificar/Eliminar requieren Ver
│       │                                     #   (FR-015); Set vacío ya válido (FR-016)
│       ├── policy/
│       │   └── moduleActionSelection.ts      # withActionChecked: toggle plano, sin caso especial
│       └── components/
│           └── ModuleFormFields.tsx          # casilla de «Ver» ya no disabled; muestra
│                                             #   errors.actions?.message (D7)
├── shared/
│   └── messages/es.ts                        # - subscriptions.modules.{catalog,requires};
│                                             #   subscriptions.errors.fields.moduleKeys (texto
│                                             #   más corto); + texto "(no disponible)"; -
│                                             #   modules.validation.actionsReadRequired; + mensaje
│                                             #   de grupo de FR-015
src/test/handlers/
├── subscriptionModulesCatalog.ts             # DEFAULT_CLINIC_MODULES: 18 módulos literales (D6)
└── subscriptionsCatalog/model.ts             # KNOWN_MODULE_KEYS: 18 módulos literales, propios;
                                             #   se borra el bloque de MODULE_PREREQUISITE (D6)
e2e/subscriptions.spec.ts, e2e/modules.spec.ts  # revisados, sin cambios esperados (D8)
```

No se tocan: `ModuleEditPanel.tsx`, `ModuleCreatePanel.tsx`, `ModuleDangerZone.tsx`,
`useCreateModule.ts`/`useUpdateModule.ts`, `moduleErrors.ts`/`applyModuleRefusal.ts` (research D7);
`features/roles` entero (fuera de alcance del spec); `ModulesField.tsx`/`SubscriptionFormFields.tsx`/
`SubscriptionPreviewPanel.tsx`/`SubscriptionCreatePage.tsx`/`SubscriptionEditPage.tsx` (ya migrados al
catálogo dinámico desde la 021, sin cambios adicionales que esta feature necesite).

**Structure Decision**: se mantiene la estructura por features ya vigente (`app → features → shared`).
Todo lo nuevo vive dentro de `features/subscriptions`, `features/modules` o `src/test/handlers`
(infraestructura de prueba); ningún archivo nuevo en `app` ni rutas nuevas.
`SubscriptionsComparisonTable.tsx` (221 líneas antes de esta feature) es el archivo con el margen más
ajustado frente al límite de 250 líneas: si agregar la fila de carga/error de la sección de módulos lo
supera, la fila se extrae a su propio componente pequeño (p. ej. `ModulesSectionRows`) dentro del mismo
archivo de componentes, sin que eso cambie ningún requisito de este plan.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: el Constitution Check no encontró desvíos nuevos, antes ni después
del diseño.
