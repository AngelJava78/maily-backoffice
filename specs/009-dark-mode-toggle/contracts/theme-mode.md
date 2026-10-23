# Contrato: `useThemeMode()` y el control de la barra superior

Ver `../research.md` D1-D4, D7 y `../data-model.md` → Preferencia de Tema. Este contrato es el que
cualquier otra feature (incluidas las Specs 5 a 7) debe poder dar por cierto sin leer la
implementación de `ThemeModeProvider`.

## El hook

`useThemeMode()` (exportado junto a `ThemeModeProvider` desde `src/app/providers/ThemeModeProvider.tsx`)
devuelve:

| Campo | Tipo | Significado |
|---|---|---|
| `mode` | `'claro' \| 'oscuro'` | El tema aplicado ahora mismo a toda la aplicación. |
| `source` | `'explicita' \| 'sistema'` | Si `mode` viene de una elección de la persona en este dispositivo o de la preferencia del sistema. |
| `toggle` | `() => void` | Cambia `mode` al tema contrario y lo guarda como elección explícita (`source` pasa a `'explicita'`). |

Lanza un error si se usa fuera de `ThemeModeProvider` (mismo contrato que `useAppSettings` y
`useNotify`).

## Dónde vive el Provider

`ThemeModeProvider` envuelve `<ThemeProvider>` + `<CssBaseline enableColorScheme />` de MUI
internamente: ningún otro lugar de la aplicación debe volver a instanciar un `ThemeProvider` de MUI
por su cuenta. `AppProviders.tsx` lo monta en el mismo nivel donde hoy monta `ThemeProvider`/`theme`
(el más externo, para que hasta el `ErrorBoundary` global y sus fallbacks respeten el tema activo).

## El control en la interfaz

- Vive dentro de `HeaderUserMenu.tsx`, **antes** del contenedor
  `data-testid="header-reserved-slot"`. Ese contenedor sigue reservado, vacío, para el icono de
  perfil (Spec 5) y el selector de idioma (Spec 7) — ninguna Spec, incluida esta, debe insertar
  nada dentro de él.
- Es un control operable por teclado con nombre accesible propio (p. ej. "Cambiar a tema oscuro" /
  "Cambiar a tema claro", según el modo activo), igual que el resto de `HeaderUserMenu` (link
  "Perfil", botón "Cerrar sesión").
- Está presente y visible a cualquier ancho en el que `HeaderUserMenu` ya es visible hoy (1024 px y
  320 px, igual que el contrato de accesibilidad de `e2e/responsive.spec.ts`), porque
  `HeaderUserMenu` no se duplica para desktop/móvil.

## Reglas

1. Ningún componente de `src/features/**` instancia su propio tema, lee `colorTokens`/
   `colorTokensOscuro` directamente para decidir colores de fondo, ni importa `createAppTheme`: solo
   consume el tema activo a través de las props/sx de MUI (`theme.palette.*`), igual que hoy.
2. `toggle()` es la única forma permitida de cambiar `mode` desde la UI. Ningún componente escribe
   directamente en `localStorage` bajo la clave `maily-backoffice:theme-mode`.
3. El contenedor `header-reserved-slot` permanece vacío y sin tocar (prueba existente de
   `HeaderUserMenu.test.tsx`).

## Verificación

- `HeaderUserMenu.test.tsx` sigue pasando sin modificar su aserción sobre `header-reserved-slot`, y
  gana una aserción nueva: el control de tema existe, es operable por teclado, y alternar su estado
  cambia `useThemeMode().mode`.
- `e2e/responsive.spec.ts` (`expectHeaderShortcuts`) sigue pasando sin modificar sus aserciones
  existentes a 1024×768 y 320×640.
- Prueba nueva de `ThemeModeProvider`: arranca en `'sistema'` siguiendo `matchMedia`, una llamada a
  `toggle()` pasa a `'explicita'` y persiste tras remount: simular un remount reutilizando el mismo
  `localStorage` (no limpiarlo entre renders) y comprobar que `mode` sigue el valor guardado.
