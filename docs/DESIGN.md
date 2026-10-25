# Sistema de diseño del Backoffice

Este documento es el entregable de la feature `008-design-system`: cómo el Backoffice adopta el
sistema de diseño de MailySoft v2 (repo de referencia `web-soft`, solo lectura) para verse como un
mismo producto, retematizando MUI en vez de reemplazarlo. Ver `specs/008-design-system/` (spec,
plan, research, contracts) para el detalle y las decisiones completas; este documento resume lo
que alguien que va a tocar una pantalla necesita saber.

## Tokens

Viven en [`src/shared/theme/tokens.ts`](../src/shared/theme/tokens.ts) y se inyectan en
[`src/app/theme/theme.ts`](../src/app/theme/theme.ts). Los nombres son los de web-soft, en
español (excepción al principio I de la constitución, v1.4.0). **Ningún componente usa un valor
fijo de color, tipografía, espaciado, radio o sombra fuera de este archivo.**

### Color

| Token                                                        | Valor                                         | Papel                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `marca`                                                      | `#C9A227`                                     | Identidad (logo). Nunca texto, acción ni badge.                                                                |
| `marcaOscuro` / `marcaTinte` / `marcaBorde`                  | `#A8871F` / `#FBF3D9` / `#EBD9A0`             | Variantes de `marca`, mismo uso exclusivo.                                                                     |
| `accion`                                                     | `#1A3D63`                                     | Color primario de interacción (botones, links, foco). También usado para `info` (web-soft no distingue ambos). |
| `accionHover` / `accionTinte` / `accionBorde`                | `#0A1931` / `#EEF4FA` / `#B3CFE5`             | Hover, fondo tenue y borde de `accion`.                                                                        |
| `tinta`                                                      | `#0A1931`                                     | Texto más oscuro / marca de perfil.                                                                            |
| `cuerpo`                                                     | `#22303F`                                     | `text.primary`.                                                                                                |
| `suave`                                                      | `#4A5567`                                     | Color secundario (`secondary` y `text.secondary`).                                                             |
| `tenue`                                                      | `#5F6B7D`                                     | Texto terciario / iconos poco destacados.                                                                      |
| `fondo`                                                      | `#F6FAFD`                                     | `background.default` (fondo de página).                                                                        |
| `superficie`                                                 | `#FFFFFF`                                     | `background.paper` (tarjetas, diálogos).                                                                       |
| `superficieSutil`                                            | `#F1F6FB`                                     | Fondo de cabeceras de tabla y filas alternas.                                                                  |
| `borde`                                                      | `#E3EAF2`                                     | Separadores generales (`theme.palette.divider`). **No** para bordes de campo (ver abajo).                      |
| `bordeFuerte`                                                | `#4A7FA7`                                     | Borde de campos de formulario — sustituye a `borde` por WCAG AA (ver "Decisiones", más abajo).                 |
| `exito` / `exitoTinte` / `exitoBorde`                        | `#1F6E47` / `#E7F6EE` / `#B7E0C9`             | Éxito (`success`).                                                                                             |
| `aviso`                                                      | `#856404`                                     | Advertencia como texto/fondo de badge lleno (`warning`).                                                       |
| `avisoIcono`                                                 | `#B8860B`                                     | Advertencia **solo para iconos** (contraste 3:1, no 4,5:1).                                                    |
| `avisoTinte` / `avisoBorde`                                  | `#FEF6E0` / `#F0D48A`                         | Fondo tenue y borde de aviso.                                                                                  |
| `peligro` / `peligroHover` / `peligroTinte` / `peligroBorde` | `#B3261E` / `#8C1D18` / `#F9DEDC` / `#F1B9B4` | Peligro/error (`error`).                                                                                       |

Regla de web-soft que se conserva: **el color marca estado, nunca categoría** — no se usan estos
colores para distinguir tipos de dato arbitrarios, solo para comunicar éxito/aviso/peligro/acción.

### Tipografía, espaciado, radios, sombras, breakpoints

- **Tipografía**: Inter (400/500/600/700), autoalojada vía `@fontsource/inter`; fallback
  `system-ui, -apple-system, sans-serif`.
- **Espaciado**: escala de 4px (`spaceTokens`: 4/8/12/16/24/32/48). El multiplicador de
  `theme.spacing` de MUI **no se tocó** (sigue en 8) para no alterar el espaciado de toda la app
  existente de un solo cambio; `spaceTokens` es para usarlo explícitamente donde haga falta.
- **Radios**: `radiusTokens.xl` (12px) es `theme.shape.borderRadius` global; `2xl` (16px) y
  `full` disponibles para casos puntuales.
