# Contrato de UI: lista de permisos de un role

**Feature**: `023-permissions-toggle-list` | **Date**: 2026-11-01

No hay contrato HTTP nuevo ni modificado: los de
[../../014-roles-permisos/contracts/roles-service.md](../../014-roles-permisos/contracts/roles-service.md)
siguen vigentes. Este documento fija lo que la pantalla expone a quien la usa y a las pruebas: la
interfaz de los dos componentes, su semántica accesible y el mapeo de las consultas antiguas.

## 1. Interfaz de los componentes (`src/features/roles/components/`)

```ts
interface PermissionsListProps {
  readonly matrix: PermissionMatrix;
  /** Nombre accesible de la lista: «Permisos de {role} por módulo y acción». */
  readonly label: string;
  /** Guardando o sin permiso de edición: todos los botones quedan no operables. */
  readonly pending: boolean;
  readonly onToggle: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (moduleId: number, checked: boolean) => void;
}

interface PermissionsListItemProps {
  readonly row: PermissionMatrixRow;
  readonly pending: boolean;
  readonly onToggle: (actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}
```

Las firmas de `onToggle`/`onToggleAll` son las de `PermissionsMatrix`/`PermissionsMatrixRow`, menos la
prop `columns` del elemento (ya no hay columnas). `checked` es el valor **nuevo** que se pide
(`!granted`).

## 2. Estructura y semántica

```text
<p id=…>texto de ayuda visible</p>                       roles.detail.matrixHelper
<ul aria-label="Permisos de {role} por módulo y acción"  List · aria-describedby = id de la ayuda
    aria-describedby=…>
  <li>Módulos de Clínica</li>                            solo si hay más de un tipo (ListSubheader)
  <li>                                                   un elemento por módulo
    <span>Pacientes</span>
    <div role="group">                                   ToggleButtonGroup · tabindex móvil
      <button aria-pressed="true"  aria-label="Ver de Pacientes">✓ VER</button>
      <button aria-pressed="false" aria-label="Crear de Pacientes">  CREAR</button>
      …solo las acciones que el módulo tiene, en orden Ver, Crear, Modificar, Eliminar
    </div>
    <button aria-pressed="false" aria-label="Todo el módulo de Pacientes">  TODO EL MÓDULO</button>
  </li>
</ul>
```

| Elemento | Contrato |
|---|---|
| Lista | `role=list` nativa; nombre = prop `label`; descripción = texto de ayuda visible |
| Botón de acción | `role=button` con `aria-pressed` (`true` = concedida); nombre accesible `{Acción} de {Módulo}`, que **contiene** el texto visible (`Ver`) |
| «Todo el módulo» | `role=button` con `aria-pressed` (`true` solo si todas las acciones del módulo están pulsadas); nombre `Todo el módulo de {Módulo}`; no aparece en un módulo sin acciones |
| Marca de verificación | decorativa (`aria-hidden`); visible solo con `aria-pressed="true"`; el hueco se conserva sin pulsar; se conserva en un botón deshabilitado |
| No operable (`pending`) | atributo `disabled` en el grupo y en «Todo el módulo»; mismo comportamiento que las casillas actuales |
| Vacía | sin `<ul>`; el mensaje `roles.detail.emptyModules` |

## 3. Teclado

| Acción | Tecla |
|---|---|
| Entrar al grupo de acciones de un módulo | Tab (una sola parada por grupo; el foco cae en el botón que MUI marca como activo del grupo) |
| Moverse entre las acciones del grupo | ← / → (tabindex móvil de MUI) |
| Alternar el botón con foco | Espacio o Enter |
| Ir a «Todo el módulo» y al siguiente módulo | Tab (cada uno es su propia parada) |

El foco siempre es visible (el de MUI para `ToggleButton`, sin ajustes).

## 4. Mapeo de las consultas de prueba (migración mecánica)

| Antes (casilla) | Después (botón) |
|---|---|
| `getByRole('checkbox', { name: 'Ver de Pacientes' })` | `getByRole('button', { name: 'Ver de Pacientes' })` |
| `expect(…).toBeChecked()` | `expect(…).toHaveAttribute('aria-pressed', 'true')` o `getByRole('button', { name, pressed: true })` |
| `expect(…).not.toBeChecked()` | `toHaveAttribute('aria-pressed', 'false')` o `{ pressed: false }` |
| `getAllByRole('checkbox')` dentro de una fila | `getAllByRole('button')` dentro del elemento (`within(item)`) |
| `getAllByRole('columnheader')` | no aplica: no hay cabeceras; se prueba el orden de los botones por elemento |
| `getByRole('row', { name: /Recordatorios/ })` | `getAllByRole('listitem').find((item) => within(item).queryByText('Recordatorios'))`; un `<li>` no tiene nombre accesible propio, así que no se consulta por `name` |
| `toBeDisabled()` sobre la casilla | igual sobre el botón |
| Playwright `getByRole('checkbox', { name })` + `isChecked()` / `toBeChecked({ checked })` | `getByRole('button', { name, pressed })` / `toHaveAttribute('aria-pressed', …)` |
| Teclado (`RolesPage.test.tsx`): Tab hasta `input[type=checkbox]` y Espacio | Tab hasta un elemento con `aria-pressed` y Espacio lo alterna |

Los nombres accesibles **se conservan** (`{Acción} de {Módulo}`, `Todo el módulo de {Módulo}`) para que
la migración sea cambiar el rol y la aserción, no los textos.
