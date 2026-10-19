# Contrato consumido: servicio de usuarios (solo lectura)

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-18

Resume solo lo que consume la feature 001. La fuente de verdad es el repositorio del servicio (copia local `C:\maily\code\mailySoft-usuarios`, `origin` `Quint4n4/mailySoft-usuarios`): su spec `008-auth0-access-control` (`contracts/permission-matrix.md`, `contracts/auth0-integration.md`, `contracts/error-catalog.md`) y los OpenAPI de `specs/004-users`. Verificado leyendo `src/routers`, `src/dtos` y `src/security.py` el 2026-10-18.

> **Estado de M1**: la consulta `me` es una **propuesta pendiente de implementar en el servicio** (decisión de producto, aclaración 14). La solicitud lista para `/speckit-specify` está en [users-service-me-request.md](users-service-me-request.md). Mientras no exista, la 001 se construye y se prueba contra MSW con este mismo contrato.

## Condiciones generales

| Tema | Valor |
|---|---|
| URL base | `VITE_USERS_API_URL` (en desarrollo `/proxy/users`, que el proxy de Vite reenvía a `http://127.0.0.1:8000`). Las rutas empiezan en `/api/v1/...`. |
| Cabeceras | `Accept: application/json`; `Authorization: Bearer <token de acceso>`, **obligatoria**. El servicio verifica la firma RS256, el emisor `https://<dominio>/` y que `aud` incluya su `AUTH0_AUDIENCE`; rechaza los ID tokens. |
| Permisos | Cada operación exige un permiso que el servicio lee de su base en cada petición (matriz en su `permission-matrix.md`). Solo `check_permission` y `me` exigen únicamente un token válido. |
| CORS | Opcional en el servicio (`CORS_ALLOWED_ORIGINS`; vacío = sin CORS). En desarrollo se usa el proxy de Vite. |
| Fechas | ISO 8601 con zona horaria. |
| Estatus | `{ id, name }`; decidir siempre por `id`: 1 Activo, 2 Bloqueado, 3 Eliminado. |
| Formato de error | `{ "code": "<codigo_en_ingles>", "message": "<texto_en_español>" }` y, solo en `validation_error`, `"errors": [{ "field", "message" }]`. |

## M1. Acceso de la persona autenticada

`GET /api/v1/authorization/me`

- Sin parámetros. Exige un token válido y ningún permiso concreto; responde solo por la persona dueña del token, con datos vigentes en cada petición, y con `Cache-Control: no-store`.
- Respuesta `200` (`MyAccessRead`):

```json
{
  "user": {
    "id": 121,
    "auth0_id": "auth0|abc123",
    "email": "ana@clinica.com",
    "first_name": "Ana",
    "paternal_last_name": "Pérez",
    "maternal_last_name": "Gómez",
    "status": { "id": 1, "name": "Activo" },
    "created_at": "2026-10-15T14:20:11.032Z",
    "updated_at": "2026-10-15T14:20:11.032Z"
  },
  "roles": [
    { "id": 4, "name": "Marketing", "permissions": ["tenants:read"] },
    { "id": 5, "name": "Owner", "permissions": [] }
  ]
}
```

| Campo | Regla |
|---|---|
| `user` | `UserRead`, o `null` si el token es válido pero no hay ningún usuario con ese `auth0_id` (persona no registrada). Con un usuario Bloqueado o Eliminado se devuelve igualmente, con su estatus. |
| `roles` | Solo los roles Activos de un usuario Activo, ordenados por nombre (lista vacía si el usuario no está Activo o no tiene roles). |
| `roles[].permissions` | Solo los permisos Activos del role, como nombres `recurso:acción` en minúsculas (`^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`), ordenados; vacía si el role no tiene permisos. |

| Estado | `code` | Uso en la interfaz |
|---|---|---|
| 401 | `unauthenticated`, `token_expired`, `invalid_token` | El cliente HTTP renueva el token una vez y, si falla, sesión vencida (FR-013). |
| 503 | `authentication_unavailable` | Error reintentable (5xx). |
| 500 | `internal_error` | Error reintentable. |

No hay 403 ni 404: «no estar registrado» es `user: null` y «no tener permisos» es una lista vacía.

## Cómo se usa

Una sola llamada por comprobación: al iniciar sesión, cada 5 minutos, al volver a la pestaña y al recargar. `evaluateAccess` convierte la respuesta en una decisión: `user` nulo → no registrada; estatus distinto de Activo → cuenta no activa; sin ningún role autorizado → sin role con acceso; en otro caso, concedido con la unión de los permisos de los roles autorizados. Ver D7 de [../research.md](../research.md).

## Por qué no se usan las operaciones de lectura existentes

| Operación | Permiso que exige | Problema |
|---|---|---|
| `GET /api/v1/users/by-auth0-id` | `users:read` | Una persona sin ese permiso (Marketing, Billing, Developer) recibe 403 al consultar su propio usuario. |
| `GET /api/v1/users/{user_id}/roles` | `users:read` | Igual; además, un usuario bloqueado recibe 403, no sus datos. |
| `GET /api/v1/roles/{role_id}/permissions` | `roles:read` | Igual. |
| `GET /api/v1/authorization/check` | solo token | Responde una sola pregunta; no devuelve el usuario, su estatus ni sus roles. |

## Validación en el cliente

La respuesta se valida con Zod en `features/auth` (la entidad `PlatformUser` viene de `features/users`); una respuesta que no cumple el esquema se trata como fallo de contrato (error, sin mostrar datos parciales). Las pruebas simulan el servicio con MSW usando estos mismos esquemas y siguen el token `Bearer test-token:<sub>` para identificar a la persona.
