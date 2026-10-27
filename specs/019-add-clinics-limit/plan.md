# Implementation Plan: Límite de clínicas por tipo y ajustes visuales del formulario de suscripción

**Branch**: `019-add-clinics-limit` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-add-clinics-limit/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Tres cambios sobre el formulario de suscripción (018): (1) el control de tipo (Individual/Empresarial) deja de verse como dos tarjetas seleccionables y pasa a ser un interruptor de una sola línea, igual en apariencia al de Autoconsumo — cambio solo visual, ninguna regla de la 018 cambia; (2) Autoconsumo nace activado en el alta, en vez de desactivado — un valor por defecto; (3) se agrega el límite de clínicas (`clinics_limit`), un dato nuevo ligado al tipo: exactamente 1 y fijo para siempre si la suscripción es Individual, de 1 a 100 y editable si no lo es, con 1 como valor inicial siempre que el campo se vuelve editable (Clarifications).

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas** (D1): el interruptor de tipo reutiliza `Switch`/`FormControlLabel`, el mismo patrón que ya usa Autoconsumo (`SelfServiceAndTrialFields.tsx`).
2. **Autoconsumo**: cambia una sola constante (`EMPTY.selfService` de `SubscriptionCreatePage.tsx`), sin tocar ninguna otra pieza (D2).
3. **Límite de clínicas como componente propio** (D3): `ClinicsLimitField.tsx`, no un quinto elemento de `ClinicLimitsFields` (que asume campos uniformes); observa el tipo vigente con `useWatch` para decidir si se deshabilita.
4. **Contrato de la API, predicho, no verificado** (D4): `clinics_limit` todavía no existe en `maily-system-api`, pero esa API ya tiene su propia especificación (`specs/007-add-clinics-limit/`, sin implementar) con el mismo nombre y la misma regla; se predice su forma exacta por analogía con código ya fusionado de esa misma API, documentada para re-verificarse antes de implementar.
5. **Validación en dos capas, en el formulario y en el simulador** (D5): forma (1 a 100, siempre) más una regla cruzada con el tipo (`.superRefine()` en el formulario; una comprobación de servicio en el simulador), reflejando la misma separación que la predicción de la API.
6. **Un solo evento decide ambos campos** (D6): el `onChange` del interruptor de tipo dejar también el límite de clínicas en 1, sin un `useEffect` que sincronice dos campos después.
7. **Piezas nuevas o que cambian**: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios respecto a la 018.

**Primary Dependencies**: las mismas de la 018, sin cambios. **Ninguna nueva**: `Switch`, `FormControlLabel` y `TextField` de `@mui/material` ya están en uso (research D1).

**Storage**: N/A, sin cambios: el límite de clínicas vive en TanStack Query como el resto de la suscripción; no se agrega ningún estado navegable nuevo a la URL.

**Testing**: la infraestructura de la 001 a la 018 (Vitest, Testing Library, user-event, MSW, vitest-axe, Playwright), más la ampliación del simulador de la API de suscripciones con la predicción completa del contrato de `clinics_limit` (research D4). Cobertura mínima de 80 % de líneas en `api`, `schemas` y `shared/api|lib`, sin cambios. En esta fase no se escriben ni se ejecutan pruebas (spec, Assumptions): se hacen en `/speckit-implement`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px sin desplazamiento horizontal de la página, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: cambiar el tipo en el alta ajusta el límite de clínicas sin ninguna recarga ni demora perceptible (SC-003); el resto de los objetivos de rendimiento de la 018 no cambian, salvo el tamaño propio de esta feature, que se mide al final de la implementación.

**Constraints**: las de la 018 (token y permiso en cada operación, `subscription_type_id` nunca se envía al modificar), más: `clinics_limit` es obligatorio al crear (entero de 1 a 100, exactamente 1 si Individual) y condicionalmente inmutable al modificar (fijo mientras el tipo sea Individual; editable si no) — **contrato predicho, pendiente de confirmar contra `maily-system-api` antes de implementar** (research D4, contracts/subscriptions-service.md). Si para entonces la API real sigue sin implementarlo, ver Assumptions.

