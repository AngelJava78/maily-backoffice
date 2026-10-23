# Research: Menú de Perfil con Avatar en el Encabezado

## D1: Cómo obtiene el avatar su `id` y su `name`

**Decision**: `Avatar` (`src/shared/ui/Avatar.tsx`, de specs/008-design-system) ya recibe
`{ name, id, photoUrl? }` y resuelve el criterio completo (iniciales sobre un tono determinístico
por `id`, FR-004 del spec) — no se modifica. Lo que falta es que `useOperatorIdentity()` exponga un
`id`: hoy devuelve `displayName`, `firstName`, `paternalLastName`, `maternalLastName`, `email`,
`initials` y `roles`, pero ningún identificador. `OperatorAccess.user` (de
`useGrantedAccess()`, que `useOperatorIdentity()` ya envuelve) es un `PlatformUser`
(`src/features/users/schemas/user.ts`), que sí tiene `id: string` (UUID, ya validado con Zod en la
capa `api`). Se agrega `id: identity.user.id` o equivalente a `OperatorIdentity`.

**Rationale**: `useOperatorIdentity()` es el único lugar que ya arma "quién es el operador para
mostrar en el encabezado" (lo usa `HeaderUserMenu` hoy) — agregar `id` ahí, en vez de leer
`useGrantedAccess()` por separado en `ProfileMenu`, mantiene un solo punto de verdad y no filtra
`PlatformUser` (snake_case/camelCase, detalles de la API) a los componentes (constitución II).

**Alternatives considered**: que `ProfileMenu` llame a `useGrantedAccess()` directamente — se
descarta porque duplicaría la transformación que `useOperatorIdentity()` ya hace, y porque
`ProfilePage.tsx` (que también necesita el `id` para FR-005) ya usa `useOperatorIdentity()`, no
`useGrantedAccess()`.

## D2: `initials` de `useOperatorIdentity()` queda sin usar — se quita, no se deja

**Decision**: `identity.initials` hoy solo lo consume `ProfilePage.tsx` (único resultado de buscarlo
en todo `src/`), pasándolo a un `<Avatar>` de MUI con un color fijo. Una vez que `ProfilePage.tsx`
pase a usar el `Avatar` compartido (D1, FR-005), que calcula sus propias iniciales internamente a
partir de `name`, `identity.initials` deja de tener consumidores. Se quita de `OperatorIdentity` en
vez de dejarlo sin usar.

**Rationale**: la constitución (Definición de terminado) exige "sin... código muerto"; dejar un
campo calculado que nadie lee no es neutro, es deuda. `features/users/schemas/user.ts` tiene su
propio `getInitials` (preexistente, usado en el listado/detalle de usuarios, fuera del alcance de
esta feature) — esa duplicación con la de `Avatar.tsx` ya existía desde 008 y no es parte de lo que
pide este spec; no se toca.

**Alternatives considered**: dejar `initials` por si una feature futura lo necesita — se descarta
(YAGNI, constitución principio I): nada lo pide hoy, y es trivial volver a agregarlo si hiciera
falta.

## D3: Patrón del menú — reutilizar el que ya existe, no inventar uno

**Decision**: `SubscriptionStatusMenu.tsx` (`src/features/subscriptions/components/`) ya resuelve,
con MUI `Menu`/`MenuItem`, exactamente el patrón de accesibilidad que este menú necesita: estado
`anchor` (`HTMLElement | null`), `aria-haspopup="menu"`, `aria-controls`/`aria-expanded` en el
botón disparador, `useId()` para los ids, `slotProps={{ list: { 'aria-labelledby': ... } }}` en el
`Menu`. `ProfileMenu` sigue el mismo esqueleto.

**Rationale**: consistencia (un solo patrón de menú en todo el Backoffice) y cero riesgo de
accesibilidad nuevo — el patrón ya está en producción y probado.

**Alternatives considered**: un `Popover` a medida — se descarta, `Menu` de MUI ya es la envoltura
correcta (rol `menu`/`menuitem` automático) y es lo que el resto de la app ya usa.

## D4: Contenido no interactivo dentro del `Menu`

**Decision**: el nombre, el correo y el/los role(s) (FR-002) se renderizan dentro del `Menu` como
contenido simple (no `MenuItem`, que implica una acción) — párrafos/Typography, igual que web-soft
resuelve su propio dropdown (docs/DESIGN.md: "nombre + email + badge de role"). Debajo, un
`Divider`, luego el `MenuItem` "Mi perfil" (enlace, `component={NavLink}` a `/profile`), otro
`Divider`, y el `MenuItem` "Cerrar sesión" con tono de color de peligro (`color: 'error.main'` o
equivalente), igual que web-soft lo distingue ("en rojo, separado por un borde superior").

**Rationale**: MUI permite contenido no interactivo dentro de un `Menu` (no todo tiene que ser
`MenuItem`); es el patrón que la propia referencia de diseño (web-soft) ya usa, y separa
visualmente "información" de "acciones", reforzando FR-002 (sin acciones de cambiar role/cuenta:
el bloque de información no tiene ningún control).

**Alternatives considered**: mostrar el/los role(s) como `Chip` en vez de texto — queda como
decisión de implementación visual (no afecta el contrato de accesibilidad ni los requisitos), se
deja a criterio de `/speckit-tasks`/implementación.

