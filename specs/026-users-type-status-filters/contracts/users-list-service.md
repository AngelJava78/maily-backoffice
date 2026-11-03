# Contrato: lista de usuarios de la API de usuarios 5.5.0 (U1)

**Feature**: `026-users-type-status-filters` | **Fuente**: `mailySoft-usuarios`, spec 018, commit
`4fe6935` (`src/routers/users.py`, `src/dtos/user.py`) | **Amplía**: U1 de
[`specs/002-manage-users/contracts/users-service.md`](../../002-manage-users/contracts/users-service.md)

Solo cambia U1. U2 a U12 (búsqueda por correo, detalle, crear, editar, bloquear, desbloquear,
eliminar, reactivar y los roles de un usuario) responden igual que antes, con `UserRead` sin
`role_types`. La versión 5.5.0 es compatible: sin los parámetros nuevos, la lista es la de siempre
(usuarios Activos) más el campo nuevo.

## Operación

| Id | Operación | Permiso | Entrada | Respuesta | Errores propios |
|---|---|---|---|---|---|
| U1 | `GET /api/v1/users` | `users:read` | `page` (≥ 1, por omisión 1), `page_size` (1 a 100, por omisión 50; la interfaz pide 10, 25 o 50), **`status_id`** (1 Activo o 2 Bloqueado, por omisión 1), **`role_type_id`** (1 Sistema o 2 Clínica, opcional) | `200` `UserPage` | `422 validation_error` (cualquier parámetro fuera de rango, incluido `status_id=3`) |

**Lo que envía el Backoffice** (D1): `page`, `page_size` y `status_id` siempre; `role_type_id` solo con
Sistema (1) o Clínica (2). Nunca pide Eliminados.

| Botones | Consulta |
|---|---|
| Todos + Activos | `?page=1&page_size=10&status_id=1` |
| Sistema + Activos | `?page=1&page_size=10&status_id=1&role_type_id=1` |
| Clínica + Bloqueados | `?page=1&page_size=10&status_id=2&role_type_id=2` |

## Reglas de la API que el Backoffice da por ciertas

- **Estatus**: el del propio usuario. Los Eliminados nunca aparecen ni cuentan en `total`.
- **Tipo**: un usuario cumple un tipo si tiene **al menos un role Activo** de ese tipo; los roles
  Bloqueados y Eliminados no cuentan aunque sigan asignados. Con roles Activos de los dos tipos aparece
  con ambos filtros; sin roles Activos no aparece al filtrar por tipo, pero sí sin filtro. La regla es
  la misma para usuarios Activos y Bloqueados.
- **Totales**: `total` y `pages` cuentan solo lo que cumple ambos filtros; `pages` es 0 si no hay
  nadie; una página posterior a la última devuelve `items` vacío (no es error).
- **Orden**: nombre, apellido paterno y apellido materno (sin distinguir mayúsculas; sin materno al
  final) y, a igualdad, `id`, con cualquier combinación de filtros.

## Cuerpos

### `UserPage`

| Campo | Regla |
|---|---|
| `items` | Lista de `UserListItem` de la página, en el orden de arriba |
| `total` | Entero ≥ 0: usuarios que cumplen los filtros |
| `page`, `page_size` | Los aplicados |
| `pages` | Entero ≥ 0 |

### `UserListItem`

`UserRead` (`{ id, auth0_id, email, first_name, paternal_last_name, maternal_last_name | null,
status: { id, name }, created_at, updated_at, photo_url? }`) **más**:

| Campo | Regla |
|---|---|
| `role_types` | **Obligatorio**. Lista de `{ id, name }` (la forma del `type` de un role): los tipos de los roles Activos del usuario, **sin repetidos y ordenados por `id`**; `[]` si no tiene ninguno. Trae **todos** los tipos del usuario aunque se filtre por uno |

El Backoffice exige `role_types` al validar (D2): una API anterior a la 5.5.0, que ignoraría los
filtros, produce un error visible en vez de datos equivocados. Los campos que el Backoffice no usa
(`photo_url`) se descartan al validar, como hoy.

Ejemplo (`status_id=2&role_type_id=1`):

```json
{
  "items": [
    {
      "id": "0b9f3c1e-8a4d-4f7e-9c2b-1d5e6f7a8b9c",
      "auth0_id": "auth0|hugo",
      "email": "hugo@maily.mx",
      "first_name": "Hugo",
      "paternal_last_name": "Ramírez",
      "maternal_last_name": null,
      "status": { "id": 2, "name": "Bloqueado" },
      "created_at": "2026-10-01T15:00:00Z",
      "updated_at": "2026-11-02T18:30:00Z",
      "role_types": [{ "id": 1, "name": "Sistema" }]
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "pages": 1
}
```

## Errores

Sin errores nuevos para el Backoffice: los parámetros que envía siempre son válidos. Un 422 solo
podría venir de una dirección manipulada que el cliente no hubiera normalizado, y la dirección se
normaliza antes de consultar (D3); si llegara, se trata como hoy (error genérico con reintento). 401 y
403 como en el resto de la sección.
