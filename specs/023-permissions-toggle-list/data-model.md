# Modelo de datos: Permisos de un role como lista con botones de alternancia

**Feature**: `023-permissions-toggle-list` | **Date**: 2026-11-01

Esta feature **no agrega ni modifica ninguna entidad, campo, esquema Zod ni operación de API**. Role,
Módulo, Acción y Permiso concedido son los de
[../014-roles-permisos/data-model.md](../014-roles-permisos/data-model.md) (y la regla asimétrica de
módulos de Sistema, de
[../015-clinic-roles-system-modules/](../015-clinic-roles-system-modules/)). Lo único que se documenta
aquí es **cómo se proyecta la matriz existente en la lista** y qué estado visible se deriva de ella.

## Fuente de verdad (sin cambios)

`PermissionMatrix` = `readonly PermissionMatrixRow[]`, definido en
`src/features/roles/schemas/permissionMatrix.ts`:

| Tipo | Campos | Notas |
|---|---|---|
| `PermissionMatrixRow` | `module: Module`, `cells: Partial<Record<ActionKey, PermissionMatrixCell>>` | una fila por módulo del tipo del role, ya ordenada por `sortOrder` y nombre |
| `PermissionMatrixCell` | `permissionId: number`, `granted: boolean` | solo existe para las acciones que el módulo tiene en el catálogo |
| `ActionKey` | `'read' \| 'write' \| 'update' \| 'delete'` | orden fijo `ACTION_KEYS`: Ver, Crear, Modificar, Eliminar |

`useEditablePermissionMatrix(baseMatrix, roleId)` sigue entregando `matrix` (la base con los cambios
pendientes aplicados), `isDirty`, `toggle`, `toggleAll`, `diff` y `reset`. El estado pendiente es un
`Map<permissionId, boolean>` local; nada de esto se persiste en el navegador.

## Proyección en la lista (estado derivado, no almacenado)

Cada `PermissionMatrixRow` se convierte en **un elemento de la lista** (`PermissionsListItem`):

| Derivado | Cálculo | Dónde se ve |
|---|---|---|
| Botones del grupo | `ACTION_KEYS.filter((k) => row.cells[k] !== undefined)`, en ese orden | un botón por acción disponible; sin huecos (FR-002) |
| Botón pulsado | `row.cells[k].granted` | `aria-pressed` y marca de verificación (FR-003, FR-011) |
| «Todo el módulo» visible | hay al menos una acción disponible | botón suelto a la derecha (FR-006) |
| «Todo el módulo» pulsado | hay acciones y todas están `granted` | igual que `allGranted` de la casilla actual |
| Botones no operables | `pending` (guardando o sin permiso de edición) | `disabled` en el grupo y en «Todo el módulo» (FR-008) |

Y la lista (`PermissionsList`) deriva:

| Derivado | Cálculo | Dónde se ve |
|---|---|---|
| Lista vacía | `matrix.length === 0` | mensaje `roles.detail.emptyModules` en lugar de la lista (FR-010) |
| Agrupar por tipo | hay más de un `row.module.type.id` | un subencabezado `moduleGroupHeader(tipo)` antes del primer módulo de cada tipo (FR-009) |
| Contador «X de Y permisos» | `countGranted(matrix)` y `countTotal(matrix)` | lo sigue pintando `RoleDetailPanel`; «Todo el módulo» no cuenta (FR-004) |

Desaparece lo que existía solo por la tabla: el cálculo de «columnas presentes» (una columna solo si
algún módulo tiene esa acción) y la prop `columns` de la fila.

## Transiciones (las mismas reglas, ahora con botones)

Las implementan, sin cambios, `withPermissionToggled` y `withAllPermissionsToggled`:

| Evento sobre un módulo | Resultado en sus botones | Cambio pendiente |
|---|---|---|
| Pulsar Crear, Modificar o Eliminar sin pulsar (con Ver sin pulsar) | esa acción **y Ver** quedan pulsadas | ambas, si difieren de lo guardado |
| Pulsar Ver sin pulsar | Ver queda pulsada | solo Ver |
| Despulsar Ver | **todas** las acciones del módulo quedan sin pulsar | todas las que estaban concedidas |
| Despulsar Crear, Modificar o Eliminar | solo esa queda sin pulsar | solo esa |
| «Todo el módulo» con alguna acción sin pulsar | todas las disponibles quedan pulsadas | las que cambian |
| «Todo el módulo» con todas pulsadas | todas quedan sin pulsar | todas |
| Volver una acción a su valor guardado | vuelve a ese estado | se retira la sobrescritura (si era la última, `isDirty` pasa a falso y «Guardar cambios» se deshabilita) |

### Invariantes

- **I1** (FR-005, SC-005): en un módulo que tiene la acción Ver, no puede haber una acción pulsada si
  Ver no lo está. Lo garantiza la función pura, no el componente; los botones solo reflejan su salida.
- **I2** (FR-004, SC-004): el «X» del contador es siempre el número de botones de acción pulsados de
  toda la lista (sin contar «Todo el módulo»); el «Y», el número de botones de acción mostrados.
- **I3** (FR-002): un módulo sin celda para una acción no tiene botón para ella, ni activo ni inactivo.
