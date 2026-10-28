# Implementation Plan: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Branch**: `020-subscriptions-ui-improvements` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-subscriptions-ui-improvements/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cuatro cambios de presentación sobre pantallas ya existentes (001 a 019), ninguno con dato nuevo ni llamada nueva a la API (research D8): (1) el límite de clínicas se muda, dentro del formulario de alta/edición, al final, agrupado con los demás límites de la clínica bajo un nuevo título «Límites»; (2) el listado de suscripciones agrega las columnas Tipo, Consultorios y Precio anual, en el orden Nombre/Tipo/Clínicas/Consultorios/Precio mensual/Precio anual/Estatus, ordenado de menor a mayor precio mensual al abrirse y reordenable por cualquier columna; (3) el Comparativo agrega un filtro por tipo de suscripción (Individual/Empresarial), antes del control «Mensual y Anual» ya existente, que también reordena los planes de menor a mayor precio del ciclo vigente; (4) el Comparativo muestra el límite de clínicas en «Límites de la clínica» y reemplaza el texto «Incluido»/«No incluido» de Módulos por iconos con su nombre accesible.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **El listado necesita reactivar un ordenamiento que hoy está apagado** (D1): `SubscriptionsGrid` tiene `disableColumnSorting`, con una prueba que fija ese comportamiento; el spec exige poder reordenar por cualquier columna, así que se quita.
2. **El orden del listado y el filtro de tipo del Comparativo viven en la URL; el ciclo de precio, no** (D2, D3): `SubscriptionsLocation` gana `sort` y `comparisonType`, con el mismo patrón ya usado por `page`/`pageSize`/`tab` y por los filtros de `modulesLocation.ts`; el ciclo Mensual/Anual se queda como `useState`, porque el spec lo mantiene sin cambios y no excluye filas (no es un «filtro» en el sentido de la constitución III).
3. **El límite de clínicas es una fila propia del Comparativo, no un quinto elemento de `LIMIT_FIELDS`** (D4): ese arreglo asume cuatro campos siempre numéricos; el límite de clínicas es `number | null`.
4. **Los iconos de Módulos reutilizan el texto ya existente como nombre accesible** (D5), con dos claves nuevas en `iconRegistry` en vez de reusar las de salud de servicios (D6).
5. **Los precios se ordenan con `toCents()`**, ya escrito y probado en este mismo repositorio exactamente para comparar y ordenar precios (D7), separando el valor de orden del texto de presentación en las columnas numéricas (D10).
6. **Piezas nuevas o que cambian**: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios.

**Primary Dependencies**: las mismas ya en uso, sin cambios de versión ni dependencias nuevas. `@mui/x-data-grid` 9.15.0 (`sortingMode`, `sortModel`, `sortingOrder`, ya parte de la librería, solo sin usar hoy en esta grilla), `ToggleButtonGroup`/`ToggleButton` de `@mui/material` (ya en uso por `PriceCycleToggle`) y `lucide-react` 1.61.0 (ya la única fuente de iconos, `iconRegistry.ts`, research D6).

**Storage**: N/A, sin cambios: todo el dato ya vive en TanStack Query (`useSubscriptionCatalog`, una sola consulta compartida por el listado y el Comparativo, 018). El orden del listado y el filtro de tipo del Comparativo son estado navegable nuevo en la URL (`SubscriptionsLocation`, research D2/D3), no estado de servidor.

**Testing**: la infraestructura de la 001 a la 019 (Vitest, Testing Library, user-event, MSW, vitest-axe, Playwright), sin ampliación del simulador de la API (research D8: no hay contrato nuevo que simular). Cobertura mínima de 80 % de líneas en `api`, `schemas` y `shared/api|lib`, sin cambios: `schemas/subscriptionsSort.ts` (nuevo, puro) y `schemas/subscriptionsLocation.ts` (amplía su cobertura ya exigida). En esta fase no se escriben ni se ejecutan pruebas (spec, Assumptions): se hacen en `/speckit-implement`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px sin desplazamiento horizontal de la página (el listado, con tres columnas más, sí puede necesitar desplazamiento horizontal dentro de la propia grilla, spec → Edge Cases), sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: cambiar el filtro de tipo o el ciclo de precio del Comparativo, o el orden del listado, se resuelve sin ninguna recarga ni petición nueva (SC-003, SC-006; research D8: todo el dato ya está en el cliente). El resto de los objetivos de rendimiento ya vigentes no cambian, salvo el tamaño propio de esta feature, que se mide al final de la implementación (presupuesto de 320 KB gzip, constitución).

