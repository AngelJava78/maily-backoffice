# Contrato: lo que la herramienta Token necesita del servicio de usuarios

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [../spec.md](../spec.md)

La herramienta **no añade ninguna operación** al servicio de usuarios ni consume ninguna nueva. Depende de un **dato**: el permiso `token:read`, que hoy no existe y hay que crear y asignar. La fuente de verdad es el repositorio del servicio (copia local `C:\maily\code\mailySoft-usuarios`, `origin` `Quint4n4/mailySoft-usuarios`); se leyeron su matriz de permisos (`specs/008-auth0-access-control/contracts/permission-matrix.md`), los OpenAPI de permisos, roles y permisos de un rol, y los datos iniciales (`alembic/versions/0002_seed_roles_permissions.py`, 15 recursos por 4 acciones, ninguno `token`). Verificado el 2026-10-19. Complementa [../../001-auth-session-profile/contracts/users-service.md](../../001-auth-session-profile/contracts/users-service.md).

Ninguna operación del servicio exige `token:read`: lo usa solo el backoffice para decidir qué mostrar. Ocultar la opción no es seguridad (spec, Assumptions).

## Lo que consume el backoffice (sin cambios)

`GET /api/v1/authorization/me` (M1 de la 001, `operationId` `get_current_access`, ya implementada en el servicio). Devuelve los roles activos de la persona con sus permisos activos; `token:read` llega como un permiso más:

```json
{
  "user": { "id": "…", "email": "ana@clinica.com", "status": { "id": 1, "name": "Activo" } },
  "roles": [
    { "id": 1, "name": "Administrator", "permissions": ["subscriptions:read", "token:read", "users:read"] }
  ]
}
```

El backoffice vuelve a pedirla al iniciar sesión, cada 5 minutos, al volver a la pestaña y al recargar (001, FR-019); por eso asignar o quitar el permiso se refleja como máximo 5 minutos después (SC-009). El nombre cumple el patrón `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$` que el servicio impone.

## Lo que hay que preparar (una vez por entorno)

Lo hace quien administra el servicio, con un token de una cuenta que tenga `permissions:write`, `roles:read` y `roles:update` (el administrador inicial de `project-definition/bootstrap_admin.sql` los tiene). Debe repetirse en cada entorno (desarrollo, QA, producción): cada uno tiene su propia base de datos y, con ella, su propio interruptor.

| # | Operación | Permiso que exige | Para qué |
|---|---|---|---|
| 1 | `GET /api/v1/permissions/by-name?name=token:read` | `permissions:read` | Comprobar si ya existe (`404` si no) |
| 2 | `POST /api/v1/permissions` | `permissions:write` | Crearlo |
| 3 | `GET /api/v1/roles/by-name?name=Administrator` (y `Developer`) | `roles:read` | Obtener el `id` de cada role |
| 4 | `POST /api/v1/roles/{role_id}/permissions` | `roles:update` | Asignarlo a cada role |

**2. Crear el permiso** — cuerpo (`name` con formato `recurso:acción` en minúsculas; `description` opcional):

```json
{ "name": "token:read", "description": "Permite ver y usar la herramienta Token del Backoffice." }
```

Respuesta `201` con `{ id, name, description, created_at, status }` (`status` Activo) y cabecera `Location`. Errores: `409` si ya existe un permiso no eliminado con ese nombre, `422` si el formato no es válido.

**4. Asignarlo a un role** — cuerpo (el identificador del permiso del paso 2):

```json
{ "permission_id": 61 }
```

Respuesta `201` con `{ role: { id, name }, permission: { id, name } }`. Errores: `404` si el role o el permiso no existen o no están activos (se comprueba primero el role y después el permiso), `409` si ya estaba asociado, `422` si el cuerpo no es válido.

**Solo `Administrator` y `Developer`** deben recibirlo (spec, clarificación del 2026-10-19). El backoffice no comprueba nombres de role: si se asignara a otro, ese role vería la herramienta.

## Desactivar

| Operación | Permiso | Efecto |
|---|---|---|
| `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` | `roles:update` | `204`. Los roles dejan de tener la herramienta; sus personas dejan de verla en la siguiente comprobación (≤ 5 minutos) y, si la tenían abierta, salen de ella y su token en pantalla se descarta. Los tokens ya generados no se revocan: siguen siendo válidos en Postman hasta su `exp` |
| `DELETE /api/v1/permissions/{permission_id}` | `permissions:delete` | Retira el permiso para todos los roles (apaga la herramienta en ese entorno) |

## Equivalente en SQL (desarrollo y pruebas)

Como en los quickstarts de la 001 y la 002, para quien tiene la base a mano (desde la carpeta del servicio). Mismo resultado que los pasos 2 a 4:

```sql
BEGIN;

INSERT INTO permissions (name) VALUES ('token:read') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'token:read'
WHERE r.name IN ('Administrator', 'Developer')
ON CONFLICT DO NOTHING;

COMMIT;
```

Para apagarla en ese entorno:

```sql
DELETE FROM role_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'token:read');
```

## Errores que el backoffice no ve

Ninguno de los de arriba llega a la pantalla Token: esas llamadas las hace quien administra el servicio, no el backoffice. Si el permiso falta o no está asignado, la consecuencia visible es solo que nadie ve la herramienta (caso límite de la spec).
