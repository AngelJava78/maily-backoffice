# Contrato de la interfaz: rutas, guardas y avisos

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17

## Rutas

| Ruta | Acceso | Pantalla | Notas |
|---|---|---|---|
| `/access` | Pública | Acceso | Botón "Iniciar sesión". Si ya hay sesión concedida, redirige a `/` (User Story 1, escenario 4). Muestra el aviso: `expired` o `idle` del estado de sesión de la pestaña (cuando la sesión terminó sola) o, si no hay, `cancelled` o `idpError` del estado del router. |
| `/access/idle` | Pública | Acceso con aviso de inactividad | Misma pantalla; es el destino del cierre por inactividad (FR-020). Lee y borra la ruta de retorno guardada (D11). |
| `/callback` | Pública | Cierre del inicio de sesión | Indicador de progreso mientras el SDK procesa el código; ante un error del proveedor redirige a `/access` con el aviso. No muestra contenido protegido. |
| `/` | Protegida | Página principal | Nombre del operador, aviso de "sin permisos asignados" si procede, secciones disponibles. |
| `/profile` | Protegida | Perfil (solo lectura) | Nombre, apellido paterno, apellido materno (vacío si no tiene), correo del usuario de MailySoft, iniciales y roles activos (sin imagen: la plataforma no la guarda). |
| `/users/*`, `/subscriptions/*`, `/clinics/*` | Protegida + permiso | Secciones de las features 002 a 004 | Cada una se registra en `app/navigation` al implementarse y se envuelve en `RequirePermission` (`read` del recurso). |
| `/tools/postman-token` | Protegida + permiso `token:read` (feature 005) | Herramienta de token | Siempre registrada; la decide solo el permiso (aclaración 4, reemplazada por la 005). |
| `*` | Protegida | Página no encontrada | Sin sesión se redirige antes a `/access` (FR-001); con acceso, enlace a `/`. |

## Guarda de rutas protegidas

Orden de decisión, sin mostrar nunca contenido protegido hasta el último paso (cierre seguro):

| Estado | Resultado |
|---|---|
| El SDK de Auth0 inicializa (`isLoading`) | Indicador de progreso. |
| Sin sesión | `Navigate` a `/access` con `returnTo` (ubicación actual) en el estado del router; solo la guarda redirige. Si la sesión terminó sola (venció, FR-013, o se cerró por inactividad en otra pestaña, FR-020), el motivo no viaja en el estado del router sino en el estado de sesión de la pestaña (`SessionProvider`), y `/access` lo lee de ahí. |
| Sesión y acceso resolviéndose | Indicador de progreso (FR-006). |
| Sesión y primera comprobación fallida | Pantalla "No se pudo comprobar el acceso" con el correo de la cuenta, Reintentar y Cerrar sesión (FR-005), como máximo 30 s después de iniciada la comprobación (SC-011). |
| Sesión y acceso denegado | Pantalla de acceso denegado con motivo, correo de la cuenta y Cerrar sesión, en lugar de cualquier ruta protegida (FR-004; User Story 2, escenario 4). |
| Sesión y acceso concedido | Layout de la aplicación con el `Outlet`. |

`RequirePermission` (por sección) comprueba `can(access, { resource, action: 'read' })`; si ya no corresponde tras una recomprobación (FR-021) navega a `/` y muestra un aviso.

## Avisos

| Aviso | Mecanismo | Cuándo |
|---|---|---|
| Sesión vencida, cancelación, error del proveedor, inactividad | Mensaje en `/access` y `/access/idle` | Tras el evento correspondiente (FR-013, FR-015, FR-020). |
| Rol sin permisos asignados | `Alert` permanente en `/` | FR-018. |
| Sección retirada por cambio de permisos | Notificación temporal en `/` | FR-021. |
| Sin permiso para una acción | Notificación temporal; la sesión sigue activa | FR-014 (`ApiError` 403). |
| Cierre por inactividad inminente | Diálogo modal con cuenta atrás y "Continuar" | A los 14 minutos (FR-020). |

## Retorno tras identificarse

| Origen | Cómo viaja `returnTo` |
|---|---|
| Visita directa a una ruta protegida | Estado del router → `appState.returnTo` del SDK → `onRedirectCallback`. |
| Sesión vencida o no renovable | Igual (no hay cierre de Auth0). |
| Cierre por inactividad | `sessionStorage` (D11), leído en `/access/idle`. |

## Accesibilidad de las pantallas

Regiones `header`, `nav` y `main`; enlace "Saltar al contenido"; título de documento por ruta; foco al encabezado principal tras cada cambio de ruta; el diálogo de inactividad atrapa el foco y es operable por teclado. Todas las pantallas se reacomodan desde 1024 px hasta 320 px de ancho sin desplazamiento horizontal (FR-022, D20).
