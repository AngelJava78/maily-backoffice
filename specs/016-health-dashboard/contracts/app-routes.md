# Contrato de interfaz: rutas, pantallas y secciones

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Las rutas nuevas, lo que muestra cada pantalla en cada estado, el foco, los anuncios y las dos secciones que se añaden a «No se pudo comprobar el acceso». Los estados y los textos están en [data-model.md](../data-model.md); las decisiones, en [research.md](../research.md).

## Rutas

Todas dentro de `ProtectedRoute` → `AppLayout`, con `RouteErrorBoundary`, y bajo `RequirePermission resource="health"`: sin `health:read` (o al perderlo) se va al Panel con el aviso de que la sección no está disponible y no se consulta nada (FR-002).

| Ruta | Pantalla | `titleKey` → título de pestaña | Guarda adicional |
|---|---|---|---|
| `/health` | «Salud de servicios» | `health` → «Salud de servicios — MailySoft Backoffice» | — |
| `/health/components` | «Componentes monitoreados» | `healthComponents` → «Componentes monitoreados — MailySoft Backoffice» | — |
| `/health/components/new` | «Nuevo componente» | `healthComponentCreate` → «Nuevo componente — MailySoft Backoffice» | `RequireCapability` con `canCreate` (`health:write`) |
| `/health/components/:componentId` | «Detalle del componente» | `healthComponentDetail` → «Detalle del componente — MailySoft Backoffice» | `componentIdParam`: si no es UUID, «Página no encontrada» |
| `/health/components/:componentId/edit` | «Editar componente» | `healthComponentEdit` → «Editar componente — MailySoft Backoffice» | `RequireCapability` con `canEdit` (`health:update`) y `componentIdParam` |

- Sin la capacidad, el alta y la edición vuelven a `/health/components` (con `replace`) y el aviso «No tienes permiso para realizar esta acción.»; lo mismo si se pierde con el formulario abierto (FR-041, FR-032).
- Al entrar a cada pantalla, el foco va a su `h1` (FR-004). Cambiar solo la página o el tamaño de página del listado no mueve el foco.
- Todas las pantallas se cargan de forma diferida (`React.lazy`); el listado trae el Data Grid en su fragmento (FR-052).

## Navegación

- Entrada «Salud de servicios» (icono `health`) en `src/app/navigation/sections.ts`, visible solo con `health:read`, después de Suscripciones y antes de Token (FR-003). Orden resultante: Módulos, Roles y permisos, Usuarios, Suscripciones, Salud de servicios, Token.
- «Salud de servicios» enlaza a «Componentes monitoreados»; el registro enlaza de vuelta (FR-005). El registro no tiene entrada en el menú.

## `/health` — «Salud de servicios»

Orden de la pantalla, de arriba abajo:

1. `h1` «Salud de servicios».
2. Barra: «Actualizado hace X s» (o «X min», o la fecha y la hora), «Actualizando…» mientras se consulta el agregador con datos en pantalla, el botón «Actualizar» y el enlace «Componentes monitoreados». En la carga y sin datos, la barra muestra solo el enlace; en el estado sin permiso, nada.
3. Fallo de FR-030: `RefreshFailedAlert` (con datos) o `ErrorState` con «Reintentar» (sin datos), los dos con `role="alert"`, y la causa posible si el agregador respondió 503.
4. Secciones «Estado de la plataforma» y, si su consulta falló, «Comprobación directa» (abajo), solo mientras la última consulta al agregador falló por red, tiempo, 5xx o contrato.
5. Estado general con icono, texto y color y «N de M operativos».
6. Avisos: base de datos detenida por horario (con la línea de regreso) o caída, y registro no disponible.
7. `h2` «Componentes» y la lista; cada componente con su `h3`, sus datos y su botón «Detalle».
8. `h2` «Backoffice» con versión, commit y fecha de build (se ve en la carga, con datos y con fallo; no en el estado sin permiso).

| Estado | Contenido |
|---|---|
| Carga (primera visita) | `PageLoader` y el bloque Backoffice |
| Con datos | Puntos 1, 2 y 5 a 8 |
| Actualizando | Lo mismo con «Actualizando…» (sin anuncio, sin mover el foco) |
| Fallo con datos | Puntos 1 a 8, con los datos conservados y su antigüedad |
| Fallo de primera carga | Puntos 1, 3, 4 y 8 |
| Sin permiso (403) | Punto 1 y «No tienes permiso para ver la salud de los servicios.»; nada más, sin consultas en esa visita |
| Lista vacía | «No hay componentes para mostrar.» en lugar de la lista |

- **«Actualizar»**: consulta en el momento si no hay un ciclo en curso; si lo hay, se une a él. No se deshabilita y el foco se queda en el botón (FR-026, US2-6).
- **Detalle**: botón con nombre accesible «Detalle de {nombre}», `aria-expanded` y `aria-controls`; plegado al cargar; sigue desplegado tras cada actualización (FR-015).
- **Ciclos** (FR-020 a FR-028): cada `VITE_HEALTH_REFRESH_SECONDS` desde que terminó el anterior (incluida la cadena), solo con la pestaña visible y la página abierta; al volver a la pestaña, solo si ya venció el intervalo desde la última actualización correcta; no cuentan como actividad para el cierre por inactividad.

## `/health/components` — «Componentes monitoreados»

- `h1` «Componentes monitoreados», enlace «Salud de servicios», la explicación de que maily-system-api y la base de datos se monitorean siempre, sin registrarlos (FR-043), y «Nuevo componente» con `canCreate`.
- Data Grid paginado en el navegador: 10 por página por defecto, 10, 25 o 50, total y controles; `?page=` y `?pageSize=` en la dirección; nunca más filas que el tamaño elegido (FR-034). Columnas: nombre (enlace al detalle), código, tipo, URL base (texto), «Habilitado» o «Deshabilitado» y orden, en el orden del servicio.
- Estados: carga; vacío («Todavía no hay componentes registrados.» y la explicación; «Nuevo componente» con `canCreate`); error con «Reintentar» (con la causa de FR-030 si es 503); sin permiso.

