# Contrato consumido: registro de componentes monitoreados (`/api/v1/monitored-components`)

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Lo que la administración del registro consume de `maily-system-api` y cómo reacciona a cada respuesta. **Fuente de verdad**: la spec de system-api 005 (FR-001, FR-003, FR-023 a FR-032, FR-036 y FR-037) y su plan (`contracts/openapi-health.yaml` y `contracts/error-catalog.md`), leídos el 2026-10-24 en su worktree, y el formato uniforme de errores de ese servicio, leído en su código (`src/dtos/errors.py` y `src/error_handlers.py`, rama `005-health-monitoring`). Si esos contratos cambian, este documento se revisa.

## Condiciones generales

- **Servicio y cliente**: `maily-system-api`, cliente `subscriptions`, con el token de la sesión solo a su origen. Ruta en la capa `api`: `MONITORED_COMPONENTS_PATH = '/api/v1/monitored-components'`.
- **Permisos**: listar y consultar con `health:read`, registrar con `health:write`, modificar con `health:update` y eliminar con `health:delete`. Cada permiso autoriza solo su operación; el servicio lo pregunta a mailySoft-usuarios en cada petición.
- **Orden de las comprobaciones del servicio** (005 `error-catalog.md`): un cuerpo que no es JSON legible (422 en `body`, antes incluso del acceso; el Backoffice nunca lo envía) → acceso (401, 403 o 503) → datos (422: identificador, campos, «al menos un dato», host de `base_url` en la lista permitida) → existencia (404) → combinación resultante de una modificación por `kind` (422) → código repetido o reservado (409).
- **Base de datos no disponible** (por ejemplo, detenida por horario): las operaciones fallan sin cambiar nada con 500 `internal_error`, sin detalles. El registro vive en la base que se apaga por horario.
- **Sin paginar**: el listado devuelve todos los componentes no eliminados (habilitados y deshabilitados) como un arreglo sin envoltorio, ordenado por `sort_order` y `code`. Máximo esperado: 50 (el servicio declara la excepción del principio IV para este catálogo). El Backoffice pagina en el navegador (Complexity Tracking del plan).
- **Sin efecto inmediato en el agregador de otros procesos**: un cambio invalida la caché del proceso que lo atendió; los demás lo ven cuando vence la suya (≤ `HEALTH_CACHE_SECONDS`). Sin redespliegue.
- **El registro empieza vacío**: después del despliegue se registran mailySoft-usuarios, mailySoft-pacientes y el frontend MailySoft desde el Backoffice.

## El componente registrado (`MonitoredComponentRead`)

| Campo | Tipo | Regla del servicio |
|---|---|---|
| `id` | UUID | Asignado por el servicio |
| `code` | texto | De 2 a 50: minúsculas sin acentos, dígitos y guiones; empieza con letra; sin guion final ni dos seguidos; único entre los no eliminados; `maily-system-api` y `database` reservados |
| `name` | texto | De 1 a 100, guardado sin espacios de los extremos |
| `kind` | `service` o `frontend` | La base de datos solo es integrada |
| `base_url` | texto | Obligatoria; `http` o `https`; con host (nombre ASCII o IP literal); puede llevar puerto y ruta; sin usuario, contraseña, query (ni `?` vacío) ni fragmento; hasta 255; se guarda sin barra final y con esquema y host en minúsculas; host en `HEALTH_ALLOWED_HOSTS` |
| `live_path` | texto | Empieza con una sola `/`; sin segmentos `.` o `..` y sin `\`, `?`, `#`, `%`, espacios ni caracteres de control; hasta 200 (patrón del OpenAPI: `^/[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$`). En un `frontend` es su ruta de salud, obligatoria |
| `ready_path` | texto o `null` | Mismas reglas; en un `service`, obligatoria (por defecto `/health/ready`); en un `frontend`, **debe** ser `null` |
| `info_path` | texto o `null` | Mismas reglas; en un `service`, por defecto `/info`; en un `frontend`, opcional (`null` por defecto) |
| `enabled` | booleano | Por defecto `true` |
| `sort_order` | entero | De 0 a 9999; por defecto 0 |
| `created_at`, `updated_at` | ISO 8601 UTC | La marca de baja lógica no se publica |

Las respuestas del registro son el único lugar donde aparece `base_url`. El Backoffice la muestra como texto, nunca como enlace, y nunca la consulta (FR-007).

## Operaciones

| Id | Operación | Método y ruta | Permiso | Cuerpo | Éxito |
|---|---|---|---|---|---|
| R1 | `list_monitored_components` | `GET /api/v1/monitored-components` | `health:read` | — | 200, arreglo de `MonitoredComponentRead` |
| R2 | `get_monitored_component` | `GET /api/v1/monitored-components/{component_id}` | `health:read` | — | 200, `MonitoredComponentRead` |
| R3 | `create_monitored_component` | `POST /api/v1/monitored-components` | `health:write` | Componente completo (abajo) | 201, `MonitoredComponentRead` |
| R4 | `update_monitored_component` | `PATCH /api/v1/monitored-components/{component_id}` | `health:update` | Solo los campos que cambian | 200, `MonitoredComponentRead` |
| R5 | `delete_monitored_component` | `DELETE /api/v1/monitored-components/{component_id}` | `health:delete` | — | 204 |

