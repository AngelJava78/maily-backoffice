# Contrato de la interfaz: rutas, capacidades y estados de la sección Suscripciones

**Feature**: `003-manage-subscription-types` | **Fecha**: 2026-10-20 | **Spec**: [../spec.md](../spec.md)

Amplía [../../001-auth-session-profile/contracts/app-routes.md](../../001-auth-session-profile/contracts/app-routes.md) (guarda, avisos y accesibilidad de las pantallas) y sigue el patrón de [../../002-manage-users/contracts/app-routes.md](../../002-manage-users/contracts/app-routes.md). La sección se registra en `app/navigation/sections.ts` (`id` `subscriptions`, ruta `/subscriptions`, recurso `subscriptions`, texto «Suscripciones», entre «Usuarios» y «Token»), y todas sus rutas viven dentro de la guarda `ProtectedRoute` y del layout con `RequirePermission resource="subscriptions"`.

## Rutas

| Ruta | Permisos para entrar | Pantalla | Parámetros |
|---|---|---|---|
| `/subscriptions` | `subscriptions:read` | Listado | `page` y `page_size` (abajo) |
| `/subscriptions/new` | `subscriptions:read` y `subscriptions:write` | Nueva suscripción | — |
| `/subscriptions/:subscriptionId` | `subscriptions:read` | Detalle | `subscriptionId`: entero de 1 a 2 147 483 647 escrito solo con dígitos, sin ceros a la izquierda; cualquier otro valor muestra «Página no encontrada» |
| `/subscriptions/:subscriptionId/edit` | `subscriptions:read` y `subscriptions:update` | Editar suscripción | `subscriptionId` como arriba |

- Sin `subscriptions:read`, la guarda de la sección manda a `/` con el aviso de siempre (001, FR-021); la opción «Suscripciones» no aparece en la navegación. Sin el permiso extra de una ruta, `RequireCapability` vuelve al listado (alta) o al detalle (edición), reemplazando la entrada, con el aviso «No tienes permiso para realizar esta acción.»; la API sigue siendo quien decide (`403`).
- Cada ruta declara `handle.titleKey` (`subscriptions`, `subscriptionCreate`, `subscriptionDetail`, `subscriptionEdit`) y su `ErrorBoundary`; las dos rutas con id declaran además `subscriptionIdParam: 'subscriptionId'`, para titular «Página no encontrada» una dirección cuyo id no lo es. Las pantallas se cargan con `React.lazy` y pintan su `h1` desde el primer render, porque el foco va a él tras cada cambio de ruta (001).

## Estado del listado en la URL (constitución III)

| Parámetro | Valores | Por defecto | Notas |
|---|---|---|---|
| `page` | Entero ≥ 1 (empieza en 1; el Data Grid cuenta desde 0) | 1 | Si es mayor que la última página (por ejemplo, tras eliminar la única suscripción de la última), se reemplaza por la última. |
| `page_size` | 10, 25 o 50 | 10 | Cambiarlo vuelve a `page=1` (US1-2). |

Un valor inválido se reemplaza por el de por defecto (la URL se normaliza con `replace`, sin añadir entradas al historial). No hay parámetros de orden, filtro ni búsqueda: el orden es fijo (FR-015).

## Estado de navegación (no se muestra, se valida con Zod)

| Origen → destino | `location.state` | Uso |
|---|---|---|
| Listado → detalle o alta | `{ listSearch: "?page=2&page_size=25" }` (solo las claves `page` y `page_size`) | «Volver al listado», cancelar el alta y el regreso tras eliminar llevan a esa página (US1-8, FR-003, FR-011). Sin estado (enlace directo o recarga sin historial), a `/subscriptions`. |
| Detalle → edición → detalle | `{ listSearch }` | Se conserva, para volver después al listado desde el detalle. |
| Alta guardada → detalle | `{ listSearch }` | Igual. |

## Pantallas y estados

