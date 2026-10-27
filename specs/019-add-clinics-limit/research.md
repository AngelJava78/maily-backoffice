# Investigación: Límite de clínicas por tipo y ajustes visuales del formulario

**Feature**: `019-add-clinics-limit` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md)

Esta feature no abre preguntas de proceso de negocio (las resolvió `/speckit-clarify`) ni de tecnología para los dos cambios visuales (reutilizan componentes ya en el proyecto). La única área que exige investigación real es el contrato del límite de clínicas en la API de suscripciones, que **todavía no está implementado**: se predice por la mejor fuente disponible y se documenta como tal. No queda ningún `NEEDS CLARIFICATION`.

## D1. El control de tipo se redibuja como un interruptor, reutilizando el patrón de Autoconsumo

**Decisión**: `SubscriptionTypeField.tsx` deja de usar `ToggleButtonGroup` con dos `ToggleButton` y pasa a envolver un `Switch` dentro de `FormControlLabel`, exactamente el patrón que ya usa `SelfServiceAndTrialFields.tsx` para Autoconsumo (`Switch` + `Typography` del nombre en negrita + `Typography` secundaria con la explicación). El `checked` del interruptor es `value === SUBSCRIPTION_TYPE.ENTERPRISE` (apagado = Individual, su valor por defecto; encendido = Empresarial); su `onChange` llama al `onChange` del campo con `SUBSCRIPTION_TYPE.ENTERPRISE` o `SUBSCRIPTION_TYPE.INDIVIDUAL` según el nuevo estado. El nombre y la explicación mostrados junto al interruptor cambian con el valor vigente (el mismo texto de `messages.subscriptions.types.catalog` que ya existía). El `fieldset`/`legend`/`aria-describedby` para el texto de inmutabilidad en la edición (018, FR-004) no cambian: solo cambia lo que hay dentro de ellos.

**Alternativas**: mantener `ToggleButtonGroup` pero solo con estilos más compactos — se descarta: el pedido pide explícitamente "un botón similar a Autoconsumo", y el componente de Autoconsumo ya es exactamente ese patrón, reutilizarlo evita reinventar un estilo propio.

## D2. Autoconsumo nace activado: un solo valor por defecto cambia

**Decisión**: en `SubscriptionCreatePage.tsx`, la constante `EMPTY.selfService` pasa de `false` a `true`. Ningún otro archivo cambia: `SelfServiceAndTrialFields.tsx`, el esquema de validación y el envío de `self_service` ya son agnósticos a su valor inicial.

**Alternativas**: ninguna; es un cambio de una línea.

## D3. El límite de clínicas es un campo propio, no un quinto elemento de `ClinicLimitsFields`

**Decisión**: `ClinicLimitsFields.tsx` modela sus cuatro campos como uniformes (siempre obligatorios, siempre editables, mismo rango 0 a 1 000 000, mapeados desde un arreglo `FIELDS`). El límite de clínicas no encaja ahí: depende del tipo vigente en el mismo formulario (otro campo), tiene un rango distinto (1 a 100) y puede estar deshabilitado. Se crea `ClinicsLimitField.tsx`, un componente propio que lee el tipo vigente con `useWatch({ control, name: 'subscriptionTypeId' })` (mismo mecanismo que ya usa `SubscriptionPreviewPanel` para reflejar el formulario en vivo) y decide si se muestra fijo en 1 y deshabilitado, o editable de 1 a 100. Se coloca junto a `SubscriptionTypeField` en `SubscriptionFormFields.tsx`, no dentro de la fila de los otros cuatro límites, porque conceptualmente depende del tipo, no de la clínica.

**Alternativas**: agregar una bandera `dependsOnType` a `ClinicLimitsFields` para que acepte un quinto campo condicional — se descarta (YAGNI, constitución I): generaliza un componente que hoy solo tiene un caso de uso uniforme, por un único campo que de verdad es distinto.

## D4. El contrato de `clinics_limit` en la API de suscripciones: predicción documentada, no verificación

**Decisión**: a diferencia del tipo de suscripción (018, verificado contra código ya fusionado), `clinics_limit` **no está implementado todavía** en `maily-system-api`. Existe `specs/007-add-clinics-limit/spec.md` en ese repositorio (mismo nombre de campo, misma regla exacta que esta feature), pero su `plan.md` sigue siendo la plantilla sin llenar: sin `research.md`, `data-model.md` ni `contracts/`. Se usa esa spec como la mejor fuente del contrato y se predice su forma exacta por analogía directa con código ya fusionado de la misma API:

