# Modelo de datos: Administración de Suscripciones

**Feature**: `003-manage-subscription-types` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

El Backoffice no persiste datos. Este modelo describe los modelos de dominio del frontend que añade la 003, derivados de las respuestas de la API de suscripciones ([contracts/subscriptions-service.md](contracts/subscriptions-service.md)), del estado de la URL y del formulario. Cada entidad tiene un único esquema Zod (constitución II) y la capa `api` de la feature convierte los DTO (`snake_case`) a modelos de dominio (`camelCase`). Todo vive en `features/subscriptions`, salvo las capacidades (`features/auth/policy`) y el formato de moneda (`shared/lib`).

## Entidades

### `Subscription`

Corresponde a *Suscripción* de la spec. Sale de `SubscriptionRead` (S1 a S5).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero de 1 a 2 147 483 647 | `id` | |
| `name` | texto no vacío | `name` | Se muestra tal cual (la API lo guarda recortado, de 1 a 100 caracteres). |
| `description` | texto o `null` | `description` | `null` = sin descripción. |
| `monthlyPrice` | texto decimal | `monthly_price` | `^\d{1,8}\.\d{2}$`: pesos mexicanos con dos decimales («4500.00»), que la API siempre envía así. Se compara en centavos (`toCents`). |
| `features` | lista de textos | `features` | En el orden guardado; puede estar vacía. Los límites de escritura (20 elementos de 1 a 150) no se vuelven a comprobar al leer. |
| `status` | `{ id, name }` | `status` | Se decide por `id` ([`SubscriptionStatus`](#subscriptionstatus)). |
| `clinicsCount` | entero ≥ 0 o `null` | `clinics_count` | `null` = no disponible. Un campo **ausente** también es `null` (el OpenAPI publicado no lo marca como obligatorio). Nunca se inventa un 0. |
| `createdAt`, `updatedAt` | fecha y hora con zona | `created_at`, `updated_at` | ISO 8601. |

El catálogo (S1) es una lista de `Subscription`. Si llegara una con estatus Eliminada (4), que la API no devuelve, se descarta; un detalle (S2) con ese estatus se trata como no encontrado.

### `SubscriptionStatus`

`SUBSCRIPTION_STATUS = { ACTIVE: 1, INACTIVE: 2, BLOCKED: 3, DELETED: 4 }`. Las decisiones usan el id, nunca el nombre, que es un dato del catálogo y puede cambiar (FR-016).

| Id | Texto en pantalla | Grupo del listado | Etiqueta |
|---|---|---|---|
| 1 | «Activa» (`messages`) | Primero | Verde (`success`) |
| 2 | «Inactiva» (`messages`) | Segundo | Gris (`default`) |
| 3 | «Bloqueada» (`messages`) | Segundo | Naranja (`warning`) |
| 4 | — | Nunca se muestra | — |
| Otro | El nombre que da la API | Segundo | Neutra con contorno (`default`, `outlined`) |

### Máquina de estados

| Desde | Acción | Hacia | Notas |
|---|---|---|---|
| — | Crear (S3) | Activa | Siempre nace Activa; el formulario no pide estatus. |
| Activa, Inactiva, Bloqueada o desconocido | Cambiar el estatus (S5) | Activa, Inactiva o Bloqueada, distinto del actual | En cualquier dirección, con o sin clínicas. Inactivar y bloquear piden confirmación; activar no. Pedir el actual: `409 subscription_status_unchanged`. |
| Cualquier estatus vigente | Eliminar (S6) | Eliminada | Solo sin clínicas y con la comprobación disponible; sin vuelta atrás; el nombre queda libre. |

### Orden y página del catálogo

`sortCatalog(items)` (función pura, FR-015) ordena por:

1. grupo: Activa (1) antes que cualquier otro estatus;
2. precio mensual ascendente, en centavos;
3. nombre ascendente con `Intl.Collator('es', { sensitivity: 'accent' })` (sin distinguir mayúsculas);
4. id ascendente (desempate final: el orden es total).

`pageOf(sorted, page, pageSize)` devuelve un `CatalogPage`:

| Campo | Tipo | Reglas |
|---|---|---|
| `items` | lista de `Subscription` | Como mucho `pageSize` elementos. |
| `total` | entero ≥ 0 | Suscripciones del catálogo. |
| `pages` | entero ≥ 0 | `ceil(total / pageSize)`; 0 con el catálogo vacío. |
| `page` | entero ≥ 1 | La pedida o, si es posterior a la última, la última (`pages`); 1 con el catálogo vacío. |
| `pageWasClamped` | booleano | La página pedida no existía: el listado reemplaza la URL por la que se muestra. |

### `SubscriptionsLocation` (estado de la URL de `/subscriptions`)

`parseSubscriptionsSearchParams(URLSearchParams)` (Zod) produce `{ page, pageSize }` ([contracts/app-routes.md](contracts/app-routes.md)):

| Campo | Regla | Por defecto |
|---|---|---|
| `page` | Entero ≥ 1 escrito con dígitos | 1 |
| `pageSize` | 10, 25 o 50 | 10 |

Un valor inválido se sustituye por el de por defecto; `toSubscriptionsSearchParams` omite los valores por defecto. Constantes: `PAGE_SIZE_OPTIONS = [10, 25, 50]` y `DEFAULT_PAGE_SIZE = 10`.

### `parseSubscriptionId`

El id de la dirección (`/subscriptions/:subscriptionId`): solo dígitos, sin ceros a la izquierda, de 1 a 2 147 483 647. Devuelve el número o `null`; con `null`, la pantalla y el título son «Página no encontrada».

### `SubscriptionDetailLocationState`

Estado de navegación que viaja del listado al detalle, al alta y a la edición, y de vuelta al listado tras eliminar. Se valida con Zod y un valor ajeno o inválido se ignora:

| Campo | Tipo | Reglas |
|---|---|---|
| `listSearch` | texto opcional | Hasta 300 caracteres; empieza por `?` y solo contiene las claves `page` y `page_size`; si no, se descarta. |

### Formulario: `SubscriptionFormValues`

El mismo esquema (`subscriptionFormSchema`) sirve para crear y para editar. Los valores son `camelCase` y los esquemas no transforman nada (los tipos de entrada y de salida coinciden).

| Campo | Tipo | Reglas (mensajes en `es.ts`) |
|---|---|---|
| `name` | texto | Recortado; obligatorio; hasta 100. |
| `description` | texto | Recortado; hasta 500; vacío = sin descripción. |
| `monthlyPrice` | texto | Recortado; obligatorio; `^\d{1,8}(\.\d{1,2})?$`: solo dígitos y un punto decimal opcional con hasta dos decimales, de 0 a 99,999,999.99. Comas, «$» y cualquier otro carácter son error (aclaración 8). |
| `features` | lista de `{ value }` | De 0 a 20 (`MAX_FEATURES`); cada `value`, recortado, de 1 a 150: vacío o solo espacios es error junto a ese elemento. |

Valores iniciales: en el alta, `{ name: '', description: '', monthlyPrice: '', features: [] }`; en la edición, los de la suscripción (`description ?? ''`, `monthlyPrice` tal como llega y cada elemento como `{ value }`).

**`toCreateSubscriptionBody(values)`** (S3): `{ name, description?, monthly_price, features }`, con los textos recortados; `description` solo si no está vacía; `monthly_price` como texto (la API acepta número o texto, y el texto no pierde precisión); `features` puede ser `[]`.

**`toUpdateSubscriptionBody(initial, values)`** (S4): un objeto con solo lo que cambió respecto de `initial` (la suscripción con que se abrió el formulario), o `null` si no cambió nada:

| Dato | Cambió si… | Se envía |
|---|---|---|
| `name` | el texto recortado es distinto (también si solo cambian mayúsculas) | `name` recortado |
| `description` | el texto recortado es distinto de `initial.description ?? ''` | el texto, o `null` si quedó vacío |
| `monthly_price` | `toCents` del texto es distinto del de `initial` | el texto recortado |
| `features` | cambia el número de elementos o algún elemento recortado | la lista completa, recortada |

Con `null` no hay solicitud: la pantalla vuelve al detalle con el aviso de que no había cambios (aclaración 9). Ningún cuerpo lleva id, estatus, número de clínicas ni fechas (FR-021).

**Errores del servidor por campo**: `name`, `description`, `monthly_price` y `features` de la API van a `name`, `description`, `monthlyPrice` y `features` (este, junto a la lista entera); cualquier otro (`body`, `status`, uno desconocido) es un error general del formulario. Los textos son propios (`messages.subscriptions.errors`), nunca los de la API (FR-010). El mapa es un `Map` (sin aserciones `as`).

### `SubscriptionCapabilities`

Resultado de la función pura `getSubscriptionCapabilities(access)` (`features/auth/policy`), que solo usa `can()`; `app` lo entrega a las pantallas.

| Campo | Permisos (además de `subscriptions:read`) |
|---|---|
| `canCreate` | `subscriptions:write` |
| `canEdit` | `subscriptions:update` |
| `canChangeStatus` | `subscriptions:update` |
| `canDelete` | `subscriptions:delete` |

### Acciones del detalle

| Acción | Se muestra si | Reglas |
|---|---|---|
| Editar | `canEdit` | Cualquier estatus vigente. |
| Cambiar estatus | `canChangeStatus` | `getStatusTargets(statusId)`: Activa, Inactiva y Bloqueada menos el actual (con un id desconocido, los tres). Confirmación si el destino no es Activa. |
| Eliminar | `canDelete` | `getDeleteAvailability(clinicsCount)`: `{ kind: 'allowed' }` con `null` o 0; `{ kind: 'blocked', clinics }` con 1 o más (botón deshabilitado y motivo visible). |

### `SubscriptionErrorOutcome` (traducción de `ApiError`)

Función pura `describeSubscriptionError(error, operation)`, con `operation` entre `catalog`, `get`, `create`, `update`, `changeStatus` y `delete`:

| `kind` | Cuándo | Efecto |
|---|---|---|
| `field` | `subscription_name_already_exists` (en `name`); `validation_error` con campos conocidos | Error junto al campo, con texto propio. |
| `form` | `validation_error` sin campo conocido | Error general del formulario. |
| `notFound` | `subscription_not_found` | Aviso y nueva consulta: la pantalla pasa a «Suscripción no encontrada» con enlace al listado. |
| `statusUnchanged` | `subscription_status_unchanged` | Aviso y nueva consulta del detalle. |
| `hasClinics` | `subscription_has_clinics` | Aviso y nueva consulta del detalle, que muestra el número y deshabilita «Eliminar». |
| `clinicsUnavailable` | `clinics_check_unavailable` | Aviso con su motivo; no cambió nada y se puede reintentar. |
| `retryable` | `authorization_unavailable`, `internal_error`, red, tiempo agotado u otro 5xx | Aviso genérico; se puede reintentar. |
| `forbidden` | `permission_denied` (403) | Ninguno propio: el aviso global de la 001 ya informó. |
| `unexpected` | Cualquier otro (respuesta fuera de contrato, código desconocido) | Aviso genérico. |

Forma del resultado: `{ kind, message, fields? }`. `message` sale de `messages.subscriptions.errors` y `fields` (solo en `field`) asocia cada campo del formulario con su texto. `toNotification(outcome)` da la gravedad del aviso: información para nada; advertencia para `notFound`, `statusUnchanged` y `hasClinics`; error para el resto; ninguno para `forbidden`.

## Claves de TanStack Query y efecto de las mutaciones (constitución III)

Las claves salen de la factoría `subscriptionKeys`; nunca se escriben a mano en los componentes.

| Factoría | Clave | Datos |
|---|---|---|
| `subscriptionKeys.catalog()` | `['subscriptions', 'catalog']` | Lista de `Subscription` ordenada (`select: sortCatalog`); la página se corta en el render. |
| `subscriptionKeys.detail(id)` | `['subscriptions', 'detail', id]` | `Subscription` (S2). |

| Mutación | Efecto en la caché |
|---|---|
| Crear | Guarda `detail(id)` con lo que devolvió la API; invalida `catalog()`. |
| Modificar | Guarda `detail(id)`; invalida `catalog()`. |
| Cambiar el estatus | Guarda `detail(id)`; invalida `catalog()`. |
| Eliminar | Espera, como mucho `REFRESH_WAIT_MS` (10 s), a que `catalog()` se vuelva a consultar; tras volver al listado, quita `detail(id)`. |
| Rechazo `notFound`, `statusUnchanged` o `hasClinics` | Invalida `detail(id)` y `catalog()` y espera, como mucho `REFRESH_WAIT_MS`: la mutación sigue pendiente hasta que la pantalla muestra lo vigente. |
| Cualquier otro rechazo | Nada: no cambió nada. |

No hay actualizaciones optimistas (constitución III): la pantalla cambia cuando la API responde. Al cerrar sesión se vacía toda la caché (001).

## Trazabilidad con los requisitos

| Entidad o regla | Requisitos |
|---|---|
| `Subscription`, `SubscriptionStatus` | FR-002, FR-003, FR-014, FR-016, FR-019, FR-020 |
| `sortCatalog`, `pageOf`, `SubscriptionsLocation`, `catalog()` | FR-001, FR-015, SC-002, SC-007 |
| `SubscriptionDetailLocationState`, `parseSubscriptionId` | FR-003, FR-011 |
| `SubscriptionFormValues`, `toCreateSubscriptionBody` | FR-005, FR-006, FR-021, FR-023 |
| `toUpdateSubscriptionBody` | FR-008, FR-012, FR-021 |
| `SubscriptionCapabilities`, acciones del detalle | FR-013, FR-017, FR-018, SC-010 |
| Máquina de estados | FR-017, FR-018 |
| `SubscriptionErrorOutcome` | FR-010, FR-012, SC-005 |
| Claves y efecto de las mutaciones | FR-007, FR-011, FR-012 |
