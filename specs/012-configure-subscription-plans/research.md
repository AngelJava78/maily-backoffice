# Investigación: Planes de suscripción (precio anual, módulos, límites y comparativo)

**Feature**: `012-configure-subscription-plans` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md)

Esta feature no abre preguntas de tecnología (reutiliza el stack de 001-002-003 sin excepción) ni de proceso de negocio (el contrato de la API ya está implementado y verificado, spec → Assumptions). La investigación se centra en cómo encajar los datos y las pantallas nuevas en la arquitectura ya existente de `features/subscriptions`, descrita en [../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md). No queda ningún `NEEDS CLARIFICATION`.

## D1. Sin dependencias nuevas

**Decisión**: cero paquetes nuevos. El precio anual, los días de prueba y los límites son `TextField`; el autoconsumo, `Switch`; el control Mensual/Anual (en la vista previa y en el Comparativo), `ToggleButtonGroup`; los módulos, `Checkbox` dentro de un `FormGroup`; el Comparativo, `Table` de `@mui/material` (no Data Grid: ver D7). Todo ya está en `@mui/material`.

**Alternativas**: ninguna considerada; la constitución exige justificar una dependencia nueva y no hay necesidad.

## D2. El campo `features` se renombra a `otherFeatures`; es un cambio incompatible dentro del propio frontend

**Decisión**: la API ya no tiene `features` (lo sustituyó por `other_features` desde que se implementó esta ampliación del contrato, spec → Assumptions). `subscriptionSchema`, `SubscriptionFormValues`, `CreateSubscriptionBody`, `UpdateSubscriptionBody`, `FeaturesField` (renombrado `OtherFeaturesField`, mismo comportamiento), el simulador de pruebas (`model.ts`, `validation.ts`, `factories.ts`) y los textos de `es.ts` cambian todos a la vez, en el mismo PR que agrega el resto de los campos: no hay un estado intermedio en el que el frontend hable con la API vigente usando `features`, porque ya no lo acepta (`extra: "forbid"` en `SubscriptionCreate`/`SubscriptionUpdate`, verificado en el DTO de la API). `FeaturesField` no se generaliza a un componente compartido: sigue siendo propia de `subscriptions` (ningún otro recurso del Backoffice tiene un campo de texto libre ordenado), solo cambia su nombre de campo (`features` → `otherFeatures`) y sus textos.

**Alternativas**: mantener `features` como alias interno del nuevo `other_features` — se rechaza: duplica el nombre del dato sin necesidad (YAGNI) y el propio DTO de la API ya lo llama `other_features`.

## D3. El catálogo de los nueve módulos seleccionables es contenido fijo del frontend, no una consulta a una API

**Decisión**: un módulo de datos puro, `schemas/clinicModuleCatalog.ts`, declara las nueve claves en el orden de FR-007, con su dependencia cuando la tiene:

```ts
export const CLINIC_MODULE_ORDER = [
  'patients', 'scheduling', 'reminders', 'clinical_records',
  'clinical_record_templates', 'prescriptions', 'finance', 'reports', 'billing',
] as const;
export type ClinicModuleKey = (typeof CLINIC_MODULE_ORDER)[number];
export const REQUIRED_MODULE_KEY: ClinicModuleKey = 'patients';
export const MODULE_PREREQUISITE: Partial<Record<ClinicModuleKey, ClinicModuleKey>> = {
  reminders: 'scheduling',
  clinical_record_templates: 'clinical_records',
  prescriptions: 'clinical_records',
  billing: 'finance',
};
```

Los nombres y las descripciones visibles (p. ej. «Agenda y citas» / «Calendario por doctor y consultorio…») viven en `messages.subscriptions.modules.catalog`, como cualquier otro texto de la interfaz (constitución VI). `module_keys` que llegue de la API con una clave fuera de estas nueve (por ejemplo, si el catálogo de módulos de la API de usuarios creciera) no se rechaza al leer: el esquema la conserva como texto suelto, pero la interfaz de esta feature solo pinta y ofrece las nueve conocidas (ver Edge Cases del spec; es la misma postura que FR-020 de la 003 ante un estatus desconocido, aplicada aquí a un módulo desconocido).

