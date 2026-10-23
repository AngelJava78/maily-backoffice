# Quickstart: validar Modo Oscuro y Claro del Backoffice

Guía para comprobar que el control de tema funciona de punta a punta y que corrigió el defecto de
fondo reportado. No repite contenido de `research.md`, `data-model.md` ni `contracts/`: solo enlaza
a ellos.

## Prerrequisitos

- Node.js 24 (`.nvmrc`) y `npm ci`.
- `.env.local` con las variables `VITE_*` de Auth0 y las APIs (ver `.env.example`); inicia sesión
  para ver la barra superior con el control de tema (`HeaderUserMenu`).
- Para probar el modo inicial según el sistema (`research.md` D4): poder cambiar la preferencia de
  apariencia del sistema operativo o del navegador antes de abrir la app (DevTools de Chrome/Edge
  permiten emular `prefers-color-scheme` sin tocar el sistema operativo).

## Levantar y probar

```sh
npm run dev   # http://localhost:5173
```

1. **Modo inicial por sistema** (D4): con el sistema en oscuro y sin haber usado antes el control en
   este navegador, el Backoffice abre en tema oscuro. Cambiar la preferencia del sistema con la app
   abierta y sin haber tocado el control: la app sigue el cambio en vivo.
2. **Control de tema** (FR-001/FR-002, `contracts/theme-mode.md`): activar el control en
   `HeaderUserMenu` y recorrer Panel, Usuarios, Suscripciones, Token y Perfil — todo el contenido,
   la barra superior y, en ancho móvil, la barra inferior, respetan el tema activo sin zonas del
   tema contrario.
3. **Persistencia** (FR-003, US3): elegir un tema, recargar la pestaña — la app abre directamente en
   el tema elegido, sin consultar más la preferencia del sistema.
4. **Logotipo** (FR-004, US2, `research.md` D6): comparar la barra superior en tema claro y oscuro;
   el logotipo se distingue con buen contraste en ambos, con el mismo archivo de imagen de hoy.
5. **Defecto de fondo corregido** (FR-008, `research.md` D5): con el sistema operativo en oscuro y
   el Backoffice en tema claro explícito, revisar un control nativo del navegador visible en la app
   (por ejemplo un campo de fecha, si existe, o el menú contextual/barra de desplazamiento del
   navegador): debe coincidir con el tema claro activo, no con el oscuro del sistema.

## Verificación automática

```sh
npm run typecheck
npm run lint
npm run format:check
npm test -- --coverage          # unit + componentes + axe, incluye theme.test.ts (D1) y
                                 # ThemeModeProvider (D2-D4)
npx playwright test             # E2E, e2e/responsive.spec.ts sin romper sus aserciones existentes
npm run build && npm run size   # presupuesto 300 KB gzip en la ruta de entrada
```

## Checklist de aceptación rápida

| Criterio | Cómo verificarlo |
|---|---|
| SC-001 (un solo gesto para cambiar de tema) | Activar el control una vez, ver el cambio completo |
| SC-002 (100 % de pantallas sin fondos mezclados) | Recorrer las pantallas del paso 2, en ambos temas |
| SC-003 (logotipo con contraste AA en ambos temas) | `theme.test.ts` (D1) + inspección visual del paso 4 |
| SC-004 (tema recordado entre visitas, mismo dispositivo) | Paso 3 |
| SC-005 (cambio percibido como inmediato, sin parpadeos) | Observar el paso 2 sin recarga de página |
| FR-006/FR-007 (elección explícita prevalece sobre el sistema) | Paso 1 seguido del paso 3: tras elegir, cambiar la preferencia del sistema no debe alterar el tema activo |
| FR-008 (fondo corregido) | Paso 5 |

## Si algo no tiene un valor de contraste claro para el set oscuro

No se inventa un valor al azar: se ajusta a partir del tono de marca más cercano del set claro
(`research.md` D1, D6) hasta cumplir WCAG AA, y se documenta en `data-model.md` → Set de valores
(oscuro) si el ajuste cambia la relación de matiz con el set claro.