- **R3, lo que envía el Backoffice**: `{ "code", "name", "kind", "base_url", "live_path", "ready_path", "info_path", "enabled", "sort_order" }`. Un microservicio lleva sus tres rutas (las propuestas `/health/live`, `/health/ready` e `/info`, o las que escriba la persona); un frontend, `ready_path: null` e `info_path` con su ruta o `null`.
- **R4**: el servicio acepta cualquier campo salvo `id`, las fechas y la baja, y valida el componente resultante como un alta. El Backoffice envía solo lo que cambió de `name`, `base_url`, `live_path`, `ready_path` (solo microservicio), `info_path`, `enabled` y `sort_order`; **nunca** `code` ni `kind` (FR-037). Sin cambios no envía nada: una modificación sin datos es un 422.
- **R5**: baja lógica. Después, R2, R4 y R5 responden 404 y el `code` queda libre (registrarlo de nuevo crea otro `id`).
- El Backoffice valida el UUID de la dirección (`parseComponentId`) antes de llamar a R2, R4 o R5: con un segmento que no es un UUID muestra «Página no encontrada» y no consulta.

## Errores

Formato uniforme del servicio (todos los errores):

```json
{
  "code": "validation_error",
  "message": "Los datos enviados no son válidos.",
  "errors": [
    { "field": "base_url", "message": "La dirección no está permitida para el monitoreo." },
    { "field": "live_path", "message": "La ruta debe empezar con una sola barra." }
  ]
}
```

- `code`: estable, en inglés. `message`: en español, sin detalles técnicos. `errors`: **solo** en `validation_error`, un elemento por dato con problema.
- `field`: el nombre del campo de la API (snake_case, la primera clave del dato: `code`, `name`, `kind`, `base_url`, `live_path`, `ready_path`, `info_path`, `enabled`, `sort_order`), `component_id` para el identificador de la ruta, o `body` cuando el problema es el cuerpo entero (JSON inválido, cuerpo vacío o una modificación sin datos). Los mensajes no repiten el valor recibido; los de `base_url` tampoco revelan la lista permitida.
- Los textos del ejemplo son ilustrativos: el Backoffice **nunca** muestra `message` ni los mensajes de campo (FR-039); decide por `code`, estado y `field`.

| HTTP | `code` | Operaciones | Cuándo | Reacción del Backoffice |
|---|---|---|---|---|
| 401 | `unauthenticated`, `token_expired`, `invalid_token` | todas | Token ausente, vencido o rechazado | Manejo de sesión de la 001 (FR-033) |
| 403 | `permission_denied` | todas | Falta el permiso de la operación | Lecturas: estado sin permiso de la pantalla. Mutaciones: el aviso habitual de falta de permiso; el formulario conserva lo escrito |
| 503 | `authorization_unavailable` | todas | mailySoft-usuarios no respondió | Mensaje genérico con la causa posible de FR-030; las lecturas ofrecen «Reintentar» y se reintentan 2 veces; las mutaciones no se reintentan |
| 422 | `validation_error` | R2 a R5 | Datos fuera de las reglas, campos no reconocidos o no modificables, modificación sin datos, `component_id` que no es UUID, **host fuera de la lista permitida** (un elemento con `field: "base_url"`) | Por `field`: `base_url` → junto a la URL, «Esta dirección no se puede monitorear. Su dominio debe agregarse a la lista permitida del servicio de salud.»; `code`, `name`, `kind`, `live_path`, `ready_path`, `info_path`, `enabled`, `sort_order` → junto a su campo, el texto de formato de ese campo; `body`, `component_id`, un campo desconocido o sin `errors` → error general del formulario (research D16) |
| 404 | `monitored_component_not_found` | R2, R4, R5 | No existe o está eliminado | «Este componente ya no existe.»; se quita el detalle, se invalida el listado y se vuelve a él (FR-039, US3-13) |
| 409 | `monitored_component_code_already_exists` | R3, R4 | El `code` lo usa otro componente no eliminado o está reservado | «Ya existe un componente con este código.» junto al código; no se guarda nada (US3-6, caso límite de los códigos integrados) |
| 500 | `internal_error` | todas | Base de datos no disponible u otro fallo | Mensaje genérico; las lecturas, con «Reintentar» |
| — | red o tiempo agotado (30 s) | todas | Sin respuesta | Como 500 |

- Las mutaciones nunca se reintentan solas y su acción se deshabilita mientras están en curso (FR-039, constitución IV).
- `monitored_component_not_found` y `monitored_component_code_already_exists` son los dos únicos códigos nuevos de la API (005 FR-030).

## Confirmado con el plan de system-api 005

Revisado el 2026-10-24 contra su `contracts/error-catalog.md` y su `contracts/openapi-health.yaml`:

1. El rechazo por host fuera de `HEALTH_ALLOWED_HOSTS` (o sin lista) llega como `validation_error` con un elemento `field: "base_url"`: el Service lo lanza con el formato de Pydantic y lo traduce el mismo `translate_validation_errors`, así que el cuerpo es idéntico al de la validación de FastAPI. Lo mismo para la combinación resultante de un `PATCH` (por ejemplo, `ready_path` con valor en un frontend).
2. Los nombres de operación quedaron fijados (`list_monitored_components`, `get_monitored_component`, `create_monitored_component`, `update_monitored_component` y `delete_monitored_component`); el Backoffice no depende de ellos. El alta devuelve además `Location`, que el Backoffice no usa.
3. Que R4 con `kind` distinto del actual siga permitido en el servicio no afecta: el Backoffice no lo ofrece.