- **Lectura y creación**: un entero plano junto a los otros cuatro límites (`consulting_rooms_limit`, etc.), no un objeto anidado como `subscription_type`. Obligatorio al crear (`007` FR-001).
- **Rango de forma** (sin importar el tipo): de 1 a 100, con el mismo patrón de mensaje que ya usan los otros cuatro límites — verificado en `src/messages.py` de esa API: `SUBSCRIPTION_CONSULTING_ROOMS_LIMIT_INVALID_MESSAGE = "El límite de consultorios debe ser un número entero de 0 a 1 000 000."`; se predice `"El límite de clínicas debe ser un número entero de 1 a 100."` para el caso que falte, no sea entero, o esté fuera de 1 a 100.
- **Regla cruzada "exactamente 1 si Individual"** (`007` FR-002): no cabe en una restricción simple de un campo (depende del tipo), así que se predice como una comprobación de servicio, con un mensaje propio distinto del de rango.
- **Inmutabilidad al modificar una suscripción Individual** (`007` FR-005): se predice con el mismo mecanismo que ya usa `subscription_type_id` desde la 006 (rechazo completo de la solicitud si el campo viene presente, verificado en `src/error_handlers.py`: `"extra_forbidden": "forbidden"`, con un mensaje propio en vez del genérico), pero con una diferencia importante: `subscription_type_id` **nunca** se acepta al modificar, mientras que `clinics_limit` sí se acepta al modificar una suscripción que no sea Individual (`007` FR-006). Por eso no puede ser un campo ausente del esquema de actualización (como `subscription_type_id`): tiene que ser una comprobación de negocio que mire el tipo vigente de la suscripción antes de decidir si el campo está permitido.

Esta predicción se documenta para poder construirse (esquema del formulario, simulador de pruebas) de inmediato, sin esperar a que la API termine su propia `/speckit-plan`. Si el contrato real usa otro texto o código al implementarse, el cambio queda aislado a los mensajes del simulador y del mapa de errores (`subscriptionErrors.ts`), sin tocar la estructura del formulario ni las reglas de negocio ya definidas aquí.

**Alternativas**: esperar a que `maily-system-api` implemente y fusione `007-add-clinics-limit` antes de planear esta feature — se descarta: el pedido pide avanzar ya, la regla de negocio exacta ya está acordada en ambos lados (coincide palabra por palabra con la spec de la API), y el patrón de esta sección (research D4 de la 018, D9 de la 012) ya acepta construir y probar contra una predicción bien fundamentada cuando el contrato real tarda.

## D5. El esquema del formulario valida el límite de clínicas en dos capas, igual que la API que se predice

**Decisión**: `subscriptionFormSchema` valida `clinicsLimit` en dos pasos, reflejando la misma separación que D4 predice del lado de la API: (1) a nivel de campo, con el mismo patrón que ya usan los otros cuatro límites (solo dígitos, de 1 a 7 caracteres, como `CLINIC_LIMIT_PATTERN`), permitiendo de forma el rango completo 1-100 que la API acepta hoy para cualquier tipo; (2) a nivel del objeto completo, con `.superRefine()`, la regla cruzada con `subscriptionTypeId`: exactamente 1 si es Individual, de 1 a 100 si no. En la práctica, la rama "Individual" de esa regla cruzada nunca debería dispararse en el uso normal: D6 asegura que el control de tipo deja `clinicsLimit` en "1" en el mismo evento en que cambia a Individual, y el campo queda deshabilitado — la validación existe como respaldo, igual que ya ocurre con otras reglas que la interfaz impide de antemano (research D4 de la 012, sobre los módulos).

**Alternativas**: ninguna; es la continuación directa del patrón ya usado por `trialDaysSchema`/`clinicLimitSchema` en este mismo archivo, separado en dos pasos solo porque esta regla, a diferencia de esas, depende de otro campo.

## D6. El interruptor de tipo deja el límite de clínicas en un valor válido para el tipo nuevo, en el mismo evento

**Decisión**: el `onChange` de `SubscriptionTypeField` (ya sea por el interruptor de D1 o, en el futuro, por cualquier otro control) es quien decide el nuevo `subscriptionTypeId` **y** dónde deja `clinicsLimit`: a "1" siempre, tanto si el tipo nuevo es Individual (donde queda fijo y deshabilitado) como si es Empresarial (donde queda editable, con 1 como valor inicial que el operador puede cambiar, Clarifications). `ClinicsLimitField` no necesita detectar "cuándo acaba de cambiar el tipo": solo lee el tipo vigente (D3) para decidir si se deshabilita, y el valor que ve ya es el correcto porque quien cambió el tipo lo dejó así en el mismo evento.

**Alternativas**: que `ClinicsLimitField` reaccione por su cuenta (con un efecto) al cambio de `subscriptionTypeId` para reiniciar su propio valor — se descarta (constitución I: `useEffect` se reserva para sincronizar con sistemas externos, no para derivar estado): el cambio de ambos campos es una sola decisión del mismo evento de usuario (cambiar el tipo), no dos eventos independientes que haya que sincronizar después.