## `/health/components/:componentId` — «Detalle del componente»

- `h1` «Detalle del componente», como el detalle de Suscripciones; lista de descripción con nombre, código, tipo, URL base (texto), rutas (en un frontend, «Ruta de salud» y «Ruta de información»), «Habilitado» o «Deshabilitado», orden, fecha de alta y de última modificación; «Editar» (`canEdit`), «Eliminar» (`canDelete`) y «Volver a Componentes monitoreados» (FR-035). Los nombres largos se ajustan; aquí se ve completo (caso límite).
- Estados: carga, error con «Reintentar», y 404: «Este componente ya no existe.» y vuelta al listado actualizado (FR-039).
- **Eliminar**: `ConfirmDialog` «¿Eliminar {nombre}?» con «Dejará de monitorearse y de aparecer en Salud de servicios.», «Eliminar» y «Cancelar»; el foco vuelve a «Eliminar» al cancelar. Al confirmar: aviso de éxito y vuelta al listado, donde ya no aparece (FR-040).

## `/health/components/new` y `/health/components/:componentId/edit`

- `h1` «Nuevo componente» o «Editar componente».
- Formulario compartido (FR-036 a FR-038): nombre, código, tipo (Microservicio o Frontend; en la edición, código y tipo como información fija), URL base, rutas según el tipo, «Habilitado» y orden. Un microservicio propone `/health/live`, `/health/ready` e `/info`; un frontend pide «Ruta de salud» y «Ruta de información» (opcional) y muestra la advertencia de que, en un frontend que responde con su página a cualquier dirección, una ruta que no existe parecería sana.
- Errores junto a cada campo antes de enviar (React Hook Form + Zod) y los rechazos del servicio según [monitored-components.md](monitored-components.md#errores). «Guardar» se deshabilita mientras se envía; si falla, se conserva lo escrito (FR-039).
- La edición tiene los mismos estados de carga, error y 404 que el detalle (FR-037).
- Al guardar: aviso de éxito y el listado o el detalle con el cambio (FR-042).

## «No se pudo comprobar el acceso» (pantalla de la 001 y la 006)

Sin cambios en el título, el mensaje, «Reintentar», «Cerrar sesión», la línea de la cuenta, el límite de 30 s ni las reglas de acceso (FR-065). Debajo de la línea de la cuenta, en un fragmento diferido:

1. Sección «Estado de la plataforma» (`h2`).
2. Si su consulta falló, sección «Comprobación directa» (`h2`).

- **Cuándo se consultan**: al aparecer la pantalla y cada vez que «Reintentar» vuelve a fallar; nunca mientras se comprueba el acceso (lo que esté en curso se cancela al elegir «Reintentar»), ni con el paso del tiempo, el regreso a la pestaña o las recomprobaciones que la persona no pide (FR-061, FR-071). Si «Reintentar» da el acceso, la persona entra sin esperarlas.
- **Si el fragmento tarda**: la sección muestra «Consultando el estado de la plataforma…»; si no carga, «No se pudo obtener el estado de la plataforma.», y el resto de la pantalla sigue funcionando.
- **Quién la ve**: cualquiera que llegue a esta pantalla, tenga o no un rol de Sistema. «Sin acceso» (`/access-denied`) no la muestra ni consulta nada (FR-055).

## Las secciones de respaldo (en las dos pantallas)

### «Estado de la plataforma»

- Carga: «Consultando el estado de la plataforma…». Con datos: el estado general en texto («Todo operativo», «Degradado», «Con componentes caídos» o «Desconocido») y cada componente con su nombre y su estado (icono y texto), en el orden recibido. Si la base de datos está `stopped`: «Base de datos detenida por horario» y, con `next_start_at`, «Vuelve a estar disponible el lunes 2 de noviembre a las 8:00» o, si ya pasó, «Su encendido estaba programado para el …». Vacía: «No hay componentes para mostrar.». Fallo: «No se pudo obtener el estado de la plataforma.».
- Nunca muestra versiones, commits, URLs, latencias, chequeos ni errores, ni completa con otra fuente (FR-058).
- Al volver a consultarse, conserva lo que mostraba con «Actualizando…»; si la consulta nueva falla, el fallo reemplaza lo anterior (FR-064).

### «Comprobación directa»

- Carga: «Comprobando los servicios desde tu navegador…». Al terminar todas las consultas (≤ 5 s): «No se pudo consultar el monitoreo central (maily-system-api). Esto es lo que tu navegador pudo comprobar directamente:», una fila por servicio («maily-system-api: No responde», con icono y texto; en «Degradado», su explicación) y «Los demás componentes (base de datos, MailySoft y los componentes registrados que no aparecen en esta lista) no se pueden comprobar desde el navegador: Sin información.» (FR-070).
- Al repetirse, conserva lo que mostraba con «Actualizando…». Desaparece en cuanto responden bien el agregador o el estado público, y en el estado sin permiso.

### Anuncios y foco

- El fallo de FR-030 o el de la comprobación del acceso se anuncian primero (asertivos).
- Cada sección se anuncia una vez, de forma cortés y en su propia región, al cargar por primera vez desde que apareció y tras cada «Reintentar» o «Actualizar» de la persona; nunca en los ciclos automáticos (FR-063, FR-075).
- Nada mueve el foco. Las dos secciones se adaptan hasta 320 px sin desplazamiento horizontal (FR-051).
