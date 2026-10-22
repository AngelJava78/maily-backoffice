# Contrato: Layout (Topbar / BottomNav / espacio reservado)

Ver `../research.md` §9 y el edge case de 320 px del spec. Este contrato es el que las Specs 1, 2,
5 y 7 deben poder dar por cierto sin leer el código del layout.

## Estructura

- `AppLayout.tsx` compone: `Topbar` (siempre montado) + `BottomNav` (siempre montado, se oculta
  por CSS bajo 768 px vía `display`, igual que web-soft) + `<Outlet />` dentro de `<Container component="main" id="main-content">`.
- `Topbar.tsx`: visible ≥768 px. Contiene, en este orden: logo (`Logo` de §8 de research.md) +
  etiqueta «Backoffice» (estilo píldora, clarify) → navegación (icono + etiqueta, desde
  `getVisibleSections`, sin cambios de lógica) → `HeaderUserMenu`.
- `BottomNav.tsx`: visible <768 px. Mismos items de navegación que `Topbar`, formato de barra
  inferior.
- `HeaderUserMenu.tsx`: nombre de la persona, link "Perfil", botón "Cerrar sesión" (contenido
  exacto que ya existe hoy), más un contenedor vacío a la derecha reservado para:
  - el icono de perfil (Spec 5);
  - el selector de idioma (Spec 7).

## Contrato de accesibilidad — NO NEGOCIABLE sin tocar el E2E

`e2e/responsive.spec.ts` (función `expectHeaderShortcuts`, invocada en casi todos los specs del
archivo, a 1024×768 y a 320×640) exige:

1. Un elemento con **`role="banner"`** en el DOM (hoy `<AppBar component="header">`; `Topbar`
   DEBE seguir siendo o contener ese `<header>`).
2. Dentro de ese `banner`: un **link** con nombre accesible `messages.nav.profile` ("Perfil").
3. Dentro de ese `banner`: un **button** con nombre accesible `messages.common.logout`
   ("Cerrar sesión").
4. Ambos **visibles** (no solo presentes en el DOM) a 1024×768 y a 320×640.

Esto se cumple tanto si `HeaderUserMenu` vive dentro de `Topbar` (desktop) como si, a 320 px, el
diseño de web-soft normalmente los pondría en un menú de persona dentro de `BottomNav` o en un
`Topbar` que sigue montado y visible en una franja superior incluso en móvil — **la decisión de
dónde exactamente viven "Perfil" y "Cerrar sesión" a 320 px es de implementación** (tasks.md), con
esta única restricción dura: deben quedar dentro de un `role="banner"` y visibles, sin ocultarse
detrás de un menú colapsado que el test no abre.

Además, ningún modal (`role="dialog"`) DEBE exceder el ancho de la ventana en 320 px (prueba
existente del mismo archivo).

## Reglas

1. El layout general (sidebar/header/contenido) y el comportamiento responsive son los de
   web-soft (breakpoint 768 px), no un sidebar (clarify).
2. El espacio reservado a la derecha (perfil Spec 5, idioma Spec 7) existe desde esta feature,
   vacío, para que esas Specs no tengan que tocar `Topbar`/`BottomNav` para insertarse.
3. Ancho mínimo soportado: 320 px, sin scroll horizontal (ya exigido por la feature 001).

## Verificación

- `e2e/responsive.spec.ts` pasa sin modificar sus aserciones.
- Prueba de que el contenedor reservado a la derecha existe en el DOM (aunque esté vacío) a
  ≥768 px y <768 px.
