# Implementation Plan: Tipo de suscripción (Individual o Empresarial)

**Branch**: `018-add-subscription-type` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-add-subscription-type/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Agrega el tipo de suscripción (Individual o Empresarial) a la sección Suscripciones (features 003 y 012), un dato que la API ya expone y exige. El formulario de alta gana un control de selección única con las dos opciones, que abre con Individual marcado por defecto (Clarifications) y nunca puede quedar sin selección; el tipo elegido se envía al crear. El formulario de edición muestra el mismo control con el tipo actual, deshabilitado, porque la API lo trata como fijo para siempre y rechaza cualquier intento de modificarlo; el detalle muestra el tipo junto con el resto de los datos. Ninguna ruta, permiso ni otra acción (listar, cambiar estatus, eliminar, Comparativo) cambia.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas** (D1, D3): el catálogo de los dos tipos es contenido fijo del frontend (`subscriptionTypeCatalog.ts`), igual patrón que el catálogo de módulos de la 012; el control reutiliza `ToggleButtonGroup` de `@mui/material`, ya incorporado por `PriceCycleToggle` (012).
2. **Un componente, dos modos**: `SubscriptionTypeField.tsx` se reutiliza en el alta (habilitado) y en la edición (deshabilitado, con el texto de inmutabilidad), en vez de duplicar el control (D3).
3. **El tipo se reconoce por su identificador, no por su nombre** (D2): el detalle resuelve el texto con el catálogo propio del frontend, igual trato que ya recibe el estatus, con el `name` de la API como respaldo ante un tipo desconocido (fuera de alcance crearlo u ofrecerlo, pero no debe romper la lectura).
4. **Inmutabilidad real en el cliente, no solo visual** (D4): el cuerpo de la edición nunca construye `subscription_type_id`, así que el rechazo de inmutabilidad de la API nunca debería alcanzarse desde esta interfaz.
5. **Manejo de rechazos**: un código nuevo, `subscription_type_not_found` (422), con el mismo patrón ya usado para `subscription_module_not_found` (D5).
6. **Simulador de pruebas**: se amplía con la obligatoriedad al crear y la inmutabilidad al modificar, importadas de las mismas reglas que valida la API real (D6).
7. **Piezas nuevas o que cambian**: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios respecto a la 003/012.

**Primary Dependencies**: las mismas de la 003/012, sin cambios. **Ninguna nueva**: `ToggleButtonGroup` de `@mui/material` ya está disponible (research D3).

**Storage**: N/A, sin cambios: el estado de servidor vive en TanStack Query y no se agrega ningún estado navegable nuevo a la URL (el tipo no se filtra ni se ordena por él, spec → Fuera de alcance).

**Testing**: la infraestructura de la 001 a la 012 (Vitest, Testing Library, user-event, MSW, vitest-axe, Playwright), más la ampliación del simulador de la API de suscripciones con la obligatoriedad y la inmutabilidad del tipo (research D6). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas` y `hooks`, sin cambios. En esta fase no se escriben ni se ejecutan pruebas (spec, Assumptions): se hacen en `/speckit-implement`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px sin desplazamiento horizontal de la página, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: elegir el tipo en el alta toma 0 interacciones adicionales si el operador acepta Individual (el valor por defecto) o 1 clic si necesita Empresarial (SC-004); el resto de los objetivos de rendimiento de la 003/012 (primera página en menos de 2 s, alta completa en menos de 3 minutos, JS de entrada de 300 KB gzip o menos) no cambian, salvo el tamaño propio de esta feature, que se mide al final de la implementación.

**Constraints**: las de la 003/012 (token y permiso en cada operación, catálogo completo sin paginar, sin control de concurrencia, `PATCH` parcial, mutaciones sin reintento, CORS cerrado por defecto), más: `subscription_type_id` es obligatorio y estricto al crear (entero positivo, sin valor por defecto en el DTO), y **no existe como campo** en la actualización (se rechaza si se envía, con cualquier valor, incluso el que ya tiene); un rechazo por tipo (`subscription_type_not_found`) nunca debería ocurrir en el uso normal del formulario, porque el control solo ofrece los dos identificadores válidos de hoy y nunca queda sin selección (research D3).

**Scale/Scope**: mismo catálogo de unas decenas de suscripciones (003/012). Agrega un control de dos opciones al formulario de alta y de edición, una fila al detalle, un catálogo fijo de dos elementos y un código de error nuevo; cero rutas y cero operaciones de API nuevas (sigue siendo S1 a S6, con cuerpos apenas más grandes al crear).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Reutiliza el Constitution Check de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) y de la 012 ([../012-configure-subscription-plans/plan.md](../012-configure-subscription-plans/plan.md)) para lo que no cambia; solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado al iniciar la investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes pequeños, de responsabilidad única, sin duplicar | `SubscriptionTypeField` se reutiliza en el alta y en la edición mediante una prop `disabled`, en vez de dos componentes casi iguales (research D3) | ⚠️ | ✅ |
| I. Sin abstracciones especulativas | El catálogo de tipos es un array fijo de 2 elementos (como `clinicModuleCatalog.ts`), no una llamada a una API ni un campo configurable por entorno (research D1) | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras | `subscription_type: { id, name }` se agrega a `subscriptionSchema`; `subscriptionTypeId` del formulario es `z.union([z.literal(1), z.literal(2)])`, un tipo cerrado, sin `any` ni `as` fuera del único cast documentado en data-model.md (el `id` que ya validó Zod al leer la suscripción) | ✅ | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | El frontend no aplica la regla de negocio "una clínica si Individual, cualquiera si Empresarial" (fuera de alcance, spec → Assumptions y Edge Cases); el cliente nunca envía el tipo al modificar, pero quien lo impone de verdad sigue siendo la API (research D4) | ✅ | ✅ |
| VI. MUI, sin mezclar otras librerías; sin dependencias nuevas | `ToggleButtonGroup` de `@mui/material`, ya usado en `PriceCycleToggle` (012) | ✅ | ✅ |
| VI. WCAG 2.1 AA | El grupo tiene un nombre accesible («Tipo de suscripción»); cada opción se identifica por su texto, nunca solo por el color o la posición; en la edición, deshabilitado con su texto explicativo asociado (`aria-describedby`) | ⚠️ | ✅ |
| VI. Mismo patrón de Listar, Mostrar, Crear, Modificar y Eliminar | Sin cambios: no se agregan rutas, pantallas ni acciones; solo un campo más en el formulario y en el detalle ya existentes, y ninguna columna nueva en el listado ni en el Comparativo (spec → Fuera de alcance) | ✅ | ✅ |
| VII. Simulador fiel al contrato; cobertura 80 % | El simulador reproduce la obligatoriedad al crear y la inmutabilidad al modificar con las mismas reglas que la API real (research D6) | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración por entorno, estado navegable en la URL, rendimiento, flujo de desarrollo): sin cambios respecto de la 003/012, que ya las cumplían, y esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No se introduce ningún desvío nuevo: el único que existía (paginación en servidor, principio IV) sigue acotado exactamente como lo justificó la 003 y esta feature no lo toca.

## Project Structure

### Documentation (this feature)

```text
specs/018-add-subscription-type/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── subscriptions-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que esta feature agrega o cambia sobre la estructura de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) y la 012 ([../012-configure-subscription-plans/plan.md](../012-configure-subscription-plans/plan.md)), que siguen vigentes en todo lo que no se lista aquí: rutas, navegación, capacidades, cliente HTTP, listado, Comparativo y el resto de `shared`.

