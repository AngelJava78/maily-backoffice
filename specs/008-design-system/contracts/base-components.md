# Contrato: Componentes base

Props y comportamiento garantizado de cada componente base (FR-009 a FR-012). Ver
`../data-model.md` (entidad "Componente base") y `../research.md` §10-§13.

## Controles (FR-009) — MUI retematizado, sin wrapper propio

`Button`, `TextField` (input), `Select`, `Checkbox` de `@mui/material` se usan directamente,
igual que hoy, consumiendo el `theme` nuevo (colores, radios, tipografía de `tokens.ts`). **No se
crea un wrapper propio** — el contrato es el `theme.ts` actualizado, no un nuevo componente.

- Estado `error` de `TextField`/`Select`: borde `colorTokens.peligro`.
- Borde por defecto (no error, no foco) de `TextField`/`Select`: `colorTokens.bordeFuerte`
  (reemplaza el `FIELD_BORDER_COLOR` propio actual).
- `Checkbox`: `accent-color`/color de check = `colorTokens.accion` (research.md §12).
- Foco visible en todos los controles (herencia de MUI; no se quita ningún `outline`).

## Datos (FR-010)

### `Badge` (nuevo, `src/shared/ui/Badge.tsx`)

```ts
type BadgeProps = {
  tone: 'success' | 'warning' | 'danger' | 'neutral'; // se amplía cuando otro caso lo necesite (YAGNI)
  label: string;
  icon?: IconName; // opcional: el texto ya transmite el estado sin el color (WCAG 1.4.1); se usa
                    // cuando haya un icono de referencia claro, no se inventa uno por estado
  variant?: 'filled' | 'outlined'; // 'filled' por defecto
};
```

Reemplaza `StatusChip.tsx` (users) y `SubscriptionStatusChip.tsx` (subscriptions): ambos pasan a
usarlo en vez de su propia implementación sobre `Chip`. **Internamente sigue renderizando
`Chip` de MUI** con el mismo `color`/`variant` (`tone` se traduce 1:1: success→success,
warning→warning, danger→error, neutral→default), para no romper
`SubscriptionStatusChip.test.tsx`, que verifica `.MuiChip-colorSuccess`/`.MuiChip-colorWarning`/
`.MuiChip-colorDefault`/`.MuiChip-filled`/`.MuiChip-outlined` literalmente (research.md §14).

### `Avatar` (nuevo, `src/shared/ui/Avatar.tsx`)

```ts
type AvatarProps = { name: string; id: string; photoUrl?: string };
```

Con `photoUrl`, muestra la foto (igual que web-soft). Sin ella, iniciales de `getInitials(name)`
sobre el color de `getAvatarColor(id)` (research.md §11 — 4 combinaciones fijas dentro de los
tokens semánticos, determinístico por `id`).

### Tabla (MUI X Data Grid retematizado, sin wrapper propio)

Columnas de header: `colorTokens.superficieSutil` de fondo. Fila: hover
`colorTokens.accionTinte`, separador `colorTokens.borde`. Paginación: controles existentes del
Data Grid, misma lógica (`page`/`page_size` del servidor), solo recoloreados — web-soft no tiene
un componente de tabla ni de paginación que copiar estructuralmente (research.md §10).

### `Card` (nuevo, envoltorio simple)

`sx={{ bgcolor: colorTokens.superficie, borderRadius: radiusTokens['2xl'], border: '1px solid ' + colorTokens.borde, boxShadow: shadowTokens.card }}`
sobre un `Box`/`Paper` de MUI — no es un componente con lógica propia, solo estilos empaquetados.

## Mensajes (FR-011) — retematizados, sin cambiar de librería

- `ConfirmDialog.tsx`: sigue sobre `Dialog` de MUI. **Conserva** Escape, trampa de foco y
  devolución de foco al cerrar (MUI ya lo da; web-soft no lo tiene — research.md §13). Nombra el
  recurso afectado, como hoy.
- `Notifications.tsx` (toasts): sigue sobre `Snackbar` + `Alert` de MUI. Aspecto recoloreado para
  verse como las alertas de web-soft (`tone` = success/warning/danger/info sobre los tokens
  `exito`/`aviso`/`peligro`/`accion`). Web-soft no tiene toasts; esta función se conserva con su
  aspecto de alerta (edge case del spec, FR-017).

## Estados (FR-012) — retematizados

- `PageLoader.tsx` (carga): icono `Loader2` (vía `Icon`) animado + texto, igual que el patrón de
  web-soft.
- `EmptyState.tsx` (nuevo, `src/shared/ui/EmptyState.tsx`): `{ icon?: IconName; message: string; action?: ReactNode }`. El icono es opcional: web-soft dibuja los vacíos como "texto centrado simple", sin icono (a diferencia de la carga, que sí lo lleva) — no se inventa uno. Migra el `NoRowsOverlay` ya existente de `UsersGrid.tsx`/`SubscriptionsGrid.tsx` (mensaje + `emptyAction` opcional); el resto de vacíos inline (p. ej. `dashboard.recentClinics.empty`) puede quedarse como texto simple si ya es equivalente.
- `ErrorState.tsx` (error): conserva su acción "Reintentar" existente (función que web-soft no
  tiene pero que el Backoffice sí necesita, edge case FR-017), recoloreado.

## Verificación

- Pruebas de componentes existentes de `StatusChip`/`SubscriptionStatusChip`/`RolesField`/
  `UserCreatePage` que buscan `.MuiChip-label` siguen pasando sin modificarse (research.md §14).
- Pruebas existentes de `DeleteSubscriptionAction`/`SubscriptionEditPage`/`SubscriptionStatusMenu`
  que buscan `.MuiAlert-root` siguen pasando sin modificarse.
- Nueva prueba unitaria de `getInitials`/`getAvatarColor` (lógica pura).
- `axe` sobre una pantalla que use `Badge`, `Avatar`, `ConfirmDialog` y `Notifications` no reporta
  violaciones.
