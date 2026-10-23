# Data Model: Módulos (013-manage-modules)

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Investigación**: [research.md](research.md)

Todos los tipos son del frontend (dominio, camelCase); los DTO de la API (snake_case) se convierten
en `src/features/modules/api/modulesApi.ts` y nunca cruzan hacia los componentes (constitución II).

## Catálogos fijos (research D4)

```text
MODULE_TYPE = { SYSTEM: 1, CLINIC: 2 } as const
type ModuleTypeId = (typeof MODULE_TYPE)[keyof typeof MODULE_TYPE]

MODULE_STATUS = { ACTIVE: 1, BLOCKED: 2 } as const   // 3 Eliminado nunca se usa aquí
type ModuleStatusId = (typeof MODULE_STATUS)[keyof typeof MODULE_STATUS]

MODULE_ACTION_ORDER = ['read', 'write', 'update', 'delete'] as const
type ModuleActionKey = (typeof MODULE_ACTION_ORDER)[number]
MODULE_ACTION_ID: Record<ModuleActionKey, 1 | 2 | 3 | 4> = { read: 1, write: 2, update: 3, delete: 4 }
REQUIRED_ACTION_KEY: ModuleActionKey = 'read'   // siempre marcada (FR-018)
```

Los cuatro `id` del tipo y los cuatro de la acción son los que ya fija
`specs/013-modules-permissions-catalogs/data-model.md` de `mailySoft-usuarios`; no se leen de la API
(research D4).

Los cuatro módulos protegidos (FR-003, FR-021, FR-024) son una lista fija por `key`:

```text
PROTECTED_MODULE_KEYS = ['users', 'roles', 'permissions', 'modules'] as const
```

## Entidades y relaciones

```text
MODULE_TYPE (Sistema/Clínica) 1 ──┬── * SystemModule ── 0..4 acciones marcadas (ModuleActionKey)
MODULE_STATUS (Activo/Bloqueado)1 ─┘         │
                                               └── permissionIdByAction: Map<ModuleActionKey, number>
                                                    (el id real del permiso "key:accion" en la API,
                                                     solo de las acciones marcadas)
```

- **SystemModule**: el módulo tal como lo ve esta pantalla, ya cruzado con sus permisos (research
  D3). Es de solo lectura para los componentes; se construye únicamente en la capa `api`.
- No hay una entidad "Permiso" propia de esta feature: un permiso puntual solo existe como el par
  (`ModuleActionKey`, su `id` numérico) dentro de `permissionIdByAction`, porque es lo único que
  necesita la pantalla para marcar (`POST`) o desmarcar (`DELETE {id}`) una acción (research D5).

## `SystemModule`

| Campo | Tipo | De dónde sale |
|---|---|---|
| `id` | `number` | `GET /modules` |
| `key` | `string` | `GET /modules`; fija desde que se crea (FR-015) |
| `name` | `string` | `GET /modules`; editable |
| `description` | `string \| null` | `GET /modules`; editable |
| `sortOrder` | `number` | `GET /modules`; editable |
| `createdAt` | `string` (ISO 8601) | `GET /modules` |
| `statusId` | `ModuleStatusId` | `GET /modules` (`status.id`) |
| `typeId` | `ModuleTypeId` | `GET /modules` (`type.id`); fijo desde que se crea (FR-015) |
| `activePermissionsCount` | `number` | `GET /modules` (informativo; no es la fuente de `actions`) |
| `actions` | `ReadonlySet<ModuleActionKey>` | cruce con `GET /permissions` (research D3) |
| `permissionIdByAction` | `ReadonlyMap<ModuleActionKey, number>` | mismo cruce; solo las claves de `actions` |
| `isProtected` | `boolean` | `PROTECTED_MODULE_KEYS.includes(key)` (derivado, no viaja en el DTO) |

Validación con Zod en la frontera (constitución II): `key` seguida del patrón
`^[a-z][a-z0-9_]*$` (máx. 50), `name` (1 a 100), `description` opcional (hasta 500), `sortOrder`
entero, `statusId`/`typeId` limitados a los valores de los catálogos fijos de arriba.

