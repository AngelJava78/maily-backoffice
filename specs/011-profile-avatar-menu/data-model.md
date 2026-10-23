# Data Model: Menú de Perfil con Avatar en el Encabezado

No hay estado de servidor ni persistencia nueva (Technical Context: Storage = N/A). Lo que cambia
es la forma de un modelo de cliente ya existente (`OperatorIdentity`) y cómo se consume un
componente que ya existía (`Avatar`, de specs/008-design-system) — no se crea ninguna entidad de
dominio nueva.

## OperatorIdentity (extendido)

Lo que el encabezado y "Mi perfil" ya saben del operador (`src/features/auth/hooks/
useOperatorIdentity.ts`), con un campo nuevo y uno retirado.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` (UUID) | **Nuevo.** El `id` del `PlatformUser` (`src/features/users/schemas/user.ts`), vía `useGrantedAccess().user.id`. Lo necesita `Avatar` para calcular el tono de color determinístico (FR-004). |
| `displayName` | `string` | Sin cambios. |
| `firstName`, `paternalLastName`, `maternalLastName` | `string` / `string \| null` | Sin cambios. |
| `email` | `string` | Sin cambios — es lo que FR-002 exige mostrar en el menú. |
| ~~`initials`~~ | — | **Retirado.** Sin consumidores una vez que `ProfilePage.tsx` usa `Avatar` (que calcula sus propias iniciales desde `name` — research.md D2). |
| `roles` | `readonly AccessRole[]` | Sin cambios — FR-002 exige mostrar todas las activas, igual que ya hace "Mi perfil" hoy. |

**Validación**: `id` DEBE ser el mismo valor en toda la sesión de la persona (no recalculado por
pantalla) — ya lo garantiza que salga de la misma query de TanStack Query que usa el resto de
`useGrantedAccess()` (constitución III).

## Avatar (sin cambios, ahora con dos consumidores)

Ya definido y construido en specs/008-design-system (`src/shared/ui/Avatar.tsx`); esta feature no
le agrega ni le quita campos, solo lo usa por primera vez en dos lugares (encabezado y "Mi
perfil"), cumpliendo la regla que docs/DESIGN.md ya anticipaba ("Las Specs 5 y 6 ya lo encuentran
construido").

| Campo | Tipo | Regla |
|---|---|---|
| `name` | `string` | `identity.displayName`, en ambos consumidores. |
| `id` | `string` | `identity.id` (nuevo campo de arriba), en ambos consumidores. |
| `photoUrl` | `string \| undefined` | Ninguno de los dos consumidores lo pasa hoy — la plataforma de usuarios no entrega fotografía (spec.md); queda `undefined`, así que `Avatar` siempre resuelve a iniciales + color (FR-004). |

**Validación**: FR-005 — el mismo `id`/`name` (y por lo tanto el mismo resultado visual) DEBE
producir el mismo avatar en el encabezado y en "Mi perfil"; al ser el mismo componente con los
mismos props, se cumple por construcción, no por una comprobación aparte.

## Estado del menú (solo UI, no es un modelo de datos)

`ProfileMenu` mantiene localmente si está abierto o cerrado (`anchor: HTMLElement | null`, mismo
patrón que `SubscriptionStatusMenu`, research.md D3) — estado de UI local por defecto
(constitución III), no se eleva ni se comparte: ninguna otra pantalla necesita saber si el menú del
encabezado está abierto.