**Por qué no una llamada a la API de usuarios** (`GET /api/v1/modules?type_id=2&status_id=1`, que la propia API de suscripciones usa para validar del lado del servidor, verificado en `maily-system-api/src/integrations/users_api.py`): añadiría una segunda API al formulario de suscripciones (`VITE_USERS_API_URL` ya existe en el Backoffice para la feature 002, pero `subscriptions` no la importa, research D2 de la 003: «`subscriptions` no importa `auth`»), una carga y un estado de error más en una pantalla que ya tiene varias secciones, y el propio mockup trata esos nueve módulos como catálogo fijo (los otros módulos de clínica — Horarios, Escalas médicas, Personal, Equipos, Departamentos, Servicios — ni siquiera se ofrecen). La API de suscripciones sigue siendo quien valida de verdad (D6): si su catálogo cambiara, el 422/409 correspondiente ya avisa al operador (FR-015) y esta feature se revisaría (spec → Assumptions).

## D4. Las dependencias entre módulos se aplican en el formulario con una función pura, no solo como texto

**Decisión**: `policy/moduleSelection.ts` expone `withModuleChecked(selected, key, checked)`. Al marcar, añade `key` y recorre `MODULE_PREREQUISITE` hacia arriba hasta que no haya más requisitos que agregar; al desmarcar, quita `key` y, con el mapa invertido (calculado una vez con `Object.entries`), quita en cascada todo lo que dependía de `key`, directa o indirectamente (por ejemplo, si en el futuro un módulo dependiera de un dependiente). El resultado es un nuevo `ReadonlySet<ClinicModuleKey>`; la función no sabe nada de React ni del formulario. `ModulesField` (el componente) llama a esta función en el `onChange` de cada `Checkbox` y escribe el conjunto completo con `setValue(..., { shouldDirty: true })` de React Hook Form.

**Alternativas**: deshabilitar el `Checkbox` de un módulo dependiente hasta que su requisito esté marcado, en vez de marcarlo en cascada — se descarta (spec → Assumptions): obliga al operador a averiguar primero cuál es el requisito y marcarlo él mismo, cuando el propio mockup ya asocia cada dependiente con su requisito («Requiere Agenda y citas»); la cascada automática es la experiencia que ya ofrecen formularios equivalentes (por ejemplo, un asistente de compra que agrega automáticamente un prerrequisito) y evita por completo el rechazo `subscription_module_prerequisite_missing` en el uso normal.

## D5. El cálculo del ahorro anual es una función pura en `schemas/price.ts`

**Decisión**: se extiende `schemas/price.ts` (que ya tiene `toCents`) con:

```ts
export interface AnnualSavings {
  readonly amountCents: number;        // precio mensual × 12 − precio anual, en centavos
  readonly percent: number;            // redondeado al entero más cercano
  readonly monthlyEquivalentCents: number; // precio anual ÷ 12, redondeado al centavo
}
export function computeAnnualSavings(monthlyPrice: string, annualPrice: string): AnnualSavings | null
```

Todo se calcula en centavos enteros (como ya hace `toCents`, para no depender de la coma flotante); `null` cuando el ahorro no es positivo (FR-005). Verificado a mano contra los cuatro planes de ejemplo de los mockups (Esencial, Profesional, Avanzado, Empresarial: los cuatro dan 17 % y los importes exactos del mockup, incluidos los redondeos de «$415.83» y «$4,999.17»).

**Alternativas**: calcularlo en el servidor — se descarta: no es un dato que la API devuelva (la API solo guarda los dos precios de forma independiente, sin una relación obligatoria entre ellos) y es una regla de presentación, no de negocio.

## D6. El Comparativo reutiliza el catálogo ya cargado; no es una nueva operación de la API

**Decisión**: tanto la pestaña Listado como la pestaña Comparativo parten del mismo `useSubscriptionCatalog()` (S1, sin paginar, como ya establece la 003). `SubscriptionsListPage` pasa a tener un `Tabs` (Listado / Comparativo) cuyo valor vive en la URL (`?tab=comparison`, D8); cambiar de pestaña o el control Mensual/Anual dentro del Comparativo nunca dispara una nueva consulta (FR-019, SC-005): ambos leen el mismo array de `Subscription` ya validado. Se construye la matriz (`buildComparisonColumns(subscriptions)`, pura) con el mismo orden fijo que el listado (`sortCatalog`, reutilizada sin cambios).

