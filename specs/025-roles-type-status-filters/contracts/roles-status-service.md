# Contrato: estatus de los roles en la API de usuarios

**Feature**: `025-roles-type-status-filters` | Leído en `mailySoft-usuarios` (`src/routers/roles.py`,
commit `2e17ecb`, versión 5.4.0) el 2026-11-02. No hay contrato OpenAPI publicado; si la API cambia,
este documento y `features/roles/api` cambian juntos (constitución IV).

Base: `VITE_USERS_API_URL` + `/api/v1/roles`. Todas las operaciones exigen un access token de Auth0 y
el permiso indicado; sin él, 401/403 con el tratamiento uniforme del cliente HTTP.

## 1. Listar roles por estatus

`GET /api/v1/roles[?status_id=1|2]` — permiso `roles:read`.

| Parámetro | Valores | Por omisión |
|---|---|---|
| `status_id` | `1` Activo, `2` Bloqueado | `1` |

- 200: arreglo de roles (forma de `roleSchema`, ver data-model §1), de **ambos tipos**, ordenados por
  nombre sin distinguir mayúsculas. Sin paginación.
- 422 `validation_error`: `status_id` fuera de 1–2 o no entero.
- Los roles eliminados no se pueden pedir.

El Backoffice pide los Activos **sin** el parámetro (la misma petición de antes, que también usa
Usuarios) y los Bloqueados con `status_id=2`.

## 2. Bloquear un role

`POST /api/v1/roles/{id}/block` — permiso `roles:update`. Sin cuerpo.

| Respuesta | Código | Cuándo | Tratamiento en el Backoffice |
|---|---|---|---|
| 200 | — | Role activo bloqueado; cuerpo: el role con `status: { id: 2, name: "Bloqueado" }` | Éxito |
| 409 | `role_already_blocked` | Ya estaba bloqueado | «Ya estaba…» (informativo), refrescar |
| 404 | `role_not_found` | No existe, está eliminado o tiene otro estatus | Error `roles.errors.notFound` |
| 422 | `validation_error` | Id no válido | Error genérico |

Efecto: el role conserva sus datos, su nombre reservado y sus asignaciones, que dejan de tener efecto.

## 3. Desbloquear un role

`POST /api/v1/roles/{id}/unblock` — permiso `roles:update`. Sin cuerpo.

| Respuesta | Código | Cuándo | Tratamiento en el Backoffice |
|---|---|---|---|
| 200 | — | Role bloqueado desbloqueado; cuerpo: el role con `status: { id: 1, name: "Activo" }` | Éxito |
| 409 | `role_already_active` | Ya estaba activo | «Ya estaba…» (informativo), refrescar |
| 404 | `role_not_found` | No existe, está eliminado o tiene otro estatus | Error `roles.errors.notFound` |
| 422 | `validation_error` | Id no válido | Error genérico |

Efecto: vuelve a Activo con el mismo id, nombre, descripción, fecha de creación, tipo y asignaciones.
No comprueba si alguna persona queda con roles activos de los dos tipos (fuera de alcance).

## 4. Lo que la API no entrega de un role bloqueado

Responden 404 `role_not_found` para un role bloqueado: `GET /roles/{id}`, `PATCH /roles/{id}`,
`DELETE /roles/{id}`, `GET /roles/{id}/permissions`, `POST`/`DELETE /roles/{id}/permissions/{pid}`.
Por eso el Backoffice no los llama para un role bloqueado (FR-012).

## 5. Errores: lo que decide es el código

El `message` del servicio nunca se muestra (constitución IV). `describeRoleError` clasifica:
`role_already_blocked`/`role_already_active` → `alreadyInStatus`; `role_not_found` → `notFound`;
403 o `permission_denied` → `forbidden`; red/5xx → `retryable`; lo demás → `unexpected`.
