# Contrato consumido: servicio de usuarios (solo lectura)

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17

Resume solo lo que consume la feature 001. La fuente de verdad es el repositorio del servicio (copia local `C:\maily\code\mailySoft-usuarios`, `origin` `Quint4n4/mailySoft-usuarios`): `specs/004-users/contracts/openapi-users.yaml`, `specs/006-users-roles/contracts/openapi-user-roles.yaml`, `specs/005-roles-permissions/contracts/openapi-role-permissions.yaml` y el `error-catalog.md` de cada carpeta. Verificado leyendo `src/routers`, `src/dtos`, `src/services` y `src/error_handlers.py` el 2026-10-17.

## Condiciones generales

| Tema | Valor |
|---|---|
| URL base | `VITE_USERS_API_URL` (en desarrollo `/proxy/users`, que el proxy de Vite reenvía a `http://127.0.0.1:8000`). Las rutas empiezan en `/api/v1/...`. |
| Cabeceras | `Accept: application/json`; `Authorization: Bearer <access token>` (el servicio hoy lo ignora: no controla el acceso). |
| CORS | El servicio no lo configura: usar el proxy de Vite o un proxy inverso del mismo origen. |
| Fechas | ISO 8601 con zona horaria. |
| Estatus | `{ id, name }`; decidir siempre por `id`: 1 Activo, 2 Bloqueado, 3 Eliminado. |
| Formato de error | `{ "code": "<codigo_en_ingles>", "message": "<texto_en_español>" }` y, solo en `validation_error`, `"errors": [{ "field", "message" }]`. |

## C1. Buscar un usuario por su identificador de Auth0

`GET /api/v1/users/by-auth0-id?auth0_id=<sub>`

- El identificador va en la consulta (suele contener `|`, que debe codificarse en la URL). Coincidencia exacta, distingue mayúsculas, **cualquier estatus**.
- Respuesta `200` (`UserRead`):

```json
{
  "id": 121,
  "auth0_id": "auth0|abc123",
  "email": "ana@clinica.com",
  "first_name": "Ana",
  "paternal_last_name": "Pérez",
  "maternal_last_name": "Gómez",
  "status": { "id": 1, "name": "Activo" },
  "created_at": "2026-10-15T14:20:11.032Z",
  "updated_at": "2026-10-15T14:20:11.032Z"
}
```

| Estado | `code` | Uso en la interfaz |
|---|---|---|
| 404 | `user_not_found` | Denegado: cuenta no registrada. |
| 422 | `validation_error` | Error de contrato (parámetro vacío); se registra sin datos personales. |
| 500 | `internal_error` | Reintentable. |

## C2. Roles activos de un usuario

`GET /api/v1/users/{user_id}/roles`

- Devuelve, sin paginar y ordenados por nombre, **solo los roles con estatus Activo** de un **usuario activo**. Lista vacía si no tiene roles.
- Respuesta `200` (`RoleRead[]`):

```json
[
  { "id": 4, "name": "Marketing", "description": null,
    "created_at": "2026-10-15T05:57:30.521Z", "status": { "id": 1, "name": "Activo" } },
  { "id": 5, "name": "Owner", "description": null,
    "created_at": "2026-10-15T05:57:30.521Z", "status": { "id": 1, "name": "Activo" } }
]
```

| Estado | `code` | Uso en la interfaz |
|---|---|---|
| 404 | `user_not_found` | Denegado: cuenta no registrada (carrera). |
| 409 | `user_blocked`, `user_deleted` | Denegado: cuenta no activa (carrera). |
| 422 / 500 | `validation_error` / `internal_error` | Error de contrato / reintentable. |

## C3. Permisos activos de un role

`GET /api/v1/roles/{role_id}/permissions`

- Devuelve, sin paginar y ordenados por nombre, **solo los permisos con estatus Activo** de un **role activo**. Lista vacía si no tiene permisos.
- Respuesta `200` (`PermissionRead[]`):

```json
[
  { "id": 25, "name": "users:read", "description": null,
    "created_at": "2026-10-15T05:57:30.521Z", "status": { "id": 1, "name": "Activo" } },
  { "id": 26, "name": "users:write", "description": null,
    "created_at": "2026-10-15T05:57:30.521Z", "status": { "id": 1, "name": "Activo" } }
]
```

| Estado | `code` | Uso en la interfaz |
|---|---|---|
| 404 | `role_not_found` | El role ya no está activo: se descarta de los roles autorizados. |
| 422 / 500 | `validation_error` / `internal_error` | Error de contrato / reintentable. |

Nombre de permiso: `recurso:acción` en minúsculas (`^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`). Datos iniciales: 15 recursos × 4 acciones (`read`, `write`, `update`, `delete`) sin asignar a ningún role; el Backoffice usa `users`, `subscriptions` y `tenants`.

## Orden de las llamadas

C1 → C2 → C3 (una por cada role autorizado, en paralelo). Ver D7 de [../research.md](../research.md).

## Validación en el cliente

Cada respuesta se valida con Zod en la capa `api` de `features/users` y `features/roles`; una respuesta que no cumple el esquema se trata como fallo de contrato (error, sin mostrar datos parciales). Las pruebas simulan el servicio con MSW usando estos mismos esquemas.