**Alternativas**: una ruta aparte (`/subscriptions/comparison`) — se descarta: el mockup presenta el Comparativo como una pestaña de la misma pantalla «Suscripciones», con el mismo título y el mismo botón «Nueva suscripción»; una ruta propia solo para cambiar de pestaña obligaría a volver a pedir el catálogo (o a levantarlo a un componente padre compartido, más complejidad para el mismo resultado) y no aporta nada que la pestaña no dé ya.

## D7. El Comparativo se construye con `Table` de MUI, no con MUI X Data Grid

**Decisión**: el Comparativo no es un listado de filas de un mismo tipo (lo que Data Grid modela bien, como en Listado), sino una matriz con una columna por suscripción y una fila por cada módulo, límite, etc. (el propio mockup lo dibuja así). Se construye con `Table`, `TableHead`, `TableBody`, `TableRow` y `TableCell` de `@mui/material` dentro de un contenedor con desplazamiento horizontal (mismo patrón de accesibilidad que ya usa el listado para caber de 1024 a 320 px, 003 D-16). Sigue siendo MUI (constitución VI exige MUI, no exige Data Grid para toda tabla) y no agrega dependencias.

**Alternativas**: forzar la matriz dentro de Data Grid con columnas dinámicas por suscripción — se descarta: Data Grid de MUI X community no ofrece encabezados de dos niveles ni celdas de varias líneas por fila con facilidad, y el Comparativo no pagina ni ordena, que es lo que Data Grid aporta.

## D8. Estado de la pestaña en la URL; el control Mensual/Anual no se guarda

**Decisión**: `SubscriptionsLocation` gana `tab: 'list' | 'comparison'` (por defecto `'list'`, omitido de la URL cuando es el valor por defecto, igual que `page`/`page_size`; constitución III: el estado navegable de un listado vive en la URL). El control Mensual/Anual —que existe dos veces, de forma independiente, en el panel de vista previa del formulario y en el Comparativo (spec → Assumptions)— es estado de UI local de cada componente (`useState`), no viaja en la URL ni en ningún otro sitio: siempre empieza en Mensual, tal como pide la spec, y no es un dato que otra persona necesite enlazar.

**Alternativas**: meter también el Mensual/Anual del Comparativo en la URL (`?tab=comparison&cycle=annual`) para que el enlace sea compartible con ese precio ya seleccionado — se descarta por ahora: la spec lo trata explícitamente como un control de presentación que siempre abre en Mensual (Assumptions) y no hay un requisito que pida compartir ese estado; se puede añadir después sin romper nada si se pide.

## D9. El simulador de pruebas (MSW) se actualiza en el mismo cambio, con las mismas reglas que la API real

**Decisión**: `src/test/handlers/subscriptionsCatalog/` (model, validation, factories) incorpora los campos nuevos con las mismas reglas que verifica [contracts/subscriptions-service.md](contracts/subscriptions-service.md): `annual_price` con el mismo patrón que `monthly_price` y obligatorio; `trial_days` entero de 0 a 3650 (por defecto 0); `self_service` booleano (por defecto falso); `module_keys` (siempre con `patients`, aunque no se envíe) validado contra `CLINIC_MODULE_ORDER` (`subscription_module_not_found` si trae una clave fuera del catálogo) y contra `MODULE_PREREQUISITE` (`subscription_module_prerequisite_missing` si falta el requisito de algún módulo marcado); `other_features` con las mismas reglas que tenía `features`; los cuatro límites, enteros de 0 a 1,000,000 y obligatorios. El simulador importa `CLINIC_MODULE_ORDER` y `MODULE_PREREQUISITE` de `features/subscriptions/schemas/clinicModuleCatalog` (código de producción, no una copia): si el catálogo fijo cambiara, el simulador no se desincroniza por accidente.

