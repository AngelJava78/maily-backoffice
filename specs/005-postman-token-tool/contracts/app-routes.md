# Contrato de la interfaz: ruta, permiso, controles y estados de la pantalla Token

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [../spec.md](../spec.md)

Amplía [../../001-auth-session-profile/contracts/app-routes.md](../../001-auth-session-profile/contracts/app-routes.md) (guarda, avisos y accesibilidad de las pantallas) y sigue el patrón de [../../002-manage-users/contracts/app-routes.md](../../002-manage-users/contracts/app-routes.md). La herramienta se registra en `app/navigation/sections.ts` (`id` `token`, ruta `/tools/postman-token`, recurso `token`, texto `Token`) y su ruta vive dentro de la guarda `ProtectedRoute` y del layout, envuelta en `RequirePermission resource="token"`.

## Ruta

| Ruta | Permiso para entrar | Pantalla | Parámetros |
|---|---|---|---|
| `/tools/postman-token` | `token:read` | Token | Ninguno. No hay estado en la URL ni en el estado de navegación: el token jamás viaja allí |

- Cambia respecto a la 001: la fila deja de ser «Protegida + indicador de la 005» y deja de depender de `VITE_FEATURE_POSTMAN_TOKEN`; la ruta **siempre está registrada** y la decide solo el permiso (research D1).
- La ruta declara `handle.titleKey: 'token'` (título de documento «Token — MailySoft Backoffice») y su `ErrorBoundary`. La pantalla se carga con `React.lazy` y comparte el `Suspense` del layout; como `RequirePermission` solo renderiza a sus hijos si hay permiso, **el chunk no se pide** sin él.

## Guarda y permiso

| Situación | Resultado |
|---|---|
| Sin sesión | `ProtectedRoute` lleva a `/access` con la ruta de retorno; no se muestra ningún token (US2-9) |
| Acceso resolviéndose o fallido | Lo que ya decide la guarda de la 001; la pantalla no se renderiza hasta que el acceso esté concedido |
| Con acceso y **sin** `token:read` | `RequirePermission` redirige a `/` con la notificación «Tus permisos cambiaron y la sección en la que estabas ya no está disponible.»; no se renderiza la pantalla, no se pide su chunk ni se llama a Auth0 (US2-6, FR-005) |
| Con `token:read` | Se renderiza la pantalla en su estado inicial |
| Pierde `token:read` con la pantalla abierta | Tras la recomprobación de la 001 (cada 5 minutos, al volver a la pestaña o al recargar) la guarda redirige a `/` con la misma notificación y la pantalla se desmonta: el token en pantalla se descarta (US2-8, FR-018) |

La entrada «Token» de la navegación aparece solo para quien tiene `token:read` (`getVisibleSections`) y se coloca después de «Usuarios». En la página principal, quien solo tiene `token:read` no ve el aviso «Sin permisos asignados» (research D2).

## Pantalla y estados

Al abrir la pantalla siempre se parte del **estado inicial**, aunque se haya generado un token antes en la sesión (FR-018).

| Estado | Cuándo | Qué se ve | Controles |
|---|---|---|---|
| Inicial | Cada vez que se abre | `h1` «Token» con el foco; advertencia; campo del token vacío con su ayuda; expiración vacía («—»); sin «Mostrar», «Ocultar» ni «Copiar» | «Generar» |
| Generando (sin token) | Tras pulsar «Generar» | Lo mismo, con el botón deshabilitado y un indicador de progreso | Ninguno |
| Vigente, oculto | Llegó el token | Campo con la máscara; fecha y hora de expiración en la zona del navegador; «Vigente»; el valor real **no está en el DOM** | «Mostrar», «Copiar», «Refrescar» |
| Vigente, visible | Tras «Mostrar» | Valor completo en un campo de solo lectura que se ajusta sin recortarse | «Ocultar», «Copiar», «Refrescar» |
| Refrescando | Tras pulsar «Refrescar» | El token anterior sigue en pantalla; el botón deshabilitado con indicador | «Mostrar» u «Ocultar» y «Copiar» siguen disponibles; el botón principal no |
| Expirado | Llegó la hora de expiración con la página abierta | «Expirado» en lugar de «Vigente»; se anuncia; **sin «Copiar»** | «Mostrar» u «Ocultar», «Refrescar» |
| Fallo al generar | Falló la primera solicitud | Estado inicial más la alerta de fallo | «Generar» y los de la alerta |
| Fallo al refrescar | Falló una solicitud con token en pantalla | El token anterior (vigente o expirado) sin cambios más la alerta | «Refrescar» y los de la alerta |

Tras «Generar» el botón pasa a «Refrescar» y no vuelve a «Generar» mientras haya un token en pantalla. «Refrescar» reemplaza el token por uno nuevo, **vuelve a ocultarlo** aunque el anterior estuviera visible y actualiza la expiración (FR-015).

