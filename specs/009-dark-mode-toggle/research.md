# Research: Modo Oscuro y Claro del Backoffice

Decisiones técnicas para resolver el Technical Context del plan. No quedan `NEEDS CLARIFICATION`
pendientes: la única pregunta de alcance crítico (dónde se guarda la preferencia) ya se resolvió en
`spec.md` → Clarifications.

## D1: Cómo se construye el tema oscuro

**Decision**: El segundo "Set de valores" que anticipó `specs/008-design-system/data-model.md`
(regla de extensión US5-1) se crea como `colorTokensOscuro`, un objeto en
`src/shared/theme/tokens.ts` con exactamente los mismos nombres de clave que `colorTokens`
(`fondo`, `superficie`, `accion`, `cuerpo`, `exito`, `aviso`, `peligro`, …) y valores distintos,
ajustados para contraste WCAG AA sobre fondos oscuros. `theme.ts` deja de exportar un `theme`
estático y pasa a exportar `createAppTheme(mode: 'claro' | 'oscuro')`, que arma el `palette` de MUI
a partir de `colorTokens` o `colorTokensOscuro` según el modo — el resto de la configuración
(tipografía, forma, overrides de componentes) no cambia entre modos.

**Rationale**: Ningún componente de la aplicación referencia un valor de color fijo (ya lo exige
FR-006 de 008-design-system): todos pasan por los nombres de `colorTokens`. Swapear el objeto de
valores que alimenta `createTheme` no requiere tocar un solo componente, tal como lo anticipó y
verificó 008 (`theme.test.ts` ya prueba contraste contra `theme.palette`, no contra valores
literales).

**Alternatives considered**: Dejar que MUI derive el modo oscuro automáticamente
(`palette.mode: 'dark'` sin tokens propios, usando los algoritmos de contraste de Material). Se
descarta: generaría colores sin relación con la identidad de marca de MailySoft (`marca`, `accion`)
y no pasaría por la capa de tokens que exige el sistema de diseño adoptado en 008.

## D2: Dónde vive el estado del modo activo

**Decision**: Un nuevo `ThemeModeProvider` en `src/app/providers/ThemeModeProvider.tsx`, con un
hook público `useThemeMode()` que expone `{ mode, source, setMode }` (`source` indica si el modo
activo viene de una elección explícita o de la preferencia del sistema). Sigue el mismo patrón que
`AppSettingsProvider.tsx` y `NotificationsProvider` (contexto + hook que lanza si se usa fuera del
Provider). `ThemeModeProvider` arma el tema con `createAppTheme(mode)` (D1) y renderiza internamente
`<ThemeProvider>` + `<CssBaseline enableColorScheme />` de MUI, reemplazando el uso directo de
`theme` estático en `AppProviders.tsx`.

**Rationale**: La constitución (Principio III) nombra "tema" explícitamente como el ejemplo de
preocupación transversal de cambio poco frecuente que amerita Context, en vez de estado elevado o
un store global.

**Alternatives considered**: Zustand u otro store global — exigiría justificar en Complexity
Tracking una dependencia estructural nueva sin necesidad demostrada (YAGNI, principio I). Prop
drilling del modo a través de cada pantalla — impracticable con decenas de componentes que leen el
tema vía el `theme` de MUI.

## D3: Persistencia de la preferencia

**Decision**: `localStorage`, una sola clave (`maily-backoffice:theme-mode`), solo con los valores
`"claro"` u `"oscuro"`. Se lee una vez al inicializar el estado (inicializador perezoso de
`useState`) y se escribe en cada cambio explícito. Un valor leído que no sea exactamente uno de los
dos esperados (almacenamiento corrupto o de una versión futura) se descarta y se trata como "sin
elección explícita" (cae a D4), sin romper el arranque.

**Rationale**: Resuelve la Clarification de `spec.md` (solo en el dispositivo, sin backend). El
Principio V de la constitución permite expresamente guardar en el navegador "preferencias de UI no
sensibles". El valor leído de `localStorage` cruza una frontera (Principio II): por eso se valida
contra el conjunto cerrado de valores esperados antes de usarse, en vez de asumirlo válido.

**Alternatives considered**: Sincronizar con la cuenta vía la API de usuarios — descartado por la
Clarification (fuera de alcance: exigiría un endpoint nuevo que spec.md no pide).

## D4: Modo inicial antes de una elección explícita

**Decision**: `window.matchMedia('(prefers-color-scheme: dark)')`. Mientras no haya una elección
explícita guardada (D3), el modo activo sigue los cambios en vivo de esa media query (listener
`change`) — si la persona cambia la preferencia de su sistema operativo con el Backoffice abierto,
la interfaz seguida. En cuanto hay una elección explícita, el listener dejar de decidir el modo (se
mantiene solo para detectar un futuro cambio de preferencia de sistema, sin aplicarlo).

**Rationale**: Resuelve FR-006/FR-007 y el edge case de spec.md sobre un cambio de preferencia del
sistema operativo. Es el comportamiento estándar de la plataforma web para "seguir el sistema hasta
que la persona decida".

**Alternatives considered**: Siempre arrancar en claro — rechazado porque es la causa más probable
del defecto de fondo reportado (ver D5): con el sistema en oscuro y la app ignorándolo, los
controles nativos del navegador ya se renderizaban oscuros mientras el resto de la UI seguía clara.

