# Guía de validación: Administración de Usuarios y Roles de Sistema

**Feature**: `002-manage-users` | **Fecha**: 2026-10-18 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Parte de la guía de la 001 ([../001-auth-session-profile/quickstart.md](../001-auth-session-profile/quickstart.md)): Auth0, el servicio de usuarios y las cuentas A1 a A9 se preparan allí; aquí solo se añade lo propio de esta feature.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 | Node 24, Docker, la aplicación SPA y la API de Auth0 (con la SPA autorizada para la API), el servicio de usuarios levantado y migrado, la consulta `me` implementada ([solicitud](../001-auth-session-profile/contracts/users-service-me-request.md)) y los datos de prueba A1 a A9. |
| Aplicación de gestión de Auth0 | La aplicación *Machine to Machine* del servicio, autorizada para la Management API de Auth0 con **solo** `read:users`, `create:users` y `update:users`, y sus credenciales en el `.env` del servicio. Crear, bloquear, desbloquear, eliminar y reactivar llaman a Auth0 a través de ella. |
| Permisos de `Administrator` | La cuenta A1 necesita `users:*` y `roles:read`: el SQL de la 001 ya los asigna. |
| Correos desechables | Crear un usuario **crea una cuenta real en Auth0**. Usa correos de prueba que controles (`nombre+002@tudominio.com`) y elimina después las cuentas sobrantes en el panel de Auth0 (eliminar un usuario desde el Backoffice deja la cuenta bloqueada y marcada, no la borra). |
| Dependencias nuevas | `npm ci` instala `@mui/x-data-grid`, `react-hook-form` y `@hookform/resolvers`. |

## 1. Datos de prueba de esta feature

Para paginar hacen falta más de 10 usuarios activos. Estos usuarios existen solo en la base (sin cuenta en Auth0), lo que sirve para leer, buscar y comprobar el rechazo `auth0_account_not_found`. Se ejecutan como el SQL de la 001, desde la carpeta del servicio:

```sql
BEGIN;

INSERT INTO users (auth0_id, email, first_name, paternal_last_name)
SELECT 'auth0|seed-' || lpad(n::text, 2, '0'),
       'seed' || lpad(n::text, 2, '0') || '@ejemplo.com',
       'Usuario',
       'Prueba ' || lpad(n::text, 2, '0')
FROM generate_series(1, 30) AS n
ON CONFLICT DO NOTHING;

UPDATE users SET status_id = 2 WHERE email = 'seed01@ejemplo.com';   -- Bloqueado, sin cuenta en Auth0
UPDATE users SET status_id = 3 WHERE email = 'seed02@ejemplo.com';   -- Eliminado, sin cuenta en Auth0

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES ('seed03@ejemplo.com', 'Marketing'), ('seed03@ejemplo.com', 'Developer'),
             ('seed04@ejemplo.com', 'Marketing')) AS m(email, role_name)
JOIN users u ON u.email = m.email
JOIN roles r ON r.name = m.role_name
ON CONFLICT DO NOTHING;

COMMIT;
```

Con las cuentas A1 a A6 activas quedan 34 usuarios activos (28 de prueba y 6 de las cuentas de la 001). **No bloquees ni elimines las cuentas A1 a A9** (las usas para entrar): para las pruebas destructivas crea usuarios nuevos desde el Backoffice.

Para comprobar los permisos con la cuenta A4 (Developer, sin permisos de inicio), se le conceden y retiran permisos al role `Developer`. Tras cada cambio, vuelve a la pestaña (o espera 5 minutos) para que el Backoffice vuelva a comprobar el acceso (001, FR-019):

```sql
-- Conceder (repite con cada permiso que quieras probar: users:read, users:update, roles:read, users:write, users:delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'users:read'
WHERE r.name = 'Developer' ON CONFLICT DO NOTHING;

-- Retirar todos los de usuarios y roles
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'Developer')
  AND permission_id IN (SELECT id FROM permissions WHERE name ~ '^(users|roles):');
```

