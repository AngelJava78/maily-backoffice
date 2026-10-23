# Data Model: Modo Oscuro y Claro del Backoffice

No hay estado de servidor ni persistencia remota (Technical Context: Storage = `localStorage`,
cliente únicamente, por la Clarification de `spec.md`). Las "entidades" de esta feature son
estructuras de preferencia y de diseño que viven en código fuente y en el navegador de cada
persona, no en una base de datos.

## Preferencia de Tema

La elección de apariencia de la persona usuaria (entidad del spec), expuesta por `useThemeMode()`
(`research.md` D2).

| Campo | Tipo | Regla |
|---|---|---|
| `mode` | `'claro' \| 'oscuro'` | Tema efectivamente aplicado ahora mismo. |
| `source` | `'explicita' \| 'sistema'` | `'explicita'` cuando la persona activó el control en este dispositivo; `'sistema'` cuando `mode` todavía sigue la preferencia del sistema operativo/navegador (D4). |
| almacenamiento | `localStorage`, clave `maily-backoffice:theme-mode` | Solo existe cuando `source = 'explicita'`. Valor distinto de `"claro"`/`"oscuro"` (corrupto o de una versión futura) se descarta: se trata como si no existiera (D3). |

**Transiciones**:

1. Arranque sin valor guardado → `source = 'sistema'`, `mode` = el que indique
   `matchMedia('(prefers-color-scheme: dark)')` en ese momento.
2. Arranque con valor guardado válido → `source = 'explicita'`, `mode` = el valor guardado.
3. La persona activa el control → `source = 'explicita'`, `mode` = el tema contrario al actual, se
   escribe en `localStorage`.
4. Mientras `source = 'sistema'`, si cambia la preferencia del sistema operativo (evento `change` de
   la media query) → `mode` se actualiza para seguirla; `source` sigue en `'sistema'`.
5. Una vez `source = 'explicita'`, un cambio de preferencia del sistema operativo **no** modifica
   `mode` (FR-006): la elección de la persona prevalece hasta que ella misma lo cambie de nuevo.

**Validación**: FR-006/FR-007 — una vez que existe una elección explícita en este dispositivo, solo
otra acción de la persona sobre el control puede cambiar `mode`.

## Set de valores (oscuro)

Segundo "Set de valores" que anticipó `specs/008-design-system/data-model.md` (regla de extensión
US5-1), ahora creado. Mismo campo y regla que el "Set de valores" de 008, para el nuevo conjunto:

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | `"web-soft-oscuro"` (no tiene equivalente real en web-soft: ver docs/DESIGN.md, "la Spec 4 parte de cero"). |
| `tokens` | `Record<tokenName, value>` | Un valor por cada nombre de token que ya define `colorTokens` (claro) — mismas claves, valores propios, ajustados a contraste WCAG AA sobre los fondos oscuros resultantes. |

**Validación**: todo color de estado (`exito`, `aviso`, `peligro`) y sus variantes (`-tinte`,
`-borde`, `-icono`) DEBE seguir siendo reconocible como el mismo estado en ambos sets (mismo matiz
aproximado, no un color distinto), además de cumplir WCAG AA en el set oscuro (Edge Case del spec).

## Tratamiento de contraste del logotipo

El contenedor fijo descrito en `research.md` D6, que envuelve `Logo` dentro de la barra superior.

| Campo | Tipo | Regla |
|---|---|---|
| `targetComponent` | string | `Logo`, tal como se usa hoy en `Topbar.tsx`. |
| `backgroundToken` | string | Nombre de token (de `colorTokens`/`colorTokensOscuro`) usado como fondo del contenedor; DEBE mantener contraste WCAG AA (3:1, criterio 1.4.11, igual que el borde de campos de 008) contra la imagen del logotipo en ambos sets. |
| `appliesInBothModes` | `true` | El tratamiento no se desactiva en ninguno de los dos temas (FR-004): corrige el defecto reportado hoy, en lo que spec.md llama "tema claro", además de cubrir el tema oscuro nuevo. |

## Relación con `specs/008-design-system`

- `colorTokens` (claro) no cambia de valores por esta feature; solo se le agrega un módulo hermano
  (`colorTokensOscuro`) con las mismas claves.
- El contenedor `data-testid="header-reserved-slot"` de `HeaderUserMenu` (Spec 5/7) no se toca ni se
  usa para el control de tema (ver `contracts/theme-mode.md`).
- `theme.test.ts` se extiende con las mismas aserciones de contraste que ya existen para `colorTokens`,
  ahora también contra `colorTokensOscuro` (research.md D1).