## D5: El defecto de fondo reportado ("el fondo quedó mal")

**Decision**: `CssBaseline` de MUI se usa con la prop `enableColorScheme`, que fija la propiedad CSS
`color-scheme` de la página según el modo activo. Sin ella, el navegador no sabe qué apariencia
soporta la página y, si el sistema operativo prefiere oscuro, renderiza con sus valores por defecto
oscuros los elementos que la aplicación no estila (barra de desplazamiento, controles nativos de
formulario, selector de fecha) — mezclándose con el resto de la UI, que hoy queda fija en claro.

**Rationale**: Es la explicación más simple y verificable de FR-008 (el defecto de fondo existe hoy,
antes de que exista modo oscuro como feature): `index.html` no declara ningún `color-scheme`
soportado y `AppProviders.tsx` usa `<CssBaseline />` sin esa prop. Corregirlo no depende de que la
persona elija el tema oscuro: ya mejora el tema claro actual.

**Alternatives considered**: Un `<meta name="color-scheme">` estático en `index.html` — descartado
porque no puede reaccionar al cambio de modo en tiempo de ejecución (D2); `enableColorScheme` sí,
porque se recalcula con cada render de `ThemeModeProvider`.

## D6: Legibilidad del logotipo en ambos temas

**Decision**: El componente `Logo` (`src/shared/ui/Logo.tsx`) se envuelve en un contenedor con un
tratamiento de contraste fijo (un fondo claro tipo "chip", igual de ancho que el logotipo, con el
radio de borde de los tokens existentes) detrás de la imagen actual (`maily-horizontal.png`), activo
en ambos temas — no solo en el oscuro. El mismo archivo de imagen se reutiliza sin cambios (resuelto
en la Clarification de spec.md).

**Rationale**: La barra superior (`Topbar`, `AppBar` sin `color` explícito) ya usa hoy el color de
marca (`accion`, azul marino) como fondo en el único tema que existe actualmente — el defecto de
contraste de la captura compartida ocurre hoy, en lo que spec.md llama "tema claro". El tratamiento
de contraste no puede depender de qué tema esté activo porque el fondo de la barra superior puede
seguir usando el mismo tono de marca en ambos temas (research, no decisión de diseño final del color
de marca — ver `data-model.md`).

**Alternatives considered**: Un logotipo alternativo (versión clara del wordmark) — descartado por
la Clarification (reutilizar el archivo actual). Invertir/recolorear el logotipo con un filtro CSS —
descartado: el logotipo tiene varios colores (parte del isotipo es a color, ver captura), invertirlo
alteraría la marca en vez de solo mejorar el contraste.

## D7: Dónde vive el control de alternar tema

**Decision**: Un nuevo botón en `HeaderUserMenu.tsx`, agregado **antes** del contenedor
`data-testid="header-reserved-slot"` (que sigue reservado, vacío, para el icono de perfil — Spec 5 —
y el selector de idioma — Spec 7 — sin tocarse: `HeaderUserMenu.test.tsx` ya exige que ese
contenedor quede vacío).

**Rationale**: `contracts/layout.md` de 008-design-system no reservó espacio para el modo oscuro
(solo para Specs 5 y 7); `Topbar`/`HeaderUserMenu` están siempre montados y visibles a cualquier
ancho (contrato de accesibilidad del E2E existente: banner con "Perfil" y "Cerrar sesión" visibles a
1024 y 320 px), así que agregar el control ahí cumple FR-001 ("disponible en cualquier pantalla") sin
inventar un segundo lugar para anchos de móvil.

**Alternatives considered**: Un ítem dentro de `BottomNav` — descartado: `BottomNav` solo repite la
navegación entre secciones (research.md §9 de 008), no acciones de cuenta/preferencias, que ya viven
en `HeaderUserMenu`.

## D8: Icono del control

**Decision**: Dos íconos nuevos en `src/shared/ui/iconRegistry.ts` (`Sun` y `Moon` de
`lucide-react`, ya instalado), consumidos solo a través del componente común `Icon` — ningún archivo
fuera de `iconRegistry.ts` importa `lucide-react` directo (FR-007/FR-008 de 008-design-system, que
sigue vigente).

**Rationale**: No agrega dependencias nuevas; mantiene la regla de un único punto de importación de
iconos que ya exige la constitución vía 008-design-system.

**Alternatives considered**: Un `Switch` de MUI sin ícono — se descarta como decisión de plan porque
es un detalle de UI del control, no un requisito del spec; se deja como opción de implementación
documentada aquí para que `/speckit-tasks` no tenga que volver a investigarlo, pero no es una
decisión bloqueante (ambas opciones cumplen FR-001 igual).

## Resumen para Constitution Check

Ninguna decisión agrega una dependencia nueva, un backend, un store global ni una ruta nueva. La
única superficie que toca la constitución (nombres de tokens en español) ya está cubierta por la
excepción del Principio I introducida en v1.4.0, aplicada a `colorTokensOscuro` porque reutiliza
exactamente los mismos nombres que `colorTokens` (replican el mismo sistema de nombres de
referencia que adoptó 008-design-system), no porque web-soft tenga ya un modo oscuro que copiar —
ver nota en `plan.md` → Constitution Check.