**Alternativas**: inventar un catálogo de módulos aparte para las pruebas — se descarta: duplicaría la fuente de verdad y podría divertirse en silencio del contrato real.

## D10. Catálogo de errores: dos códigos nuevos de escritura, uno de disponibilidad

**Decisión**: `describeSubscriptionError` gana, verificados contra `maily-system-api/src/routers/subscriptions.py` (`WRITE_CONFLICT`, `WRITE_VALIDATION_ERROR`, `WRITE_UNAVAILABLE`):

| `code` | Estado | `kind` |
|---|---|---|
| `subscription_module_prerequisite_missing` | 409 | `field`, asociado a la sección «Módulos incluidos» |
| `subscription_module_not_found` | 422 | `field`, asociado a la sección «Módulos incluidos» |
| `module_check_unavailable` | 503 | `retryable` (igual que `authorization_unavailable`: aviso genérico, nada cambió) |

En el uso normal, D4 impide que el formulario envíe nunca un módulo dependiente sin su requisito, así que `subscription_module_prerequisite_missing` solo puede llegar por una carrera (el catálogo de módulos cambió entre que se abrió el formulario y se guardó, FR-012 de este plan / US2-12 del spec).

## D11. Las pantallas y componentes nuevos o que cambian

| Pieza | Qué hace | Nueva o existente |
|---|---|---|
| `schemas/clinicModuleCatalog.ts` | Catálogo fijo de los nueve módulos y sus dependencias (D3) | Nueva |
| `policy/moduleSelection.ts` | `withModuleChecked` (D4) | Nueva |
| `schemas/price.ts` | + `computeAnnualSavings` (D5) | Existente, ampliada |
| `schemas/subscription.ts` | + los ocho campos nuevos; `features` → `otherFeatures` (D2) | Existente, ampliada |
| `schemas/subscriptionForm.ts` | + los campos nuevos en `SubscriptionFormValues` y en los cuerpos de alta/edición | Existente, ampliada |
| `schemas/subscriptionsLocation.ts` | + `tab` (D8) | Existente, ampliada |
| `components/OtherFeaturesField.tsx` | Antes `FeaturesField`: mismo comportamiento, campo `otherFeatures` | Renombrada |
| `components/ModulesField.tsx` | Los nueve `Checkbox`, «Pacientes» fijo, contador, cascada (D4) | Nueva |
| `components/ClinicLimitsFields.tsx` | Los cuatro `TextField` numéricos | Nueva |
| `components/SelfServiceAndTrialFields.tsx` | `Switch` de autoconsumo y `TextField` de días de prueba | Nueva |
| `components/PriceCycleToggle.tsx` | `ToggleButtonGroup` Mensual/Anual, reutilizado en la vista previa y en el Comparativo (D8) | Nueva |
| `components/SubscriptionPriceDisplay.tsx` | Precio del periodo elegido y, si aplica, la leyenda de ahorro (D5); reutilizado en detalle, vista previa y Comparativo | Nueva |
| `components/SubscriptionPreviewPanel.tsx` | El panel «Vista previa» del formulario (FR-014) | Nueva |
| `components/SubscriptionFormFields.tsx` | + las secciones nuevas; sigue siendo el formulario compartido de alta y edición | Existente, ampliada |
| `components/SubscriptionDetailFields.tsx` | + precio anual, prueba, autoconsumo, módulos, límites; «Lo que incluye» → «Otras funcionalidades» | Existente, ampliada |
| `components/SubscriptionsListPage.tsx` | + `Tabs` Listado/Comparativo (D6, D8); el contenido actual pasa a un sub-componente sin cambiar su comportamiento | Existente, reestructurada |
| `components/SubscriptionsComparisonTable.tsx` | La matriz del Comparativo (D6, D7) | Nueva |
| `test/handlers/subscriptionsCatalog/*` | Campos y validaciones nuevos (D9) | Existente, ampliada |

Nada de esto cambia las rutas (`app/router/routes.tsx`), la navegación (`app/navigation/sections.ts`) ni las capacidades (`features/auth/policy/subscriptionCapabilities.ts`): siguen siendo exactamente las de la 003 (mismas cuatro rutas, mismo recurso `subscriptions`, mismos cuatro permisos).
