# Implementation Plan: Planes de suscripción: precio anual, módulos, límites y comparativo

**Branch**: `012-configure-subscription-plans` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-configure-subscription-plans/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Pone al día la sección Suscripciones (feature 003) con el contrato vigente de la API de suscripciones, que desde entonces agregó precio anual, días de prueba, autoconsumo, módulos de clínica incluidos y los cuatro límites de la clínica, y retiró `features` en favor de `other_features`. El formulario compartido de alta y edición gana esos campos, con un panel de vista previa en vivo; el detalle los muestra; y el listado gana una segunda pestaña, «Comparativo», con una matriz de los planes vigentes lado a lado. Ninguna ruta, permiso ni acción (crear, editar, cambiar estatus, eliminar) cambia: sigue siendo exactamente el patrón de la 003.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas** (D1): `Switch`, `ToggleButtonGroup`, `Checkbox` y `Table` de `@mui/material`, que ya están en el proyecto.
2. **`features` → `otherFeatures`**: se renombra en el mismo cambio que agrega el resto de los campos, porque la API ya no acepta el nombre anterior (D2).
3. **Catálogo fijo de nueve módulos de clínica** (`clinicModuleCatalog.ts`) con sus cuatro dependencias, como contenido del frontend y no como una llamada a la API de usuarios (D3); una función pura (`withModuleChecked`) arrastra el requisito al marcar un dependiente y lo retira en cascada al desmarcarlo (D4), para que el formulario nunca intente guardar una combinación que la API rechazaría.
4. **Ahorro anual**: función pura `computeAnnualSavings` (D5), verificada contra los cuatro planes de ejemplo de los mockups.
5. **Comparativo**: una pestaña más de la misma pantalla «Suscripciones» (estado en la URL, `?tab=comparison`), que reutiliza el catálogo ya cargado sin ninguna consulta nueva (D6) y se construye con `Table` de MUI, no con Data Grid, porque es una matriz y no un listado de filas (D7). El control Mensual/Anual, tanto en el Comparativo como en la vista previa del formulario, es estado local que siempre empieza en Mensual (D8).
6. **Simulador de pruebas**: se amplía con las mismas reglas que la API real, incluida la validación de dependencias entre módulos, importando el catálogo fijo del propio código de producción (D9); dos códigos de error nuevos (`subscription_module_prerequisite_missing`, `subscription_module_not_found`) y uno de disponibilidad (`module_check_unavailable`) se suman al catálogo de la 003 (D10).
7. **Piezas nuevas o que cambian**: ver D11 y [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios respecto a la 003.

**Primary Dependencies**: las mismas de la 003, sin cambios. **Ninguna nueva** (D1): `Switch`, `ToggleButtonGroup`, `Checkbox`, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` de `@mui/material` ya están disponibles.

**Storage**: N/A, sin cambios (003): el estado de la pestaña vive en la URL y el de servidor en TanStack Query.

**Testing**: la infraestructura de la 001 a la 003 (Vitest, Testing Library, user-event, MSW, vitest-axe, Playwright), más la ampliación del simulador de la API de suscripciones con los campos y las reglas de esta feature (D9). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`, sin cambios. En esta fase no se escriben ni se ejecutan pruebas (spec, Assumptions): se hacen en `/speckit-implement`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px sin desplazamiento horizontal de la página (el Comparativo se desplaza dentro de su propio recuadro, igual que ya hace el listado), sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: alta de un plan completo en menos de 3 minutos (SC-001, más que el alta simple de la 003 porque hay más secciones que capturar); cambiar de pestaña (Listado/Comparativo) o de Mensual a Anual sin ninguna solicitud nueva (SC-005); el resto de los objetivos de rendimiento de la 003 (primera página en menos de 2 s, JS de entrada de 300 KB gzip o menos) no cambian, salvo el tamaño propio de esta feature, que se mide al final de la implementación (igual que hizo la 003).

**Constraints**: las de la 003 (token y permiso en cada operación, catálogo completo sin paginar ni en el orden pedido, sin control de concurrencia, `PATCH` parcial, mutaciones sin reintento, CORS cerrado por defecto), más: `annual_price` y los cuatro límites son obligatorios en la API (sin valor por defecto en la base de datos, verificado en el modelo); `module_keys` siempre incluye `patients` y se valida contra el catálogo de módulos de clínica de la API de usuarios y contra cuatro dependencias fijas; un rechazo por módulo (409 o 422) nunca debería ocurrir en el uso normal del formulario, porque la cascada de D4 lo impide de antemano. La interfaz sigue en español, accesible (WCAG 2.1 AA) y fluida de 1024 a 320 px.

**Scale/Scope**: mismo catálogo de unas decenas de suscripciones (003). Agrega una pestaña al listado existente, nueve casillas de módulo con cuatro dependencias, cuatro campos de límite, un interruptor y un campo de días de prueba al formulario, un panel de vista previa y una matriz de Comparativo; cero rutas y cero operaciones de API nuevas (sigue siendo S1 a S6, con cuerpos más grandes).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.4.0. Reutiliza el Constitution Check de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) para lo que no cambia; solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado al iniciar la investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; componentes ≤ 250 líneas | `SubscriptionFormFields` y `SubscriptionDetailFields` crecen: se dividen en componentes nuevos de responsabilidad única (`ModulesField`, `ClinicLimitsFields`, `SelfServiceAndTrialFields`, `OtherFeaturesField`, `SubscriptionPreviewPanel`, `SubscriptionPriceDisplay`, `PriceCycleToggle`), en vez de un solo archivo más largo (D11) | ⚠️ | ✅ |
| I. Sin abstracciones especulativas | `withModuleChecked` y `computeAnnualSavings` son funciones puras con un único uso real cada una (el formulario); no se generaliza `OtherFeaturesField` a un campo de lista genérico sin un segundo caso de uso (D2) | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras | Los ocho campos nuevos de `SubscriptionRead` se agregan a `subscriptionSchema`; `ClinicModuleKey` es un tipo cerrado derivado de `CLINIC_MODULE_ORDER` (sin `as`) | ✅ | ✅ |
| III. Estado navegable del listado en la URL | `tab` se agrega a `SubscriptionsLocation`, con el mismo patrón que `page`/`page_size` (D8); el control Mensual/Anual es una decisión documentada de **no** llevarlo a la URL (D8, Assumptions del spec) | ⚠️ | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | La cascada de módulos (D4) es solo una ayuda de la interfaz para no chocar con una regla que la API ya aplica (`subscription_module_prerequisite_missing`); la API decide siempre, incluida la carrera del escenario W13 del quickstart | ✅ | ✅ |
| IV. Paginación en servidor; NO descargar una colección completa para paginarla en el cliente (DEBE) | **Mismo desvío ya justificado en la 003** (Complexity Tracking de esa feature): el Comparativo no agrega una segunda descarga, reutiliza el catálogo completo que el listado ya obtiene en una sola solicitud (D6); no hay una nueva instancia del desvío que justificar aquí | ✅ (heredado) | ✅ (heredado) |
| VI. MUI, sin mezclar otras librerías | El Comparativo usa `Table` de `@mui/material`, no Data Grid (D7): sigue siendo MUI; la constitución exige Data Grid para los listados paginados (ya cumplido por «Listado»), no para toda tabla | ⚠️ | ✅ |
| VI. WCAG 2.1 AA | El grupo de módulos (`fieldset`/`legend`), el `Tabs` estándar de MUI, el desplazamiento horizontal del Comparativo dentro de su recuadro y el texto para lectores de pantalla de cada marca/guion ([contracts/app-routes.md](contracts/app-routes.md), «Accesibilidad») | ⚠️ | ✅ |
| VI. Mismo patrón de Listar, Mostrar, Crear, Modificar y Eliminar | Sin cambios: las cuatro rutas y las cuatro acciones de la 003 siguen igual; esta feature solo enriquece sus datos y agrega una vista de solo lectura (Comparativo) | ✅ | ✅ |
| VII. Simulador fiel al contrato; cobertura 80 % | El simulador importa el catálogo fijo de módulos del propio código de producción, no una copia (D9); los archivos nuevos entran en las carpetas que ya cuentan para la cobertura | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración por entorno, rendimiento, flujo de desarrollo): sin cambios respecto de la 003, que ya las cumplía, y esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No se introduce ningún desvío nuevo: el único que existía (paginación en servidor) sigue acotado exactamente como lo justificó la 003 y no crece con esta feature, porque el Comparativo no pide datos adicionales.

