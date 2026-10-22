# Contrato de la interfaz: la ruta «Sin acceso» y la guarda actualizada

**Feature**: `006-system-role-access` | **Fecha**: 2026-10-21

Delta sobre `specs/001-auth-session-profile/contracts/app-routes.md`, que sigue siendo la referencia para todo lo que no se menciona aquí (`/access`, `/access/idle`, `/callback`, las rutas protegidas, los avisos y el retorno tras identificarse).

## Rutas

| Ruta | Acceso | Pantalla | Notas |
|---|---|---|---|
| `/access-denied` | Con sesión | «Sin acceso» (`AccessDeniedPage`, vía `AccessDeniedRoute`) | **Nueva (FR-011).** Sin menú, sin encabezado, sin el layout del Backoffice (FR-012): se dibuja sola, como hoy `/access` y `/callback`, sin compartir `PublicLayout` (research D5: evita dos regiones `<main>`). |

## Guarda de `/access-denied` (`AccessDeniedRoute`)

Repite, de forma independiente, las dos primeras comprobaciones de `ProtectedRoute` (research D4), y después decide lo contrario que ella:

| Estado | Resultado |
|---|---|
| El SDK de Auth0 inicializa (`isLoading`) | Indicador de progreso. |
| Sin sesión | `Navigate` a `/access` con `returnTo = '/access-denied'` en el estado del router (FR-020). |
| Con sesión: acceso resolviéndose | Indicador de progreso (FR-021, FR-008). |
| Con sesión: comprobación fallida | «No se pudo comprobar el acceso», con Reintentar y Cerrar sesión (FR-021, FR-024); igual pantalla que usa `ProtectedRoute`. |
| Con sesión: acceso concedido | `Navigate` a `/` (FR-019). |
| Con sesión: acceso denegado | Contenido de «Sin acceso» (ver abajo). |

`SessionWatchers` se monta en el mismo punto que en `ProtectedRoute` (cierre por inactividad y cierre en otra pestaña también aplican aquí, según el caso límite de la spec).

## Guarda de las rutas protegidas (`ProtectedRoute`) — cambio

Solo cambia la fila de "acceso denegado": antes dibujaba `AccessDeniedPage` en el sitio; ahora navega.

| Estado | Resultado |
|---|---|
| … (sin cambios: Auth0 cargando, sin sesión, resolviéndose, comprobación fallida) | … |
| Sesión y acceso denegado | `Navigate` a `/access-denied`, en vez de cualquier ruta protegida (FR-018). |
| Sesión y acceso concedido | Layout de la aplicación con el `Outlet` (sin cambios). |

## Contenido de «Sin acceso» (FR-013 a FR-017)

| Elemento | Contenido | Condición |
|---|---|---|
| Título (`h1`, con foco al llegar) | «No tienes acceso al Backoffice» | Siempre. |
| Mensaje (`role="alert"`) | «Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.» | Siempre; un solo texto, sin distinguir motivo (research D2). |
| Línea de cuenta | «Iniciaste sesión como {email}» | Si hay `email` (del usuario de MailySoft o, en su defecto, de la cuenta de Auth0; FR-014). Ausente si no hay ninguno. |
| Botón «Cerrar sesión» | `LogoutButton`, sin cambios | Siempre. |
| Enlace «Ir a MailySoft» | `href = mailySoftAppUrl` | Solo si `VITE_MAILYSOFT_APP_URL` está configurada (FR-015); ausente si no. |

Título de la pestaña: «Sin acceso — MailySoft Backoffice» (gestionado por el propio componente con `useDocumentTitle`, no por `handle.titleKey`: ver research D5).

## Redirecciones (resumen, FR-018 a FR-021)

| Quién | Abre | Va a |
|---|---|---|
| Con sesión, sin acceso | cualquier ruta interna (exista o no) | `/access-denied` |
| Con sesión, con acceso | `/access-denied` | `/` |
| Sin sesión | `/access-denied` | `/access` (con `returnTo` a `/access-denied`) |

## Avisos — sin cambios

La tabla de avisos de la 001 (sesión vencida, inactividad, 403 de una acción, etc.) no cambia. El único aviso que esta feature retira es el de "acceso denegado con motivo": ya no existe un motivo que mostrar.