- **Sombras**: `shadowTokens.card` / `cardAlto`, valores literales de web-soft.
- **Breakpoints**: `breakpointTokens` (`sm`640/`md`768/`lg`1024/`xl`1280/`xxl`1536). Solo `md`
  (768px) está realmente en uso (el cambio Topbar/BottomNav); `theme.breakpoints` de MUI tampoco
  se tocó globalmente, por la misma razón que el espaciado.

## Componentes base

Todos viven en `src/shared/ui/`, salvo el theme mismo. "Retematizado" = mismo componente de MUI,
solo colores/tipografía/radios nuevos, sin cambiar su comportamiento.

| Componente                                                                                                                                              | Qué es                                                    | Retematizado o nuevo                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Botón, input, select, checkbox                                                                                                                          | MUI directo (`Button`, `TextField`, `Select`, `Checkbox`) | Retematizado (theme)                                                |
| [`Icon`](../src/shared/ui/Icon.tsx)                                                                                                                     | Componente común de iconos                                | Nuevo                                                               |
| [`Badge`](../src/shared/ui/Badge.tsx)                                                                                                                   | Estado en texto con color de refuerzo                     | Nuevo (reemplaza `StatusChip`/`SubscriptionStatusChip` propios)     |
| [`Avatar`](../src/shared/ui/Avatar.tsx)                                                                                                                 | Iniciales o foto                                          | Nuevo (infraestructura para Specs 5/6)                              |
| [`EmptyState`](../src/shared/ui/EmptyState.tsx)                                                                                                         | Nada que mostrar                                          | Nuevo                                                               |
| MUI X Data Grid                                                                                                                                         | Tabla con paginación de servidor                          | Retematizado (`dataGridStyles.ts`)                                  |
| [`ConfirmDialog`](../src/shared/ui/ConfirmDialog.tsx)                                                                                                   | Modal de confirmación                                     | Retematizado (sin cambios de código: ya hereda todo del theme)      |
| [`Notifications`](../src/shared/ui/Notifications.tsx)                                                                                                   | Toasts                                                    | Retematizado (`variant="standard"`, tinte en vez de relleno sólido) |
| [`ErrorState`](../src/shared/ui/ErrorState.tsx)                                                                                                         | Estado de error con "Reintentar"                          | Retematizado (sin cambios de código)                                |
| [`PageLoader`](../src/shared/ui/PageLoader.tsx)                                                                                                         | Estado de carga                                           | Retematizado (icono animado + texto, en vez de un spinner desnudo)  |
| [`Topbar`](../src/app/layouts/Topbar.tsx) / [`BottomNav`](../src/app/layouts/BottomNav.tsx) / [`HeaderUserMenu`](../src/app/layouts/HeaderUserMenu.tsx) | Layout                                                    | Nuevo (reemplaza el `AppBar` único)                                 |
| [`Logo`](../src/shared/ui/Logo.tsx)                                                                                                                     | Marca con fallback a texto                                | Nuevo                                                               |

### Props de referencia

- **`Icon`**: `{ name: IconName; size?: 'sm'|'md'|'lg'; color?: keyof typeof colorTokens; decorative?: boolean; accessibleName?: string }`. Si `decorative` no es `true`, `accessibleName` es obligatorio (error de compilación si falta).
- **`Badge`**: `{ tone: 'success'|'warning'|'danger'|'neutral'; label: string; icon?: IconName; variant?: 'filled'|'outlined' }`. Internamente sigue siendo un `Chip` de MUI.
- **`Avatar`**: `{ name: string; id: string; photoUrl?: string }`. Ver sección "Cómo lo resuelve web-soft" para el color determinístico.
- **`EmptyState`**: `{ icon?: IconName; message: string; action?: ReactNode }`.

## Iconos

