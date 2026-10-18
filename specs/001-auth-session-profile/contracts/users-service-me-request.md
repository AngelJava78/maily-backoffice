# Solicitud al servicio de usuarios: consulta de acceso de la persona autenticada

**Para**: repositorio `mailySoft-usuarios` (texto pensado para `/speckit-specify`) | **Pide**: feature `001-auth-session-profile` del Backoffice | **Fecha**: 2026-10-18 | **Estado**: propuesta

## Por qué

Con la spec 008 cada operación del servicio exige un token válido y un permiso. El Backoffice (aplicación Front) necesita saber, justo después de que la persona inicia sesión, quién es y qué puede hacer. Pero las operaciones que hoy permiten averiguarlo piden permisos que esa persona quizá no tiene:

| Necesita saber | Operación actual | Permiso que exige |
|---|---|---|
| Su usuario y su estatus | `GET /api/v1/users/by-auth0-id` | `users:read` |
| Sus roles | `GET /api/v1/users/{user_id}/roles` | `users:read` |
| Los permisos de cada role | `GET /api/v1/roles/{role_id}/permissions` | `roles:read` |

Una persona de Marketing con solo `tenants:read` recibe 403 en la primera llamada: no puede enterarse de su propio acceso, y el Backoffice no puede distinguir «cuenta no registrada», «cuenta bloqueada» y «sin role con acceso» (un usuario bloqueado recibe también 403). `GET /api/v1/authorization/check` responde una sola pregunta («¿tengo el permiso X?») y no devuelve el usuario, su estatus ni sus roles. Dar `users:read` y `roles:read` a todos los operadores no es una opción: expondría a todos los usuarios y haría visible la sección Usuarios a quien no debe verla.

## Qué se pide

Una operación nueva junto a `check_permission`: `GET /api/v1/authorization/me` (`operationId` sugerido: `get_current_access`).

- Exige un token de acceso válido y **ningún permiso concreto**, como `check_permission`.
- Solo responde por la persona dueña del token, nunca por otra.
- Evalúa con los datos vigentes en cada petición, no con lo que traiga el token.
- Sin parámetros.

### Respuesta 200

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

Reglas:

1. `user` es el mismo objeto que `UserRead`, o `null` si el token es válido pero no existe ningún usuario con ese `auth0_id`. No es un error: así el Front distingue «cuenta no registrada».
2. Si el usuario no está Activo (Bloqueado o Eliminado), `user` se devuelve igualmente, con su estatus, y `roles` es `[]`: coherente con que una persona inactiva no tiene ningún permiso.
3. `roles` trae solo los roles con estatus Activo del usuario, ordenados por nombre. Cada uno trae solo sus permisos con estatus Activo, como nombres `recurso:acción` ordenados. Un role sin permisos devuelve `permissions: []`.
4. Coherencia con `check_permission`: para todo permiso P, P aparece en algún role de `roles` si y solo si `check_permission?permission=P` responde `allowed: true`.
5. La respuesta lleva `Cache-Control: no-store` (son datos personales).

### Errores

Los mismos que `check_permission`: 401 (`unauthenticated`, `token_expired`, `invalid_token`), 503 `authentication_unavailable` y 500 `internal_error`. No hay 403 ni 404.

## Criterios de aceptación sugeridos

1. Usuario Activo con dos roles Activos, uno de ellos con permisos: `roles` trae ambos y cada uno sus permisos activos.
2. Un role Bloqueado y un permiso Bloqueado no aparecen.
3. Usuario Bloqueado o Eliminado: `user` con su estatus y `roles: []`.
4. Token válido sin usuario en la API: `user: null` y `roles: []`.
5. Sin token, con token vencido o inválido: 401 con el código que corresponda.
6. Tras bloquear al usuario, la siguiente consulta con el mismo token ya devuelve `roles: []`, sin esperar a que el token venza.
7. En los casos anteriores, `check_permission` coincide con `me` (regla 4).
8. La consulta es tan rápida como `check_permission` con 100 000 usuarios (SC-002 de la spec 008).

## Qué arrastra en el servicio

Declarar la operación como «solo token válido» en la matriz de permisos (`contracts/permission-matrix.md`: pasa de 1 a 2 operaciones sin permiso concreto, 34 en total), en el OpenAPI, en la colección de Newman y en la prueba que recorre las rutas, que hoy exime únicamente a `check_permission`.

## Compatibilidad hacia adelante

Cuando exista el tipo de role (de sistema o de usuario), se añade `type` a cada elemento de `roles`; el Backoffice decidirá el acceso por ese tipo en lugar de por la lista de nombres.
