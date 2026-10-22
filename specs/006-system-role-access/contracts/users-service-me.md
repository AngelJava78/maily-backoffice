# Contrato consumido: `GET /api/v1/authorization/me` (vigente)

**Feature**: `006-system-role-access` | **Fecha**: 2026-10-21

Reemplaza, para esta operación, lo que decía `specs/001-auth-session-profile/contracts/users-service.md`: aquella versión describía `me` como una propuesta **pendiente** de implementar. Ya está implementada (`mailySoft-usuarios`, specs `009-current-access`, `010-user-id-uuid`, `011-role-types` y `012-temporary-password-change`). Verificado leyendo `src/routers/authorization.py`, `src/services/authorization_service.py`, `src/repositories/authorization_repository.py` y `src/dtos/authorization.py` el 2026-10-21 (commit `0d3df16`, rama principal). No se modifica el servicio.

## Condiciones generales

| Tema | Valor |
|---|---|
| URL base | `VITE_USERS_API_URL` (sin cambios desde la 001). |
| Cabeceras | `Authorization: Bearer <token de acceso>`, obligatoria. Ningún permiso en particular. |
| Caché | Respuesta marcada `Cache-Control: no-store` (datos personales). |
| `user.id` | UUID (desde la spec 010; la 001 documentaba un entero). |

## Respuesta `200`

```json
{
  "user": {
    "id": "3f2b8c1e-7a4d-4b9e-9c52-1d6f0a8e2b47",
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
    { "id": 4, "name": "Marketing", "type": { "id": 1, "name": "Sistema" }, "permissions": ["tenants:read"] },
    { "id": 9, "name": "Billing", "type": { "id": 1, "name": "Sistema" }, "permissions": [] }
  ],
  "password_change_required": false
}
```

| Campo | Regla |
|---|---|
| `user` | El mismo objeto que para cualquier usuario, o `null` si el token es válido pero ningún usuario tiene ese `auth0_id` (persona no registrada). Con un usuario no Activo se devuelve igual, con su estatus. |
| `roles` | Solo los roles **Activos** del usuario (vacía si el usuario no está Activo o no tiene roles), ordenados por nombre sin distinguir mayúsculas. |
| `roles[].type` | **Nuevo desde la spec 011.** `{ id, name }`: `1` Sistema (da acceso al Backoffice), `2` Clínica (da acceso a la aplicación de clínicas, que no existe todavía). El servicio solo informa el tipo; no decide a qué aplicación entra la persona — eso lo decide esta feature (FR-002), por `id`, nunca por `name`. |
| `roles[].permissions` | Solo los permisos Activos del rol, `recurso:acción` en minúsculas, ordenados. |
| `password_change_required` | **Nuevo desde la spec 012.** `true` si el token trae la reclamación de cambio de contraseña pendiente. Esta operación responde `200` igual con el cambio pendiente (es la única que lo hace: todas las demás devuelven `403 password_change_required`). Esta feature no lee el campo (ver Assumptions de la spec: sin flujo propio; FR-010 solo exige que no cambie la decisión de acceso). |

No hay `403` ni `404`: «no estar registrado» es `user: null` y «no tener permisos» es una lista `roles` vacía o con `permissions: []`.

## Errores

| Estado | `code` | Uso en el Backoffice |
|---|---|---|
| 401 | `unauthenticated`, `token_expired`, `invalid_token` | Renovar el token una vez; si falla, sesión vencida (feature 001, FR-013). Sin cambios. |
| 503 | `authentication_unavailable` | Reintentable (FR-024). |
| 500 | `internal_error` | Reintentable (FR-024). |

**403 y 404 no existen en esta operación** (confirmado leyendo `src/routers/authorization.py`: la lista de `responses` de `get_current_access` es `{200, 401, 503, 500}`). FR-023 de esta feature los trata igual que "sin acceso" como protección ante un cambio futuro de la API o de un intermediario entre el Backoffice y ella; ninguna prueba con la API real puede ejercitar esa rama hoy, solo MSW.

## Validación en el cliente

`myAccessSchema` (`features/auth/schemas/myAccess.ts`) exige `type` en cada rol; una respuesta sin él es un fallo de contrato (error, sin acceso ni datos parciales). `password_change_required` no se valida ni se tipa: Zod lo descarta en silencio (no se usa `.strict()`), que es intencional (ver `data-model.md`).

## Lo que no cambió respecto a la 001

El resto del contrato (cabeceras, el resto de los campos del usuario, el formato de error `{code, message}`, el cliente HTTP único, el renovado de token en el 401) sigue como lo documentó `specs/001-auth-session-profile/contracts/users-service.md`, que ahora debe leerse junto con este archivo para la operación `me`.