Librería: [`lucide-react`](https://lucide.dev) (ISC), la misma que usa web-soft. Se usan **siempre**
a través de `Icon` + el registro [`iconRegistry.ts`](../src/shared/ui/iconRegistry.ts) — ningún
archivo de `src/features/**` importa `lucide-react` ni ningún icono directamente.

```tsx
<Icon name="delete" accessibleName="Eliminar" />      {/* informativo: anuncia su nombre */}
<Icon name="arrow-back" decorative />                 {/* decorativo: el texto del botón ya lo dice */}
```

**Para agregar un icono nuevo**: añadir una entrada a `iconRegistry.ts` (nombre en
inglés/kebab-case → componente de `lucide-react`), nunca un import inline en el componente que lo
usa.

### Estados de salud (feature 016)

Los estados de «Salud de servicios» y de sus secciones de respaldo se pintan con `Badge` (a través de
`StatusBadge`): texto, tono e icono propio, para que ningún estado dependa solo del color
(WCAG 1.4.1). «Detenida por horario» y «Desconocido» comparten tono pero no icono.

| Estado                                              | Texto                | Tono de `Badge` | Icono (registro → lucide)           |
| --------------------------------------------------- | -------------------- | --------------- | ----------------------------------- |
| `up` (y estado general `ok`, «Todo operativo»)      | Operativo            | `success`       | `status-up` → `CircleCheck`         |
| `degraded`                                          | Degradado            | `warning`       | `status-degraded` → `TriangleAlert` |
| `down` (y estado general, «Con componentes caídos») | Caído                | `danger`        | `status-down` → `CircleX`           |
| `stopped`                                           | Detenida por horario | `neutral`       | `status-stopped` → `Clock`          |
| `unknown` y cualquier otro                          | Desconocido          | `neutral`       | `status-unknown` → `CircleHelp`     |
| Comprobación directa: no responde                   | No responde          | `danger`        | `status-unreachable` → `Unplug`     |

La sección se registra en la navegación con `health` → `Activity`, y «Actualizar» usa `refresh` →
`RefreshCw`. Fuente: research D12 de [la 016](../specs/016-health-dashboard/research.md).

## Tabla de equivalencias

| Archivo/clase de web-soft                                          | Archivo del Backoffice                                                                            | Tipo       | Notas                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tailwind.config.js` + `src/index.css` (todos los tokens de color) | `src/shared/theme/tokens.ts` → `colorTokens`                                                      | token      | —                                                                                                                                                                                 |
| `tailwind.config.js` (`fontFamily.sans`, Inter)                    | `src/shared/theme/tokens.ts` → `typographyTokens`; `src/main.tsx` (import de `@fontsource/inter`) | token      | Autoalojada, no Google Fonts (research.md §5)                                                                                                                                     |
| `src/index.css` (escala de espaciado de Tailwind)                  | `src/shared/theme/tokens.ts` → `spaceTokens`                                                      | token      | Multiplicador de MUI sin tocar (research.md §6)                                                                                                                                   |
| `src/index.css` (`rounded-xl`/`rounded-2xl`)                       | `src/shared/theme/tokens.ts` → `radiusTokens`                                                     | token      | `xl` es `theme.shape.borderRadius` global                                                                                                                                         |
| `src/index.css` (`shadow-card`, `shadow-card-alto`)                | `src/shared/theme/tokens.ts` → `shadowTokens`                                                     | token      | —                                                                                                                                                                                 |
| Breakpoints de Tailwind (`md:768px`)                               | `src/shared/theme/tokens.ts` → `breakpointTokens`                                                 | token      | Solo `md` en uso real (Topbar/BottomNav)                                                                                                                                          |
| `colors.borde-fuerte`                                              | `colorTokens.bordeFuerte`, usado como borde de campo                                              | token      | Sustituye a `borde` por WCAG AA (FR-005 vs FR-019)                                                                                                                                |
| `lucide-react` (cada icono usado)                                  | `src/shared/ui/iconRegistry.ts`                                                                   | icono      | Add→Plus, DeleteOutlined→Trash2, ArrowBack→ArrowLeft, Edit→Pencil, ArrowDropDown→ChevronDown, Visibility→Eye, VisibilityOff→EyeOff, Block→Ban, LockOpen→Unlock, Restore→RotateCcw |
| `public/organos/*.svg`                                             | —                                                                                                 | icono      | Reservado, sin usar hoy (ninguna pantalla los necesita)                                                                                                                           |
| `public/marca/maily-horizontal.png`                                | `src/assets/brand/maily-horizontal.png`, vía `Logo`                                               | marca      | —                                                                                                                                                                                 |
| `public/marca/maily-isotipo.png`                                   | `src/assets/brand/maily-isotipo.png`, favicon (`index.html`)                                      | marca      | No existía ningún favicon antes                                                                                                                                                   |
| `public/marca/maily-vertical.png`                                  | `src/assets/brand/maily-vertical.png`                                                             | marca      | Copiado, sin uso todavía                                                                                                                                                          |
| `src/components/MarcaMaily.tsx` (fallback a texto)                 | `src/shared/ui/Logo.tsx`                                                                          | componente | Mismo comportamiento `onError`                                                                                                                                                    |
| `src/components/Topbar.tsx`                                        | `src/app/layouts/Topbar.tsx`                                                                      | componente | —                                                                                                                                                                                 |
| `src/components/BottomNav.tsx`                                     | `src/app/layouts/BottomNav.tsx`                                                                   | componente | Aria-label propio ("Navegación móvil") para que sea un landmark distinto del de `Topbar`                                                                                          |
| `.badge-*` (success/warning/danger/neutral)                        | `src/shared/ui/Badge.tsx`                                                                         | componente | Icono opcional (no obligatorio como en web-soft): no se inventó uno por estado sin referencia                                                                                     |
| Patrón de vacío ("texto centrado simple")                          | `src/shared/ui/EmptyState.tsx`                                                                    | componente | —                                                                                                                                                                                 |
| Patrón de carga (`Loader2` + texto)                                | `src/shared/ui/PageLoader.tsx`                                                                    | componente | —                                                                                                                                                                                 |
| Modal custom (sin `role="dialog"`, sin Escape, sin trampa de foco) | `src/shared/ui/ConfirmDialog.tsx` (MUI `Dialog`)                                                  | componente | El Backoffice conserva lo que MUI ya daba, superior a web-soft (research.md §13)                                                                                                  |
| Avatar con iniciales (color fijo, no determinístico)               | `src/shared/ui/Avatar.tsx`                                                                        | componente | Ver "Cómo lo resuelve web-soft" — el Backoffice sí lo resuelve determinísticamente                                                                                                |

Esta tabla cubre cada pieza migrada por esta feature; cualquier adición futura (iconos, tokens,
componentes) se agrega aquí en la misma fila de categoría.

## Guía corta para migrar una pantalla

Para quien mergee las Specs 1 y 2 (u otra pantalla futura) sobre esta base:

1. **No copies valores**. Si necesitas un color/tamaño/espacio, usa un token de
   `src/shared/theme/tokens.ts` o una prop del `theme` (`theme.palette.*`, `theme.spacing()`). Si
   lo que necesitas no está, consúltalo antes de inventarlo (no se adivinan valores de diseño).
2. **No importes iconos directo**. Usa `<Icon name="..." />`; si el icono no está en
   `iconRegistry.ts`, agrégalo ahí primero (nombre en inglés/kebab-case).
3. **Reutiliza los componentes base** antes de escribir uno propio: `Badge` para estados,
   `EmptyState` para "sin resultados", `ErrorState`/`PageLoader` para error/carga,
   `ConfirmDialog` para confirmaciones.
4. **Todo texto nuevo va a `src/shared/messages/es.ts`**, nunca como literal en el JSX (FR-020).
5. **No cambies rutas, lógica ni llamadas a la API** solo por estar migrando el diseño — eso es
   presentación, el comportamiento sigue igual (FR-017).
6. **Verifica antes de dar por terminada la pantalla**: `grep` de `#[0-9a-fA-F]{6}` y de
   `@mui/icons-material`/`lucide-react` fuera de `tokens.ts`/`iconRegistry.ts` en tu archivo debe
   no encontrar nada; `npm run lint`, `npx tsc -b` y las pruebas existentes de la pantalla siguen
   en verde.
7. Busca tu pieza en la "Tabla de equivalencias" de arriba para saber de qué archivo de web-soft
   sale y si ya hay un componente que la resuelve.

## Cómo lo resuelve web-soft (insumo para las Specs 4 a 7)

Analizado el 2026-10-21 contra `C:\Maily\code\Maily360\MailySoft\web-soft` (research.md).

- **Modo oscuro (Spec 4)**: web-soft **no lo tiene** — no hay `darkMode` en `tailwind.config.js`
  ni ninguna clase `dark:` en el código. La Spec 4 parte de cero; la estructura que esta feature
  deja lista es que ningún componente usa un valor fijo (`colorTokens` siempre), así que un
  segundo "Set de valores" (`data-model.md`) solo necesita otro módulo con los mismos nombres de
  token y valores oscuros — ningún componente base cambia.
- **Menú de perfil (Spec 5, icono de perfil)**: web-soft sí lo tiene, en
  `src/components/Topbar.tsx`: un dropdown con nombre + email + badge de role, "Mi perfil", "Mi
  Consultorio" (condicional), "Panel de Maily" (si aplica) y "Cerrar sesión" (en rojo, separado
  por un borde superior). El espacio para esto ya está reservado, vacío, a la derecha de
  [`HeaderUserMenu`](../src/app/layouts/HeaderUserMenu.tsx) (`data-testid="header-reserved-slot"`).
- **Avatar (Spec 5/6, fotografía de usuarios)**: web-soft muestra foto o iniciales, pero **sin
  color determinístico** — su único avatar con iniciales usa un color fijo (ámbar) igual para
  todos. El Backoffice sí lo resuelve: [`Avatar.tsx`](../src/shared/ui/Avatar.tsx) calcula un tono
  determinístico por `id` (hash simple, 4 combinaciones ya dentro del sistema de tokens:
  `accion`/`exito`/`aviso`/`peligro`), sin inventar ningún color nuevo. Las Specs 5 y 6 ya lo
  encuentran construido.
- **Selector de idioma (Spec 7, inglés/español)**: web-soft **no lo tiene** — no hay librería de
  i18n ni carpeta de locales. El espacio para el selector también está reservado en
  `HeaderUserMenu`, junto al del perfil. La estructura que esta feature deja lista: todo texto
  nuevo vive en `src/shared/messages/es.ts` (FR-020, verificado en T053), así que la Spec 7 solo
  necesita agregar el módulo de inglés con las mismas claves, no rastrear texto disperso.