**Constraints**: ninguna regla de negocio nueva (spec, Assumptions): esta feature no valida, no rechaza y no persiste nada que no hiciera ya alguna de las features 003/012/018/019. La única restricción nueva es de presentación: las siete columnas del listado en el orden exacto de FR-004, y el filtro de tipo antes que «Mensual y Anual» en el Comparativo (FR-007).

**Scale/Scope**: mismo catálogo de unas decenas de suscripciones (003/012/018/019). Reorganiza tres pantallas ya existentes (alta/edición, listado, Comparativo); cero rutas y cero operaciones de API nuevas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Reutiliza el Constitution Check de la 019 ([../019-add-clinics-limit/plan.md](../019-add-clinics-limit/plan.md)) para lo que no cambia; solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado al iniciar la investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes pequeños, de responsabilidad única | `ComparisonTypeFilter` es un componente propio, del mismo tamaño y forma que `PriceCycleToggle` (research D3); el orden y el filtro se calculan con funciones puras (`sortSubscriptions`/`sortByCyclePrice`, `schemas/subscriptionsSort.ts`), no dentro de los componentes de presentación | ✅ | ✅ |
| I. `useEffect` solo para sincronizar con sistemas externos | El orden y el filtro del Comparativo se derivan en cada render a partir de `location`/`cycle` (puro); ningún `useEffect` nuevo reacciona a esos cambios | ✅ | ✅ |
| III. Estado navegable de los listados en la URL | `sort` (listado) y `comparisonType` (Comparativo) se agregan a `SubscriptionsLocation`, con el mismo patrón que `page`/`pageSize`/`tab` y que los filtros de `modulesLocation.ts` (research D2, D3); el ciclo de precio se queda fuera de la URL porque no es un filtro (no excluye filas) y el spec lo mantiene sin cambios | ⚠️ (el listado no tenía orden interactivo en absoluto) | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | No se agrega ninguna regla de negocio: el filtro de tipo y el orden son presentación pura sobre datos ya validados por el esquema de 003/012/018/019 (research D8) | ✅ | ✅ |
| VI. MUI, sin dependencias nuevas | `DataGrid` (orden ya soportado por la librería, solo sin usar), `ToggleButtonGroup`/`ToggleButton` (ya en uso), `lucide-react` (ya en uso) | ✅ | ✅ |
| VI. WCAG 2.1 AA | Los iconos de Módulos llevan `accessibleName` con el mismo texto que ya se anunciaba como texto visible (research D5); `ComparisonTypeFilter` sigue el mismo patrón de `ToggleButtonGroup` accesible ya validado en `PriceCycleToggle` | ✅ | ✅ |
| VI. Textos en español, centralizados | Cinco claves nuevas en `shared/messages/es.ts` (`list.columns.subscriptionType/consultingRoomsLimit/annualPrice`, `comparison.sections.clinicsLimit`, `comparison.emptyForType`); el resto reutiliza texto ya existente sin duplicarlo (research D5, catálogo de tipos) | ✅ | ✅ |
| VII. Pirámide de pruebas; sin mock de `fetch` | Sin cambios de mecanismo: MSW sigue simulando la única consulta que ya existía (`useSubscriptionCatalog`); nada nuevo que simular (research D8) | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración por entorno, paginación en servidor, rendimiento, flujo de desarrollo): sin cambios respecto de la 019, que ya las cumplía, y esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. El único desvío de la constitución que sigue vigente (IV: el listado descarga el catálogo completo y lo pagina en el cliente, justificado desde la 003) se extiende de forma natural a que el nuevo orden también se calcule en el cliente antes de paginar (research D2): es la misma situación ya aceptada (catálogo pequeño, cargado una sola vez), no un desvío nuevo.

