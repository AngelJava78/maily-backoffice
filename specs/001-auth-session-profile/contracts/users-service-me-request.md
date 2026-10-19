# Solicitud al servicio de usuarios: consulta de acceso de la persona autenticada

**Para**: repositorio `mailySoft-usuarios`, como descripción de `/speckit-specify` (será la spec 009) | **Pide**: feature `001-auth-session-profile` del Backoffice | **Fecha**: 2026-10-18 | **Estado**: propuesta

## Cómo usarla

1. Abre Claude Code en `mailySoft-usuarios` y escribe `/speckit-specify` seguido del texto del bloque de abajo. El repositorio numera las specs de forma secuencial, así que se creará `specs/009-…`.
2. Si `/speckit-clarify` pregunta algo, casi todo está respondido en las reglas 1 a 6 del texto (usuario inactivo, usuario no registrado, paginación, tipo de rol, caché).
3. Revisa en `/speckit-plan` los puntos de la sección «Qué revisar en el plan».
4. Cuando la operación exista, reinicia el servicio (se lanza sin `--reload`) y pulsa «Reintentar» en el Backoffice.

El Backoffice valida la respuesta con Zod (`src/features/auth/schemas/myAccess.ts`): si cambias su forma, hay que cambiar también ese esquema. El patrón de los nombres de permiso del Backoffice ya es el mismo que impone el servicio (`^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`).

## Texto para `/speckit-specify`