## Project Structure

### Documentation (this feature)

```text
specs/012-configure-subscription-plans/
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

Solo lo que esta feature agrega o cambia sobre la estructura de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md), que sigue vigente en todo lo que no se lista aquí: rutas, navegación, capacidades, cliente HTTP y el resto de `shared`).

```text
src/
├── features/
│   └── subscriptions/
│       ├── api/
│       │   └── subscriptionsApi.ts         # sin cambios de forma; los cuerpos que envía/recibe crecen (schemas)
│       ├── components/
│       │   ├── OtherFeaturesField.tsx      # antes FeaturesField.tsx; mismo comportamiento, campo otherFeatures (D2)
│       │   ├── ModulesField.tsx            # NUEVO: los nueve Checkbox, Pacientes fijo, contador, cascada (D4)
│       │   ├── ClinicLimitsFields.tsx      # NUEVO: los cuatro TextField numéricos
│       │   ├── SelfServiceAndTrialFields.tsx  # NUEVO: Switch de autoconsumo y TextField de días de prueba
│       │   ├── PriceCycleToggle.tsx        # NUEVO: ToggleButtonGroup Mensual/Anual (D8), reutilizado dos veces
│       │   ├── SubscriptionPriceDisplay.tsx   # NUEVO: precio del periodo + leyenda de ahorro (D5)
│       │   ├── SubscriptionPreviewPanel.tsx   # NUEVO: panel «Vista previa» del formulario (FR-014)
│       │   ├── SubscriptionFormFields.tsx  # + las secciones nuevas; sigue siendo el formulario compartido
│       │   ├── SubscriptionDetailFields.tsx   # + precio anual, prueba, autoconsumo, módulos, límites
│       │   ├── SubscriptionsListPage.tsx   # + Tabs Listado/Comparativo (D6, D8); el contenido actual se mueve a:
│       │   ├── SubscriptionsListView.tsx   # NUEVO: el Data Grid y su paginación (lo que antes pintaba SubscriptionsListPage)
│       │   └── SubscriptionsComparisonTable.tsx  # NUEVO: la matriz del Comparativo (D6, D7)
│       ├── hooks/                          # sin archivos nuevos: useSubscriptionCatalog ya sirve a las dos pestañas
│       ├── policy/
│       │   ├── moduleSelection.ts          # NUEVO: withModuleChecked (D4)
│       │   └── catalogOrder.ts             # sin cambios: sortCatalog también ordena las columnas del Comparativo
│       └── schemas/
│           ├── clinicModuleCatalog.ts      # NUEVO: CLINIC_MODULE_ORDER, MODULE_PREREQUISITE, REQUIRED_MODULE_KEY (D3)
│           ├── price.ts                    # + computeAnnualSavings y AnnualSavings (D5)
│           ├── subscription.ts             # + los ocho campos nuevos; features → otherFeatures (D2)
│           ├── subscriptionForm.ts         # + los campos nuevos en SubscriptionFormValues y en los cuerpos
│           └── subscriptionsLocation.ts    # + tab (D8)
├── shared/
│   └── messages/es.ts                      # bloque subscriptions.modules.catalog (9 módulos) y los textos nuevos
└── test/
    └── handlers/subscriptionsCatalog/      # model, validation, factories: campos y reglas nuevos (D9)
        ├── model.ts                        # + los ocho campos; features → other_features
        └── validation.ts                   # + sus validaciones, incluida la de module_keys contra el catálogo fijo
e2e/subscriptions.spec.ts                   # sin rutas nuevas que cubrir; se revisa si algún selector usaba «features»
```

**Structure Decision**: se mantiene exactamente la estructura por features de la 003 (`app → features → shared`, la feature `subscriptions` sigue sin importar `auth`). No hay piezas nuevas en `app` (sin rutas, sin capacidades nuevas) ni en `shared` más allá de los textos: todo lo nuevo vive dentro de `features/subscriptions` o en el simulador de pruebas. `SubscriptionsListPage` se reparte en dos componentes (el propio `SubscriptionsListPage`, ahora solo el encabezado y el `Tabs`, y `SubscriptionsListView` con lo que antes hacía todo el archivo) para no superar el límite de 250 líneas de la constitución al agregar la pestaña Comparativo (D11).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación nueva que justificar. El único desvío de la constitución que sigue vigente (IV: el listado descarga el catálogo completo y lo pagina en el cliente) ya está justificado en el Complexity Tracking de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) y esta feature no lo amplía: el Comparativo reutiliza esa misma descarga (D6), nunca pide una segunda.