```text
src/
├── features/
│   └── subscriptions/
│       ├── api/
│       │   └── subscriptionErrors.ts        # + 'subscriptionTypeId' en SubscriptionFormField y FORM_FIELDS;
│       │                                     #   + caso 'subscription_type_not_found' (research D5)
│       ├── components/
│       │   ├── SubscriptionTypeField.tsx     # NUEVO: ToggleButtonGroup de 2 opciones, con prop `disabled` (D3)
│       │   ├── SubscriptionFormFields.tsx    # + SubscriptionTypeField, antes del nombre
│       │   ├── SubscriptionDetailFields.tsx  # + fila "Tipo"
│       │   └── applyRefusal.ts               # + 'subscriptionTypeId' en FORM_FIELDS (orden de foco)
│       └── schemas/
│           ├── subscriptionTypeCatalog.ts    # NUEVO: SUBSCRIPTION_TYPE, SUBSCRIPTION_TYPE_ORDER, SubscriptionTypeId (D1)
│           ├── subscription.ts               # + subscription_type -> subscriptionType
│           └── subscriptionForm.ts            # + subscriptionTypeId; toCreateSubscriptionBody lo envía;
│                                               #   toUpdateSubscriptionBody no lo toca (D4); toFormValues lo abre
├── shared/
│   └── messages/es.ts                         # subscriptions.types.catalog (2), fields.subscriptionType/type,
│                                               # subscriptionTypeImmutableHelper, errors.fields.subscriptionTypeId
└── test/
    └── handlers/subscriptionsCatalog/
        ├── model.ts                           # + subscription_type_id (default 1) y subscription_type en la lectura
        ├── validation.ts                      # + obligatoriedad al crear; inmutabilidad al actualizar (D6)
        └── seed.ts                            # + subscription_type_id variado en las suscripciones de prueba
e2e/subscriptions.spec.ts                      # revisa si algún recorrido de alta/edición necesita elegir el tipo
```

**Structure Decision**: se mantiene exactamente la estructura por features de la 003/012 (`app → features → shared`, `subscriptions` sigue sin importar `auth`). No hay piezas nuevas en `app` (sin rutas, sin capacidades nuevas) ni en `shared` más allá de los textos: todo lo nuevo vive dentro de `features/subscriptions` o en el simulador de pruebas. Ningún archivo supera el límite de 250 líneas de la constitución con este cambio (el campo nuevo es un control más, no una sección con varias piezas como las de la 012).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación nueva que justificar. El único desvío de la constitución que sigue vigente (IV: el listado descarga el catálogo completo y lo pagina en el cliente) ya está justificado en el Complexity Tracking de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) y esta feature no lo toca ni lo amplía.