| Pantalla | Cargando | Vacío | Error | Éxito |
|---|---|---|---|---|
| Listado | Data Grid con indicador de carga | «No hay suscripciones registradas» con «Nueva suscripción» (solo si puede crear) | Bloque de error con «Reintentar» (las lecturas se reintentan solas hasta 2 veces) | Filas con **nombre** (enlace al detalle), **precio mensual**, **estatus** y **clínicas**; total, página y tamaño; la región de estado dice «Mostrando X a Y de Z suscripciones.» |
| Detalle | Indicador bajo el `h1` | — | `404`: «Suscripción no encontrada» con enlace al listado; otros: bloque de error con «Reintentar». Un refresco fallido con datos en pantalla deja los datos y muestra un aviso no bloqueante con «Reintentar» | Datos, lo que incluye, fechas y acciones |
| Nueva suscripción | — | — | Error junto a cada campo o, si no corresponde a ninguno, error general sobre el formulario, que recibe el foco | Aviso «Suscripción creada.» y detalle (reemplazando la entrada del formulario) |
| Editar suscripción | Indicador mientras se carga la suscripción | — | `404`: «Suscripción no encontrada» con enlace al listado; otros: bloque de error con «Reintentar» y «Volver al listado». Al guardar, como el alta | Aviso «Suscripción guardada.», o «No había cambios que guardar.» sin enviar nada; en ambos casos, el detalle (reemplazando la entrada) |

## Datos y formatos

| Dato | Listado | Detalle | Formato |
|---|---|---|---|
| Nombre | Enlace al detalle; un texto largo se acorta con puntos suspensivos | Texto completo | Tal cual |
| Descripción | — | Texto, o «—» si no tiene | Tal cual, con sus saltos de línea |
| Precio mensual | «$4,500.00/mes» | Igual | `formatMxn` («$4,500.00») y el sufijo «/mes»; el 0 es «$0.00/mes» |
| Estatus | Etiqueta | Etiqueta | Por id (abajo) |
| Clínicas | Número o «No disponible» | Igual | Nunca 0 si la API no lo sabe |
| Lo que incluye | — | Lista en el orden guardado, o «Sin elementos» | Tal cual |
| Fechas | — | «Fecha de creación» y «Última modificación» | `formatDateTime` (hora local del operador) |

| Estatus (id) | Texto | Color |
|---|---|---|
| 1 | Activa | Verde (`success`) |
| 2 | Inactiva | Gris (`default`) |
| 3 | Bloqueada | Naranja (`warning`) |
| Otro | El nombre que da la API | Neutro con contorno (`default`, `outlined`) |

Ninguna fila se atenúa según su estatus: el estatus lo comunica solo la etiqueta, que siempre lleva texto (aclaración 2).

## Capacidades (permiso → acción)

La decisión siempre pasa por `can()` (módulo `features/auth/policy`): `app` calcula `getSubscriptionCapabilities` y entrega el resultado a las pantallas como propiedades. Todas exigen además `subscriptions:read`.

| Capacidad | Permiso | Dónde se ofrece |
|---|---|---|
| Nueva suscripción | `subscriptions:write` | Listado: junto al título y en el estado vacío |
| Editar | `subscriptions:update` | Detalle |
| Cambiar estatus | `subscriptions:update` | Detalle |
| Eliminar | `subscriptions:delete` | Detalle; deshabilitado si tiene clínicas |

Las filas del listado no tienen acciones (aclaración 3).

## Cambio de estatus, eliminación y avisos

