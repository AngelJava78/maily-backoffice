# Contrato: Menú de perfil en el encabezado

Sustituye, a propósito, la sección "Contrato de accesibilidad — NO NEGOCIABLE sin tocar el E2E" de
`specs/008-design-system/contracts/layout.md` (research.md D7). Este contrato es el que Spec 7 (el
selector de idioma) debe poder dar por cierto sin leer el código del menú, igual que el de 008 lo
fue para esta feature.

## Qué sigue igual del contrato de 008

- Un elemento con **`role="banner"`** en el DOM (el `<header>`/`AppBar` de `Topbar`).
- Ancho mínimo soportado: 320 px, sin scroll horizontal.
- `e2e/responsive.spec.ts` (`expectHeaderShortcuts`, a 1024×768 y 320×640) lo sigue comprobando —
  cambia qué comprueba exactamente (ver abajo), no que lo siga comprobando.

## Qué cambia (deliberado, research.md D7)

1. Dentro de ese `banner`, el control siempre visible y accesible sin abrir nada ya **no** es un
   link "Perfil" ni un botón "Cerrar sesión" sueltos: es el **botón del avatar** (`ProfileMenu`),
   con nombre accesible propio, `aria-haspopup="menu"`, operable por teclado (FR-007 del spec).
2. "Mi perfil" (ahora un `MenuItem` enlace) y "Cerrar sesión" (ahora un `MenuItem`) quedan dentro
   del menú que ese botón abre — visibles recién después de abrirlo, no antes.
3. Toda interacción de prueba con "Perfil"/"Cerrar sesión" DEBE pasar por
   `e2e/fixtures/profileMenu.ts` (`openProfileMenu`, `goToProfile`, `logOut`), nunca por una
   consulta directa de rol/nombre accesible esperando que ya estén visibles.

## Estructura del menú

- Botón disparador: el avatar (`Avatar`, `src/shared/ui/Avatar.tsx`), con nombre accesible (p. ej.
  "Abrir menú de perfil de {displayName}" — texto exacto a definir en `messages/es.ts`).
- Contenido, en este orden: nombre + correo + role(s) activos (texto, no interactivo) → divisor →
  "Mi perfil" (`MenuItem`, enlace a `/profile`) → divisor → "Cerrar sesión" (`MenuItem`, tono de
  peligro).
- Ninguna otra acción: ni cambiar de role activo, ni cambiar de cuenta/usuario (FR-002, SC-003).

## Espacio reservado para Spec 7

El contenedor `data-testid="header-reserved-slot"` que 008 dejó vacío para "el icono de perfil
(Spec 5) y el selector de idioma (Spec 7)" lo ocupa ahora `ProfileMenu` (Spec 5). `HeaderUserMenu`
agrega un contenedor vacío nuevo, junto a `ProfileMenu`, para que Spec 7 siga sin tener que tocar
`HeaderUserMenu`/`Topbar` para insertarse (research.md D6) — mismo contrato que 008 ya daba, ahora
con el dueño del primer slot resuelto.

## Verificación

- `e2e/responsive.spec.ts` (`expectHeaderShortcuts`, actualizada): el botón de avatar visible en
  `role="banner"` a 1024×768 y 320×640; "Mi perfil" y "Cerrar sesión" visibles solo después de
  `openProfileMenu(page)`.
- Los puntos de interacción directa existentes que de verdad pasaban por el `ProfileMenu` del
  encabezado (`access.spec.ts`: la "V10" de la cuenta autorizada; `session.spec.ts` ×1;
  `token.spec.ts` ×1; `responsive.spec.ts` ×1) usan `goToProfile(page)`/`logOut(page)` de
  `e2e/fixtures/profileMenu.ts` en vez de `page.getByRole('link'|'button', { name: ... })` directo.
  La otra "V10" de `access.spec.ts` (cerrar sesión **desde** "Sin acceso") no pasa por aquí: ese
  botón es el `<LogoutButton/>` standalone de `AccessDeniedPage`, sin `banner` ni `ProfileMenu` de
  por medio — sigue siendo una consulta directa, a propósito.
- Prueba de que el nuevo contenedor reservado (Spec 7) existe en el DOM, vacío, a ≥768 px y
  <768 px — mismo patrón que `HeaderUserMenu.test.tsx` ya prueba para el slot de 008.
- `ProfileMenu.test.tsx`: abrir con teclado y con clic: Escape lo cierra; el foco vuelve al botón
  disparador al cerrar (mismo patrón que `SubscriptionStatusMenu`); `axe` sin violaciones en ambos
  estados (cerrado/abierto).