## 2. Ejecutar la aplicación

```powershell
cd C:\maily\code\maily-backoffice
npm ci
npm run dev                              # http://localhost:5173 (puerto fijo, proxy /proxy/users)
```

## 3. Escenarios de validación

Salvo que se indique otra cuenta, se entra con A1.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US1-1, FR-001, FR-002, FR-004 | Abrir «Usuarios» en la navegación. | Primeros 10 usuarios activos con nombre completo, correo y fecha de alta (hora local), el total (34) y controles de página; el encabezado `h1` «Usuarios» recibe el foco. |
| V2 | US1-2 | Elegir 25 por página. | La tabla se actualiza con 25 filas y vuelve a la página 1; la URL lleva `page_size=25`. |
| V3 | US1-3, US1-4, FR-003 | Ir a la página 3 (de 10), abrir el detalle de un usuario y pulsar «Volver al listado». | El detalle muestra todos los datos, el estatus y los roles; al volver, la tabla está en la página 3. Recargar la URL del listado conserva la página. |
| V4 | US1-5, US1-6 | `docker compose stop api` y abrir «Usuarios». El estado vacío se comprueba con pruebas automatizadas. | Mensaje de error con «Reintentar»; tras `docker compose start api`, «Reintentar» muestra el listado. |
| V5 | US1-7 | Abrir `/users/99999999` y `/users/abc`. | La primera, «Usuario no encontrado» con enlace al listado; la segunda, «Página no encontrada». |
| V6 | US1-8, US1-9, FR-015 | Con A4 sin permisos de usuarios: abrir `/users`. Conceder `users:read` y volver a la pestaña. | Sin permiso: no hay «Usuarios» en la navegación y `/users` lleva a `/` con aviso. Con `users:read`: listado, detalle y búsqueda, sin «Crear usuario», «Editar», «Agregar role», «Bloquear», «Eliminar» ni «Reactivar». |
| V7 | US1-10, US1-11, FR-017, FR-018 | Buscar `seed01@ejemplo.com` y `seed02@ejemplo.com`. | Una tarjeta con el usuario, su estatus (Bloqueado, Eliminado) y «Ver detalle»; ninguno aparece en el listado ni en su total. |
| V8 | US1-12, US1-13, US1-14 | Buscar un correo que no existe; buscar vacío y `no-es-correo`; recargar tras una búsqueda. | «No se encontró ningún usuario con ese correo» (no es un error); los dos inválidos muestran el error junto al campo **sin** solicitud en la pestaña Red; la recarga repite el resultado (`?email=` en la URL). |
| V9 | US2-1, US2-2, US2-7, SC-001 | «Crear usuario»: correo desechable, nombre, apellido paterno, contraseña inicial y dos roles (por ejemplo, Marketing y Developer). | La contraseña está oculta y se puede mostrar; tras guardar aparece «Usuario creado», se abre el detalle con los dos roles y el usuario aparece al buscarlo. En una ventana privada, esa persona puede identificarse con el correo y la contraseña (entra si tiene un role autorizado). |
| V10 | US2-3 a US2-6 | Guardar vacío; con `correo-mal`; repetir el alta de un correo ya creado; usar una contraseña débil; usar el correo de A9. | Errores junto a cada campo (el foco va al primero); correo repetido con la sugerencia de buscarlo y el enlace a la búsqueda; contraseña rechazada junto al campo; el correo de A9 (existe en Auth0 y no en la base): «Ya existe una cuenta de acceso con ese correo». No se crea nada en ningún caso. |
| V11 | US2-8, US2-10, SC-004 | Detener el servicio y guardar; reintentar tras iniciarlo; pulsar «Guardar» dos veces seguidas. | Error con la acción disponible de nuevo y los datos escritos conservados; un solo usuario creado. |
| V12 | US2-9, FR-023, SC-009 | Abrir el formulario de alta, bloquear un role que no use ninguna cuenta de prueba (`UPDATE roles SET status_id = 2 WHERE name = 'Doctor'`) y crear un usuario con Marketing y Doctor; después restaurar el role (`status_id = 1`). | El usuario se crea y se abre su detalle con un aviso de que Doctor no se pudo asignar y «Reintentar»; el usuario no se elimina y conserva Marketing; con el role restaurado, «Reintentar» lo asigna. |
| V13 | US2-11, FR-025 | Con A4: conceder `users:read`, `users:write` y `users:update` sin `roles:read`; luego añadir `roles:read`. | Sin `roles:read` no aparece «Crear usuario» ni «Agregar role» (sí «Quitar role»); con los tres permisos aparece «Crear usuario». |
| V14 | US3-1 a US3-3 | Editar el nombre de un usuario de prueba; cancelar otra edición. | El formulario muestra los valores actuales y el correo como dato de solo lectura con su nota; al guardar, «Datos guardados» y el cambio en el detalle y el listado; cancelar no cambia nada. |
| V15 | US3-4 a US3-6 | En el detalle, agregar un role (confirmar) y quitar otro (confirmar). | Cada diálogo nombra al usuario y al role y devuelve el foco al botón; el detalle muestra los roles vigentes sin recargar. |
| V16 | US3-7 | Abrir el mismo usuario en dos pestañas y quitar el mismo role en ambas. | La segunda avisa de que el cambio ya estaba hecho y muestra los roles vigentes. |
| V17 | US3-8, FR-012 | Abrir el usuario de A1 (búsqueda por su correo). | Sin «Bloquear», «Eliminar», «Agregar role» ni «Quitar role» y con la nota que lo explica; «Editar» sí está. |
| V18 | US3-9 | Abrir «Editar» de un usuario en la pestaña 1; bloquearlo en la pestaña 2; guardar en la pestaña 1. | Aviso de que el usuario ya no está activo, el guardado no se aplica y la pantalla muestra su estatus actual. |
| V19 | US3-10, US4-5, US5-7 | Abrir el detalle de un usuario bloqueado y el de uno eliminado. | Solo «Desbloquear» y «Reactivar» respectivamente; sin «Editar» ni acciones de roles; aviso de que sus roles no se muestran. |
| V20 | US4-1 a US4-4, SC-008 | Con un usuario creado en V9: bloquearlo (confirmar), buscarlo, intentar entrar con él y desbloquearlo. | El diálogo nombra al usuario y explica que no podrá iniciar sesión; queda Bloqueado, sale del listado y de su total; Auth0 le niega el acceso; al desbloquearlo reaparece y puede entrar. |
| V21 | US4-7, US5-4 | Con el mismo usuario en dos pestañas, bloquearlo en ambas. | La segunda avisa de que ya tiene otro estatus y se actualiza. |
| V22 | US5-1 a US5-3, US5-6, FR-022 | Eliminar el usuario de V9 (confirmar; también cancelando), buscarlo y reactivarlo. | Deja de aparecer en el listado, se encuentra con el estatus Eliminado y, al reactivarlo, vuelve con sus datos y los roles que tenía; su correo seguía reservado (un alta con él se rechaza mientras esté eliminado). |
| V23 | US4-6, FR-021 | Desbloquear `seed01@ejemplo.com` y reactivar `seed02@ejemplo.com` (no tienen cuenta en Auth0). Las caídas de Auth0 se cubren con pruebas automatizadas. | Aviso de que no existe su cuenta de acceso; el usuario conserva su estatus. |
| V24 | US4-9, US5-8, FR-015 | Con A4: conceder solo `users:read` y `users:update`; luego `users:delete`. | Con `users:update`: «Editar», «Quitar role» y las acciones de estatus, no «Eliminar»; con `users:delete`: «Eliminar». |
| V25 | FR-016, FR-022 de la 001 | Recorrer listado, detalle, alta y edición a 1024 px y a 320 px (o con zoom del 400 % en 1280 px) y solo con teclado. | Textos en español; fechas en hora local; sin desplazamiento horizontal de la página (la tabla se desplaza dentro de su recuadro); todo se opera con teclado y los diálogos devuelven el foco. |
| V26 | SC-002, SC-007 | Con la pestaña Red y sin limitación, abrir «Usuarios»; buscar un correo. | La primera página aparece en menos de 2 s; la búsqueda se resuelve en menos de 30 s (típicamente, un instante). |