| Acción | Confirmación (nombra la suscripción) | Aviso de éxito |
|---|---|---|
| Activar | Ninguna: se aplica al elegirla en el menú y el botón queda pendiente mientras tanto | «Suscripción activada.» |
| Inactivar | «Inactivar suscripción»: «La suscripción {nombre} pasará a Inactiva. Las clínicas que ya la tienen la conservan.»; botón «Inactivar» | «Suscripción inactivada.» |
| Bloquear | «Bloquear suscripción»: «La suscripción {nombre} pasará a Bloqueada. Las clínicas que ya la tienen la conservan.»; botón «Bloquear», variante `danger` | «Suscripción bloqueada.» |
| Eliminar | «Eliminar suscripción»: «La suscripción {nombre} dejará de aparecer y su nombre quedará libre. Esta acción no se puede deshacer.»; botón «Eliminar», variante `danger` | «Suscripción eliminada.», ya en el listado |
| Eliminar con clínicas | Ninguna: el botón está deshabilitado y a su lado se lee «Tiene 1 clínica asignada» o «Tiene N clínicas asignadas» | — |

- **Menú de estatus**: el botón «Cambiar estatus» (`aria-haspopup="menu"`) abre un menú con los estatus distintos del actual, nombrados por su verbo («Activar», «Inactivar», «Bloquear»); se opera con flechas, `Enter` y `Esc`, y el foco vuelve al botón al cerrarlo.
- **Diálogos** (`ConfirmDialog`): foco inicial en «Cancelar»; `Esc` y un clic fuera cancelan, salvo mientras la acción está pendiente; ambos botones se deshabilitan mientras tanto; el foco vuelve al botón que lo abrió y, si este desapareció, al botón principal que quede. El aviso del resultado se muestra cuando el diálogo terminó de cerrarse (`useDeferredNotice`).
- **Rechazos**: los mensajes y su efecto son los de [subscriptions-service.md](subscriptions-service.md), «Errores»; nunca cambian lo mostrado hasta que la API responde.

## Formulario (alta y edición)

| Campo | Control | Ayuda | Errores |
|---|---|---|---|
| Nombre | Texto, obligatorio | — | «El nombre es obligatorio.»; «El nombre no puede superar los 100 caracteres.»; «Ya existe una suscripción con este nombre.» |
| Descripción | Texto de varias líneas | «Opcional. Hasta 500 caracteres.» | «La descripción no puede superar los 500 caracteres.» |
| Precio mensual | Texto con «$» delante y «/mes» detrás; `inputMode="decimal"` | «Solo números y punto decimal, por ejemplo 4500 o 4500.50.» | «El precio mensual es obligatorio.»; «Escribe un importe de 0 a 99,999,999.99 solo con números y hasta dos decimales.» |
| Lo que incluye | Grupo «Lo que incluye» con un campo por elemento («Elemento N»), cada uno con su botón «Quitar el elemento N», el botón «Agregar elemento» y el contador «N de 20» | «Se muestra en este orden. Hasta 20 elementos.»; con 20, «Se alcanzó el máximo de 20 elementos.» | «Escribe el texto o quita el elemento.»; «Cada elemento admite hasta 150 caracteres.»; de la lista entera (rechazo de la API): «Revisa lo que incluye: hasta 20 elementos de 1 a 150 caracteres.» |

- «Guardar» se deshabilita y muestra que está trabajando mientras se guarda; «Cancelar», también. Cancelar lleva al listado desde el alta y al detalle desde la edición, sin preguntar por los cambios sin guardar.
- Al enviar con errores, el foco va al primer campo inválido; un error general recibe el foco.
- En la edición, «Guardar» no se deshabilita por falta de cambios (aclaración 9).

## Accesibilidad

Mismas reglas que la 001 y la 002 (regiones, título por ruta y foco al `h1`). Además: el estatus se muestra con texto y no solo con color, y las filas no se atenúan; la región `role="status"` del listado anuncia las filas que se muestran al cambiar de página o de tamaño; lo que incluye se muestra como lista (`<ul>`) en el detalle; los campos del formulario tienen etiqueta visible, marcan los obligatorios y asocian su error con `aria-describedby`; el grupo de lo que incluye es un `fieldset` con su `legend`; el motivo de un «Eliminar» deshabilitado es texto visible asociado al botón; y el listado se reacomoda hasta 320 px con desplazamiento horizontal dentro del propio recuadro de la tabla (WCAG 1.4.10 exceptúa las tablas de datos; 001, D20).