## Project Structure

### Documentation (this feature)

```text
specs/020-subscriptions-ui-improvements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera `contracts/`: esta feature no agrega, cambia ni repite ninguna llamada a la API de suscripciones (research D8); los contratos ya documentados en `../019-add-clinics-limit/contracts/subscriptions-service.md` y en los de las features 003/012/018 siguen vigentes sin cambio.

### Source Code (repository root)

Solo lo que esta feature agrega o cambia sobre la estructura de la 019 ([../019-add-clinics-limit/plan.md](../019-add-clinics-limit/plan.md)), que sigue vigente en todo lo que no se lista aquí: rutas, navegación, capacidades, cliente HTTP, detalle, alta/edición salvo lo que sigue, y el resto de `shared`.

```text
src/
├── features/
│   └── subscriptions/
│       ├── components/
│       │   ├── SubscriptionFormFields.tsx         # ClinicsLimitField se mueve al final, dentro del
│       │   │                                       #   Stack de ClinicLimitsFields; + título «Límites»
│       │   ├── SubscriptionsGrid.tsx               # + columnas subscriptionType, consultingRoomsLimit,
│       │   │                                       #   annualPrice; quita disableColumnSorting; + props
│       │   │                                       #   sort/onSortChange (D1, D2, D10)
│       │   ├── SubscriptionsListPage.tsx           # listPanel(): ordena antes de pageOf (D2); comparisonPanel():
│       │   │                                       #   filtra por tipo y ordena por ciclo (D3, D4); agrega
│       │   │                                       #   ComparisonTypeFilter antes de PriceCycleToggle
│       │   ├── SubscriptionsComparisonTable.tsx    # + fila «Límite de clínicas» (D4); iconos en vez de
│       │   │                                       #   texto en Módulos (D5)
│       │   └── ComparisonTypeFilter.tsx            # NUEVO: mismo patrón que PriceCycleToggle (D3)
│       └── schemas/
│           └── subscriptionsLocation.ts            # + sort, comparisonType, SubscriptionsSort,
│                                                    #   SubscriptionsSortField (D2, D3)
│           └── subscriptionsSort.ts                # NUEVO: sortSubscriptions, sortByCyclePrice (D7, D10)
│       └── hooks/
│           └── useSubscriptionsLocation.ts         # + setSort (regresa a página 1, D9), setComparisonType
├── shared/
│   ├── ui/
│   │   └── iconRegistry.ts                         # + included (Check), not-included (X) (D6)
│   └── messages/es.ts                              # + list.columns.subscriptionType/consultingRoomsLimit/
│                                                    #   annualPrice, form.fields.limits, comparison.sections.
│                                                    #   clinicsLimit, comparison.emptyForType
e2e/subscriptions.spec.ts                            # revisa si el recorrido del listado/Comparativo necesita
                                                      #   las columnas/el filtro nuevos
```

**Structure Decision**: se mantiene exactamente la estructura por features de la 019 (`app → features → shared`). No hay piezas nuevas en `app` (sin rutas, sin capacidades nuevas) ni en `shared` más allá de un archivo de iconos y de texto: todo lo nuevo vive dentro de `features/subscriptions`. Dos archivos nuevos (`ComparisonTypeFilter.tsx`, `subscriptionsSort.ts`), ninguno comparte archivo con uno ya existente de otra feature. `SubscriptionsComparisonTable.tsx` (207 líneas antes de esta feature) es el archivo con más margen más ajustado frente al límite de 250 líneas de la constitución: si los cambios de esta feature lo superan, la fila nueva y el cambio de iconos de Módulos se extraen a sub-componentes propios (p. ej. `ComparisonLimitsSection`/`ComparisonModulesSection`) en `/speckit-implement`, sin que eso cambie ningún requisito de este plan.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación nueva que justificar. El único desvío de la constitución que sigue vigente (IV: el listado descarga el catálogo completo y lo pagina en el cliente) ya está justificado en el Complexity Tracking de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)); esta feature solo agrega que el nuevo orden del listado también se calcula en el cliente antes de paginar, cubierto por la misma justificación (catálogo pequeño, cargado una sola vez, research D2).