**Scale/Scope**: mismo catálogo de unas decenas de suscripciones (003/012/018). Rediseña un control existente (tipo), cambia un valor por defecto (autoconsumo) y agrega un campo nuevo (límite de clínicas) con una regla cruzada; cero rutas y cero operaciones de API nuevas (sigue siendo S1 a S6, con cuerpos apenas más grandes al crear y, condicionalmente, al modificar).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Reutiliza el Constitution Check de la 018 ([../018-add-subscription-type/plan.md](../018-add-subscription-type/plan.md)) para lo que no cambia; solo se listan las filas donde esta feature agrega o modifica algo. «Antes» es el estado al iniciar la investigación; «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes pequeños, de responsabilidad única | `ClinicsLimitField` es un componente propio, no una ampliación condicional de `ClinicLimitsFields` (research D3); `SubscriptionTypeField` cambia su interior (interruptor en vez de `ToggleButtonGroup`) sin crecer en responsabilidades | ✅ | ✅ |
| I. Sin abstracciones especulativas | No se generaliza `ClinicLimitsFields` para aceptar un campo condicional por una sola necesidad real (research D3) | ✅ | ✅ |
| I. `useEffect` solo para sincronizar con sistemas externos | El reinicio del límite de clínicas al cambiar el tipo se hace en el mismo `onChange` del interruptor, no en un efecto que reaccione al cambio de otro campo (research D6) | ⚠️ | ✅ |
| II. TypeScript estricto y Zod en las fronteras | `clinics_limit` se agrega a `subscriptionSchema`; la regla cruzada con el tipo se valida con `.superRefine()` sobre el objeto completo del formulario, sin `any` ni `as` (research D5) | ✅ | ✅ |
| IV. El backend es la fuente de verdad; sin reglas autoritativas duplicadas | El frontend no inventa la regla del límite de clínicas: la toma de la especificación ya acordada del lado de la API (`007-add-clinics-limit` de `maily-system-api`), documentada como predicción a reverificar, no como una decisión propia del Backoffice (research D4) | ✅ | ✅ |
| VI. MUI, sin dependencias nuevas | `Switch`, `FormControlLabel` y `TextField`, todos ya en uso (research D1) | ✅ | ✅ |
| VI. WCAG 2.1 AA | El interruptor de tipo sigue el mismo `fieldset`/`legend`/`aria-describedby` ya validado en la 018; `ClinicsLimitField` deshabilitado para Individual lleva su propio texto explicativo asociado por `aria-describedby`, mismo patrón que `ClinicLimitsFields` | ⚠️ | ✅ |
| VI. Mismo patrón de Listar, Mostrar, Crear, Modificar y Eliminar | Sin cambios: no se agregan rutas, pantallas ni acciones; el límite de clínicas se muestra en el detalle junto al resto de los datos (FR-005), sin agregarse al listado ni al Comparativo (spec → Fuera de alcance) | ✅ | ✅ |
| VII. Simulador fiel al contrato; cobertura 80 % | El simulador reproduce la predicción completa del contrato (research D4), documentada como tal; si la API real difiere al implementarse, el cambio queda aislado a los mensajes del simulador | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración por entorno, estado navegable en la URL, rendimiento, flujo de desarrollo): sin cambios respecto de la 018, que ya las cumplía, y esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No se introduce ningún desvío nuevo: el único que existía (paginación en servidor, principio IV) sigue acotado exactamente como lo justificó la 003 y esta feature no lo toca. La predicción del contrato de `clinics_limit` (research D4) es un riesgo documentado y a reverificar, no una violación de ningún principio: el frontend sigue sin inventar reglas de negocio propias, solo anticipa una especificación de la API ya acordada pero no implementada todavía.

## Project Structure

### Documentation (this feature)

```text
specs/019-add-clinics-limit/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── subscriptions-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que esta feature agrega o cambia sobre la estructura de la 018 ([../018-add-subscription-type/plan.md](../018-add-subscription-type/plan.md)), que sigue vigente en todo lo que no se lista aquí: rutas, navegación, capacidades, cliente HTTP, listado, Comparativo y el resto de `shared`.

```text
src/
├── features/
│   └── subscriptions/
│       ├── api/
│       │   └── subscriptionErrors.ts          # + 'clinicsLimit' en SubscriptionFormField y FORM_FIELDS;
│       │                                       #   + casos de los códigos predichos (research D4)
│       ├── components/
│       │   ├── ClinicsLimitField.tsx           # NUEVO: TextField que observa subscriptionTypeId (D3)
│       │   ├── SubscriptionTypeField.tsx       # Reescribe su interior: Switch en vez de ToggleButtonGroup (D1);
│       │   │                                   #   su onChange también fija clinicsLimit a '1' (D6)
│       │   ├── SubscriptionFormFields.tsx      # + ClinicsLimitField, junto a SubscriptionTypeField
│       │   ├── SubscriptionDetailFields.tsx    # + fila "Límite de clínicas" (con "No disponible" si es null)
│       │   ├── SubscriptionCreatePage.tsx      # EMPTY: selfService → true (D2); clinicsTypeId sigue en Individual,
│       │   │                                   #   clinicsLimit arranca en '1'
│       │   └── applyRefusal.ts                 # + 'clinicsLimit' en FORM_FIELDS (orden de foco)
│       └── schemas/
│           ├── subscription.ts                 # + clinics_limit -> clinicsLimit (number | null)
│           └── subscriptionForm.ts             # + clinicsLimit; .superRefine() con la regla cruzada (D5);
│                                                #   toCreateSubscriptionBody lo envía; toUpdateSubscriptionBody
│                                                #   lo omite si el tipo vigente es Individual (D4); toFormValues
│                                                #   abre '1' cuando es null
├── shared/
│   └── messages/es.ts                          # fields.clinicsLimit, sus textos de ayuda (habilitado/fijo),
│                                                # validation.clinicsLimitInvalid/-MustBeOneForIndividual,
│                                                # detail.fields.clinicsLimit, errors.fields.clinicsLimit
└── test/
    └── handlers/subscriptionsCatalog/
        ├── model.ts                            # + clinicsLimit (default 1); regla cruzada en create()/update() (D4)
        ├── validation.ts                       # + clinics_limit a los campos de forma permitidos (create y update)
        └── seed.ts                             # + una suscripción Empresarial con un clinics_limit distinto de 1,
                                                 #   para poder probar el caso editable
e2e/subscriptions.spec.ts                       # revisa si el recorrido de alta necesita el interruptor/el límite
```

**Structure Decision**: se mantiene exactamente la estructura por features de la 018 (`app → features → shared`, `subscriptions` sigue sin importar `auth`). No hay piezas nuevas en `app` (sin rutas, sin capacidades nuevas) ni en `shared` más allá de los textos: todo lo nuevo vive dentro de `features/subscriptions` o en el simulador de pruebas. Ningún archivo supera el límite de 250 líneas de la constitución con este cambio.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación nueva que justificar. El único desvío de la constitución que sigue vigente (IV: el listado descarga el catálogo completo y lo pagina en el cliente) ya está justificado en el Complexity Tracking de la 003 ([../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md)) y esta feature no lo toca.