Los escenarios con fallos de Auth0, tiempos de espera y conflictos simultáneos (V12, V16, V18, V21, V23) también se cubren con pruebas automatizadas contra el simulador del servicio, para no depender de ellos.

## 4. Comprobaciones automatizadas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage                    # umbral de 80 % de líneas en api, policy, schemas, hooks y shared
npm run build
npm run size                             # JS de la ruta de entrada <= 300 KB gzip: el Data Grid no debe entrar en ella
npm run test:e2e                         # solo con entorno de pruebas de Auth0 (variables E2E_*)
```

`e2e/users.spec.ts` se omite sin las variables de la cuenta A1 (`E2E_AUTH0_USER_A1` y `E2E_AUTH0_PASSWORD_A1`): con ellas corren las lecturas (V1 a V3, V5, V7 y V8). El recorrido que **crea** un usuario (V9, V15, V20 y V22) crea una cuenta real en Auth0 en cada ejecución, así que solo corre con estas variables más:

| Variable | Uso |
|---|---|
| `E2E_ALLOW_USER_CREATION` | `true` para permitir que la prueba cree usuarios. |
| `E2E_NEW_USER_EMAIL_DOMAIN` | Dominio que controlas; el correo es `qa+002-<marca de tiempo>@<dominio>`. |
| `E2E_NEW_USER_PASSWORD` | Contraseña inicial de esos usuarios; debe cumplir la política de contraseñas de Auth0. |

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| No aparece «Usuarios» en la navegación | El operador no tiene `users:read` en un role autorizado (Administrator, Developer, Marketing o Billing) | Revisar los permisos del role (paso 1) y volver a la pestaña. |
| No aparece «Crear usuario» | Faltan `users:write`, `users:update` o `roles:read` | Las tres son necesarias (V13). |
| El campo de roles muestra un error o está vacío | Falta `roles:read` o el servicio no responde | Revisar el permiso y usar «Reintentar». |
| Crear falla con «El sistema de cuentas de acceso rechazó la creación» | La aplicación de gestión de Auth0 no tiene `create:users` o sus credenciales son incorrectas | Revisar la autorización y el `.env` del servicio. |
| Crear o cambiar el estatus falla con «No se pudo actualizar la cuenta de acceso por ahora» | Auth0 tardó o limitó el ritmo (el servicio espera hasta 10 s) | Reintentar; el usuario no cambió. |
| Un usuario recién creado entra pero ve «Acceso denegado» | No tiene un role autorizado (Administrator, Developer, Marketing o Billing) | Agregarle uno desde el detalle. |
| El listado no muestra a un usuario que existe | Está bloqueado o eliminado (el listado solo muestra activos) | Buscarlo por su correo exacto. |
| Tras bloquear al último usuario de la última página el listado cambia de página | Es lo previsto: la página ya no existe | Ninguna. |
| El pie de la tabla sale en inglés | Falta la localización del Data Grid en el tema | Revisar `src/app/theme/theme.ts` (D6). |
| Todas las llamadas dan 403 `permission_denied` | El operador perdió el permiso (se recomprueba al volver a la pestaña) | Restaurar el permiso o esperar la recomprobación. |
| `/api/v1/authorization/me` responde 404 | La consulta `me` aún no está implementada | Ver la guía de la 001. |