## Controles y nombres accesibles

El texto visible es el nombre accesible (WCAG 2.5.3); las pruebas consultan por rol y nombre.

| Control | Rol y nombre | Cuándo existe |
|---|---|---|
| Botón principal | `button` «Generar» o «Refrescar» (con `loading` mientras espera) | Siempre |
| Campo del token | `textbox` de solo lectura con la etiqueta «Token» | Siempre (vacío, enmascarado o con el valor) |
| Mostrar / Ocultar | `button` «Mostrar» u «Ocultar» | Con token en pantalla |
| Copiar | `button` «Copiar» | Con token vigente en pantalla |
| Vigencia | Texto «Vigente» o «Expirado» (en un `Chip`) | Con token en pantalla |
| Expiración | Etiqueta «Fecha y hora de expiración» con su valor, o «—» | Siempre |
| Advertencia | `role="note"` | Siempre, en todos los estados (FR-017) |
| Alerta de fallo | `role="alert"` con título, mensaje y botones | Tras un fallo, hasta la siguiente solicitud |
| Anuncios | `role="status"` (`LiveStatus`), siempre en la página | Siempre |

No existe ningún control para generar credenciales de otra persona ni de una aplicación (FR-008).

## Alerta de fallo

| Tipo (`kind`) | Título | Botones |
|---|---|---|
| `session-expired` | «Tu sesión ya no es válida» | «Reintentar» e «Iniciar sesión de nuevo» |
| `unreadable-token` | «No se pudo leer el token» | «Reintentar» |
| `unknown` | «No se pudo obtener el token» | «Reintentar» |

«Reintentar» repite la última acción («Generar» o «Refrescar»). «Iniciar sesión de nuevo» cierra la sesión local y la guarda lleva a `/access` conservando la ruta de retorno (research D10). Nunca se muestra el mensaje del SDK.

## Textos (`messages.token`, además de `nav.sections.token` y `titles.token`)

| Clave | Texto |
|---|---|
| `nav.sections.token`, `titles.token`, `title` | Token |
| `warning` | Este token da acceso a MailySoft con tus permisos. No lo compartas ni lo guardes en lugares públicos. |
| `fields.token` / `fields.expiresAt` | Token / Fecha y hora de expiración |
| `emptyToken` / `emptyExpiry` | Aún no has generado un token. Pulsa «Generar» para obtener uno. / — |
| `mask` | •••••••••••• |
| `validity.valid` / `validity.expired` | Vigente / Expirado |
| `actions.generate`, `refresh`, `show`, `hide`, `copy`, `signInAgain` | Generar, Refrescar, Mostrar, Ocultar, Copiar, Iniciar sesión de nuevo |
| `copied` | Token copiado al portapapeles. |
| `copyFailed` | No se pudo copiar al portapapeles. Pulsa «Mostrar» y copia el token a mano. |
| `announce.generated(expiresAt)` | Token generado. Expira el {expiresAt}. |
| `announce.expired` | El token expiró. Pulsa «Refrescar» para obtener uno nuevo. |
| `errors.sessionExpired` | Tu sesión ya no es válida / No se pudo obtener el token porque tu sesión terminó. Reintenta o inicia sesión de nuevo. |
| `errors.unreadableToken` | No se pudo leer el token / El proveedor de acceso devolvió un token con un formato inesperado. Puedes reintentar. |
| `errors.unknown` | No se pudo obtener el token / Ocurrió un problema al pedir el token. Puedes reintentar. |

«Reintentar» sale de `messages.common.retry`. Los textos exactos se afinan al implementar; lo que no cambia es que viven todos en el módulo de mensajes.

## Avisos

| Aviso | Mecanismo | Cuándo |
|---|---|---|
| Token copiado | Notificación temporal de éxito | «Copiar» funciona |
| No se pudo copiar | Notificación de error que permanece hasta cerrarla | `navigator.clipboard` ausente o rechaza la escritura; el token **no** se revela solo |
| Token generado | Anuncio `role="status"` | Llega un token (también tras «Refrescar») |
| El token expiró | Anuncio `role="status"` y cambio del `Chip` | Llega la hora de expiración |
| Fallo | Alerta en la página | Falla una solicitud |
| Sin permiso o permiso retirado | Redirección a `/` y notificación de siempre | La guarda (arriba) |

## Accesibilidad

Mismas reglas que la 001 y la 002 (regiones, título por ruta, foco al `h1`). Además: el `h1` recibe el foco al montarse y los controles conservan el suyo al cambiar de etiqueta (no se vuelve a crear el botón principal); vigente o expirado se dice con texto, no solo con color; el anuncio de expiración no se repite cada segundo (no hay cuenta regresiva); el token visible se puede seleccionar con el teclado y el largo se ajusta sin desplazamiento horizontal de la página desde 320 px; el campo no activa el autocompletado ni el corrector del navegador.