## `ModuleCapabilities` (`src/features/auth/policy/moduleCapabilities.ts`, research D8)

| Campo | Permiso |
|---|---|
| `canCreate` | `modules:write` |
| `canEdit` | `modules:update` |
| `canBlock` | `modules:update` |
| `canUnblock` | `modules:update` |
| `canDelete` | `modules:delete` |

## Formulario (`src/features/modules/schemas/moduleForm.ts`)

| Campo | Regla | Alta | Edición |
|---|---|---|---|
| `type` | uno de `MODULE_TYPE`, obligatorio | editable | fijo, solo lectura |
| `key` | `^[a-z][a-z0-9_]*$`, 1-50, obligatorio | editable | fijo, solo lectura |
| `name` | recortado, 1-100, obligatorio | editable | editable |
| `description` | opcional, hasta 500 | editable | editable |
| `sortOrder` | entero opcional; vacío = al final de **todos** los módulos, sin importar su tipo (mayor `sortOrder` entre los módulos no eliminados + 10, calculado con lo ya cargado por la lista, no con una llamada aparte — research D13) | editable | editable |
| `actions` | `ReadonlySet<ModuleActionKey>`, siempre incluye `read` | las 4 marcadas por omisión (FR-012) | las que ya tenía el módulo |

`toCreateModuleBody(values)` da `{ key, name, type_id, description?, sort_order? }` para `POST
/modules`, y por separado la lista de acciones a crear como permisos (research D11).

`toUpdateModuleBody(initial, values)` compara `name`/`description`/`sortOrder` contra `initial` y
da solo lo que cambió para `PATCH /modules/{id}` (`null` si nada cambió, igual que ya hace
`toUpdateSubscriptionBody`); nunca incluye `key` ni `type_id`. Las acciones que cambiaron
(agregadas/quitadas) se devuelven aparte, para las llamadas de `POST`/`DELETE` de permisos de
research D11, no como parte del cuerpo del `PATCH`.

`withActionChecked(selected, action, checked)` (en `src/features/modules/policy/`, pura, con su
propia prueba): igual forma que `withModuleChecked` de Suscripciones, pero con una sola regla fija
—`read` nunca se puede desmarcar (FR-018)— en vez de un mapa de requisitos.

## `ModulesLocation` (`src/features/modules/schemas/modulesLocation.ts`, research D10)

| Parámetro de la URL | Valores | Por omisión |
|---|---|---|
| `type_id` | `1` (Sistema), `2` (Clínica), ausente = Todos | ausente |
| `status_id` | `1` (Activos), `2` (Bloqueados) | `1` (ausente en la URL) |
| `q` | texto libre | `''` (ausente en la URL) |
| `edit` | id de un módulo | ausente |
| `new` | `1` | ausente |

`edit` y `new` son excluyentes entre sí (abrir uno cierra el otro); ninguno de los dos se escribe en
la URL cuando no hay panel abierto, igual que el resto de los parámetros por omisión no se escriben
(mismo criterio que `subscriptionsLocation.ts`).

## `ModuleErrorOutcome` (`src/features/modules/api/moduleErrors.ts`, research D8)

Misma forma que `SubscriptionErrorOutcome`: `{ kind: 'field', message, fields }` o `{ kind: 'form' |
'notFound' | 'protected' | 'statusUnchanged' | 'retryable' | 'forbidden' | 'unexpected', message
}`. El mapa completo de códigos de error reales está en
[contracts/modules-service.md](contracts/modules-service.md).

## Simulador de pruebas (`src/test/handlers/modulesCatalog/`)

Estado en memoria con dos colecciones —módulos y permisos—, reutilizando las mismas reglas que ya
simula `mailySoft-usuarios` para `mailySoft-usuarios` (unicidad de `key`/`name`, módulos protegidos,
`sort_order` por omisión, formato de `key`), más las operaciones de `permissions` (crear, eliminar)
que esta pantalla usa. El catálogo inicial del simulador reproduce los 23 módulos reales de las
páginas 11 a 14 del mockup (8 de Sistema, 15 de Clínica, con sus acciones exactas), para que las
pruebas de componentes puedan usar datos realistas sin tener que inventarlos cada vez.