## D5: "Cerrar sesión" dentro del menú no reutiliza `<LogoutButton/>`

**Decision**: `LogoutButton` (`src/features/auth/components/LogoutButton.tsx`) sigue existiendo
igual, para sus otros dos usos (`AccessCheckFailedPage`, `AccessDeniedPage` — pantallas sin sesión
concedida, sin este menú). Dentro de `ProfileMenu`, la acción de cerrar sesión es un `MenuItem` que
llama a `useLogout()` directamente, no el componente `Button`.

**Rationale**: un `MenuItem` no es un `Button` (semántica y estilo distintos dentro de una lista de
menú); envolver `<LogoutButton/>` dentro de un `MenuItem` mezclaría dos componentes con su propio
estilo. Las dos pantallas que sí siguen usando `LogoutButton` tal cual no tienen este menú (no hay
sesión concedida ahí), así que no hay inconsistencia visible para la misma persona en la misma
pantalla.

**Alternatives considered**: generalizar `LogoutButton` para que también sirva como `MenuItem` (una
prop `as="menuitem"`) — se descarta, complejidad innecesaria (YAGNI) para dos usos que ya están
bien separados.

## D6: El espacio reservado original lo ocupa esta feature; se reserva uno nuevo para Spec 7

**Decision**: `data-testid="header-reserved-slot"` (vacío desde 008) estaba documentado para
"el icono de perfil (Spec 5) y el selector de idioma (Spec 7)" juntos (docs/DESIGN.md). Esta
feature (Spec 5) ocupa ese lugar con `<ProfileMenu/>`; `HeaderUserMenu.tsx` agrega un contenedor
vacío nuevo (mismo `data-testid`, o uno renombrado — ver `contracts/profile-menu.md`) para que
Spec 7 siga sin tener que tocar este archivo para insertarse.

**Rationale**: continúa el mismo patrón que 008 dejó para evitar que cada Spec nueva tenga que
modificar `HeaderUserMenu`/`Topbar` — simplemente ahora el slot que usaba Spec 5 se consume, y se
dejan listas las mismas garantías para Spec 7.

**Alternatives considered**: no reservar nada nuevo, que Spec 7 inserte su propio contenedor cuando
llegue — se descarta: rompería la garantía que 008 y 009 (que respetó el slot sin tocarlo) ya
establecieron para toda la serie de Specs 4-7.

## D7: El contrato de accesibilidad de 008 se reemplaza, no se ignora

**Decision**: `specs/008-design-system/contracts/layout.md` exige, "NO NEGOCIABLE sin tocar el
E2E", que "Perfil" (link) y "Cerrar sesión" (button) estén visibles dentro de `role="banner"` sin
abrir nada, en `e2e/responsive.spec.ts` (`expectHeaderShortcuts`) y en 6 puntos más de interacción
directa repartidos en `access.spec.ts` (×3), `session.spec.ts` (×1) y `token.spec.ts` (×1). Esta
feature los reemplaza deliberadamente: el botón de avatar (con nombre accesible, FR-007) es lo que
debe quedar visible sin abrir nada; "Mi perfil" y "Cerrar sesión" quedan dentro del menú, visibles
recién tras abrirlo. Se centralizan esas dos acciones en `e2e/fixtures/profileMenu.ts`
(`openProfileMenu`, `goToProfile`, `logOut`), y los 7 puntos existentes migran a usarlas, siguiendo
el mismo patrón ya establecido para el inicio de sesión (`e2e/fixtures/signIn.ts`,
010-skip-reauth-consent).

**Rationale**: es exactamente el cambio que el spec pide (consolidar en un menú, como muestran las
4 capturas de referencia); "NO NEGOCIABLE sin tocar el E2E" en 008 significa "no lo cambies sin
querer", no "nunca lo cambies" — y aquí se cambia a propósito, con un reemplazo documentado
(`contracts/profile-menu.md`) en vez de romperlo en silencio.

**Alternatives considered**: ver Complexity Tracking del plan (agregar el avatar sin consolidar
el menú) — descartada por no cumplir el pedido del spec.

## D8: "Cambiar foto" no necesita una pantalla ni un flujo nuevo

**Decision**: la acción "Cambiar foto" (FR-006) en `ProfilePage.tsx` llama a `useNotify()`
(`src/shared/ui/Notifications.tsx`, ya usado en toda la app para avisos) con severidad `info` y un
mensaje que explica que todavía no está disponible — no abre un diálogo, no navega a ningún lado,
no llama a ninguna API.

**Rationale**: es el mecanismo ya establecido para avisar algo a la persona sin necesitar una
pantalla nueva; evita construir un flujo completo (selector de archivo, previsualización, etc.)
para una acción que hoy no puede completarse de verdad (la plataforma de usuarios no lo admite,
spec.md Clarifications) — exactamente lo que FR-006 pide: que exista la opción, sin simular un
resultado que no ocurre.

**Alternatives considered**: deshabilitar el botón con un tooltip — se descarta, spec.md
Clarifications decidió explícitamente "mostrar la opción y explicar al activarla", no
deshabilitarla preventivamente (que es menos descubrible y no deja claro el motivo hasta que
alguien repare en un tooltip).