```text
Necesito una operación nueva en esta API para que una persona, justo después de iniciar sesión, sepa quién es en MailySoft y qué puede hacer. No generes código. Pregúntame si algo no queda claro.

**Por qué.** Con la spec 008, cada operación exige un token válido y un permiso. El Backoffice de MailySoft (aplicación Front en React) necesita, al iniciar sesión la persona, tres datos: su usuario y su estatus, sus roles y los permisos de cada rol. Las operaciones que hoy lo permiten piden permisos que esa persona quizá no tiene: `GET /api/v1/users/by-auth0-id` y `GET /api/v1/users/{user_id}/roles` piden `users:read`, y `GET /api/v1/roles/{role_id}/permissions` pide `roles:read`. Una persona de Marketing que solo tiene `tenants:read` recibe 403 en la primera llamada: no puede enterarse de su propio acceso y el Front no puede distinguir «cuenta no registrada», «cuenta bloqueada o eliminada» y «sin rol con acceso». La consulta `GET /api/v1/authorization/check` responde una sola pregunta («¿tengo el permiso X?») y no devuelve el usuario, su estatus ni sus roles. Dar `users:read` y `roles:read` a todos los operadores no es una opción: expondría a todos los usuarios y mostraría la sección de Usuarios a quien no debe verla.

**Qué se pide.** Una operación nueva junto a la consulta de permisos: `GET /api/v1/authorization/me` (`operationId` sugerido: `get_current_access`), sin parámetros.
- Exige un token válido y ningún permiso en particular, como `check_permission` (FR-012 de la spec 008).
- Solo responde sobre la persona dueña del token, nunca sobre otra; el usuario se identifica por el `auth0_id` del token, igual que en `check_permission`.
- Evalúa con los datos vigentes en cada petición, no con lo que traiga el token, y sin caché: un cambio de estatus, de roles o de permisos se ve en la siguiente consulta.

**Respuesta 200.** Un objeto con `user` y `roles`:

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

Reglas:
1. `user` es el mismo objeto que ya devuelve esta API para un usuario (`UserRead`), o `null` si el token es válido pero no existe ningún usuario con ese `auth0_id`. No es un error: así el Front distingue «cuenta no registrada».
2. Si el usuario no está Activo (Bloqueado o Eliminado), `user` se devuelve igualmente, con su estatus, y `roles` es `[]`: una persona inactiva no tiene ningún permiso.
3. `roles` trae solo los roles Activos del usuario, ordenados alfabéticamente por nombre. Cada rol trae solo sus permisos Activos, como nombres `recurso:acción` ordenados alfabéticamente. Un rol sin permisos devuelve `permissions: []`. Si dos roles comparten un permiso, aparece en ambos.
4. Coherencia con `check_permission`: para todo permiso P, P aparece en algún rol de `roles` si y solo si `check_permission` con P responde que sí lo tiene.
5. No se pagina, por decisión expresa: son los roles de una sola persona. Cumple la excepción del Principio IV de la constitución para catálogos pequeños y acotados: se asume un máximo de 100 roles Activos por persona (el del catálogo de roles de la spec 002) y de 500 permisos Activos por rol (el del catálogo de la spec 003), y el orden es el de la regla 3.
6. La respuesta lleva `Cache-Control: no-store`, porque son datos personales. Devuelve solo información de la propia persona.

**Errores.** Los mismos que `check_permission`, con el formato de error uniforme de la API y mensajes en español: 401 (`unauthenticated`, `token_expired`, `invalid_token`), 503 `authentication_unavailable` y 500 `internal_error`. No hay 403, 404 ni 422: no depende de ningún permiso, no busca ningún recurso y no tiene parámetros. Una persona sin ningún permiso recibe 200.

**Escenarios que deben cubrirse.**
1. Usuario Activo con dos roles Activos, uno de ellos con permisos: `roles` trae ambos y cada uno trae sus permisos Activos.
2. Un rol Bloqueado o Eliminado y un permiso Bloqueado o Eliminado no aparecen.
3. Usuario Bloqueado o Eliminado: `user` con su estatus y `roles: []`, aunque su token siga vigente.
4. Token válido sin usuario en la API: `user: null` y `roles: []`.
5. Sin token, con token vencido o inválido: 401 con el código que corresponda; con la verificación del token no disponible: 503.
6. Tras bloquear al usuario, quitarle un rol, bloquear el rol o retirar un permiso, la siguiente consulta con el mismo token ya lo refleja, sin esperar a que el token venza.
7. En todos los escenarios anteriores, `check_permission` coincide con `me` (regla 4).
8. Una persona con roles que no tienen permisos recibe 200 con `permissions: []`, nunca 403.

**Éxito medible.**
- La consulta responde en menos de 1 segundo con hasta 100 000 usuarios, y su respuesta coincide con los roles y permisos vigentes en el 100 % de los casos.
- Tras bloquear o eliminar a un usuario, o retirarle un rol o un permiso, el 100 % de sus siguientes consultas (aunque su token siga vigente) lo refleja.
- Las operaciones existentes no cambian: el 100 % de los escenarios de las specs 002 a 008 sigue dando el mismo resultado.
- El 100 % de los mensajes nuevos está en español, sin detalles técnicos y sin datos de otras personas; 0 tokens o secretos en respuestas y registros.

**Efecto en lo que ya existe.**
- Es un cambio compatible: agrega una operación y no modifica `/api/v1` ni las demás operaciones.
- La matriz operación → permiso de la spec 008 (`contracts/permission-matrix.md`) y su catálogo de errores pasan de 33 a 34 operaciones: 32 con token y permiso, y 2 que solo exigen token (`check_permission` y `get_current_access`).
- Principio VIII de la constitución: su única excepción a «token y permiso» (además de la documentación publicada) es la consulta de los permisos de la propia persona autenticada. Esta operación es la consulta del acceso de la propia persona, así que pertenece a esa excepción; el plan debe dejarlo explícito en su Constitution Check.
- La prueba que recorre las rutas y falla si alguna no declara permiso hoy exime solo a `check_permission`: debe eximir también a `get_current_access`. La colección de Postman/Newman (spec 007) incluye la operación.
- OpenAPI: la operación se documenta en español, con `response_model`, códigos de estado y ejemplos, e indica que no exige un permiso concreto.

**Fuera de alcance.**
- Consultar el acceso de otra persona.
- El tipo de rol (de sistema o de usuario): cuando exista, se añadirá `type` a cada elemento de `roles` y el Backoffice decidirá el acceso por ese tipo en lugar de por el nombre.
- Cambios en `check_permission`.
```

## Qué revisar en el plan

- **Principio VIII**: el plan debe razonar que `me` entra en la excepción de «la consulta de los permisos de la propia persona autenticada». Si concluye que el texto de la constitución hay que ajustarlo, se propone con `/speckit-constitution` (enmienda PATCH o MINOR, según el caso).
- **Principio IV**: la ausencia de paginación solo es válida si la spec declara el máximo (≤ 500) y el orden; el texto ya lo hace en la regla 5.
- **Principio V**: pruebas unitarias del servicio, de integración del repositorio contra PostgreSQL real, de contrato de la operación, la que recorre las rutas y la colección de Newman.
- **Rendimiento**: `check_permission` es una sola consulta `EXISTS` (0,17 ms con 110 000 usuarios); `me` necesita el usuario, sus roles y sus permisos, así que conviene medirlo con 100 000 usuarios para cumplir el criterio de 1 segundo.
- **Datos de prueba del Backoffice**: las cuentas del `quickstart.md` ya corresponden a varios escenarios del texto: A5 (Marketing y Owner) al 1, A7 y A8 (Bloqueado y Eliminado) al 3, A9 (sin usuario en MailySoft) al 4 y A4 (rol sin permisos) al 8. Los escenarios 2 y 6 se comprueban cambiando el estatus o las asociaciones en la base de datos.
