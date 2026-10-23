# Contrato de la interfaz: pantalla y ruta de Roles y permisos

**Feature**: `013-roles-permisos` | **Fecha**: 2026-10-23 | **Spec**: [../spec.md](../spec.md)

## Ruta

| Ruta | Guarda | Contenido |
|---|---|---|
| `/roles` | `<RequirePermission resource="roles">` (acción `read`) | `RolesPage`: pestañas + lista + detalle, todo en una sola pantalla (research D5; variante de patrón reconocida en la constitución v1.5.0, Principio VI). |

Una sola ruta, sin `/roles/new` ni `/roles/:id`: crear es un diálogo (`RoleFormDialog`) sobre la misma pantalla, y el detalle se selecciona por `roleId` en la URL, no por segmento de ruta (ver más abajo). Quien no tiene `roles:read` no ve la entrada "Roles y permisos" en el menú (`getVisibleSections`) ni puede entrar a `/roles` escribiendo la URL (FR-001, SC-005).

## Estado en la URL (`RolePermissionsLocation`, data-model.md)

| Search param | Valores | Por defecto | Efecto |
|---|---|---|---|
| `type` | `clinica` \| `sistema` | `clinica` | Pestaña activa; cambia qué lista de roles y qué catálogo de módulos se consulta. |
| `roleId` | entero | ausente | Rol seleccionado dentro de la pestaña activa; ausente = ningún detalle a la derecha (estado "elige un rol"). |

Cambiar de pestaña limpia `roleId` si el rol seleccionado no pertenece a la pestaña nueva. Un `roleId` que ya no existe (eliminado en otra sesión) se limpia igual y el detalle vuelve al estado "elige un rol", sin error.

## Pantalla: estados

| Estado | Qué se ve |
|---|---|
| Cargando la lista | Indicador de carga en el panel izquierdo; el detalle, si había uno antes de recargar, no se muestra hasta que la lista confirme que ese rol sigue existiendo. |
| Lista vacía (una pestaña sin roles) | Mensaje invitando a crear el primer role de ese tipo, con el botón "Nuevo role" (edge case de spec.md). |
| Error al listar | Bloque de error con "Reintentar", mismo patrón que el resto del repo. |
| Detalle: cargando la matriz | El resto del detalle (nombre, descripción, tipo, contador) se muestra en cuanto llega `GET /roles/{id}` y `GET /roles/{id}/permissions`; la tabla de permisos tiene su propio indicador mientras llegan `GET /permissions` y `GET /modules` (pueden tardar distinto). |
| Detalle: tabla de permisos sin poder cargarse | El resto del detalle se mantiene visible; un aviso puntual reemplaza solo la tabla (FR-020), sin botón de reintentar genérico de pantalla completa. |
| Detalle: éxito | Nombre y descripción editables, tipo (no editable, solo texto), contador "X de Y permisos", tabla completa, botones "Duplicar", "Guardar cambios"/"Descartar cambios" y "Eliminar role". "Guardar cambios" aplica a la vez el nombre, la descripción y los permisos (FR-010, FR-021). |

## Tabla de permisos (`PermissionsMatrix`)

| Bloque | Contenido |
|---|---|
| Encabezado | Una columna por acción presente en al menos un módulo de esa pestaña, en el orden fijo Ver, Crear, Modificar, Eliminar, más "Todo el módulo" al final. |
| Fila | Nombre del módulo (`Module.name`); una casilla por acción que ese módulo tiene en el catálogo (`cells` no vacío para esa `action.key`), vacío (sin casilla) si el módulo no tiene esa acción; casilla "Todo el módulo" solo si el módulo tiene al menos una acción. |
| Interacción | Marcar Crear/Modificar/Eliminar marca también Ver si hacía falta (FR-008); desmarcar Ver desmarca el resto de la fila; "Todo el módulo" marca o desmarca de una vez todas las casillas presentes de la fila (FR-009). Cada casilla deshabilitada mientras su guardado está en curso. |
| Encabezados accesibles | `scope="col"` en la cabecera de cada acción, `scope="row"` en el nombre de cada módulo (constitución, Principio VI, WCAG 2.1 AA). |

"Guardar cambios" queda deshabilitado sin cambios pendientes; "Descartar cambios" restaura la tabla al último estado cargado del servidor, sin pedir confirmación (es una acción no destructiva, a diferencia de eliminar el rol).

## Diálogos

| Diálogo | Dispara | Campos / contenido | Cierra con |
|---|---|---|---|
| `RoleFormDialog` | "Nuevo role" | Nombre\*, Descripción, Tipo\* (Clínica/Sistema, con los módulos disponibles de cada uno ya determinando qué roles aparecen en "Copiar permisos de"), "Copiar permisos de" (`CopyPermissionsFromField`, Autocomplete de roles del mismo tipo elegido, vacío por defecto) | "Crear role" (valida, ver Errores) o "Cancelar" (sin crear nada) |
| `DeleteRoleDialog` | "Eliminar role" | Nombra el role por su nombre; advierte "no se puede deshacer" (texto del propio mockup) | "Eliminar role" (confirma) o cerrar sin acción |
| Aviso de cambios sin guardar | Cambiar de pestaña, de rol o salir de `/roles` con la tabla modificada sin guardar | Ofrece descartar y continuar, o quedarse (FR-010 implícito en Historia 1, edge case de spec.md) | — |

"Duplicar" no abre un diálogo propio: crea de inmediato (research D7) y deja el nuevo role seleccionado (`roleId` actualizado en la URL) con el foco en el campo nombre del detalle, listo para renombrarlo.

## Errores de formulario

Ver [roles-service.md](roles-service.md) para el catálogo completo; en la interfaz, `role_name_already_exists` y cualquier `validation_error` con `field: "name"` se muestran bajo el campo Nombre de `RoleFormDialog` (al crear) o del nombre editable del detalle (al modificar), nunca como aviso genérico de página.

## Accesibilidad

WCAG 2.1 AA (constitución, Principio VI): `Tabs` estándar de MUI para Clínica/Sistema (con `role="tablist"` nativo); foco movido al título de `RoleFormDialog`/`DeleteRoleDialog` al abrirse y devuelto al control que los abrió al cerrarse; cada casilla de la matriz con una etiqueta accesible que combine módulo y acción (no solo "Ver" suelto, para que un lector de pantalla no pierda el contexto de fila al navegar por columnas); mensajes de error de campo asociados con `aria-describedby`.
