# Quickstart: validar el Menú de Perfil con Avatar

Guía para comprobar que el nuevo menú funciona de punta a punta y que nada de lo que dependía de
"Perfil"/"Cerrar sesión" sueltos en el encabezado quedó roto. No repite contenido de `research.md`,
`data-model.md` ni `contracts/`: solo enlaza a ellos.

## Prerrequisitos

- Node.js 24 (`.nvmrc`) y `npm ci`.
- `.env.local` con las variables `VITE_*` de Auth0 y las APIs; inicia sesión para ver el encabezado.
- Para el recorrido E2E completo (ver más abajo): `E2E_AUTH0_USER_A1`/`E2E_AUTH0_PASSWORD_A1`.

## Levantar y probar manualmente

```sh
npm run dev   # http://localhost:5173
```

1. **El menú** (FR-001, US1): en cualquier pantalla, el avatar está en la esquina superior derecha
   del encabezado. Al activarlo (clic o teclado), se abre con nombre, correo, role(s) activos,
   "Mi perfil" y "Cerrar sesión" — sin ninguna opción para cambiar role ni cuenta (FR-002, SC-003).
2. **El avatar** (FR-004/FR-005, US2): compara el avatar del encabezado con el de "Mi perfil" — las
   mismas iniciales, el mismo color, en ambos lugares.
3. **Cambiar foto** (FR-006, US3): en "Mi perfil", busca la opción de cambiar la fotografía y
   actívala — debe explicar que todavía no está disponible, no fallar en silencio.
4. **Accesibilidad** (FR-007, `contracts/profile-menu.md`): con el teclado, llega al botón de
   avatar (Tab), ábrelo (Enter/Espacio), navega sus opciones (flechas), ciérralo con Escape — el
   foco vuelve al botón.
5. **El slot reservado para Spec 7**: en las herramientas de desarrollo, confirma que sigue
   existiendo un contenedor vacío junto al menú (no implica nada visible todavía).

## Verificación automática

```sh
npm run typecheck
npm run lint
npm run format:check
npm test -- --coverage          # unit + componentes + axe, incluye ProfileMenu.test.tsx,
                                 # useOperatorIdentity.test.tsx y ProfilePage.test.tsx
npx playwright test             # E2E — responsive.spec.ts, access.spec.ts, session.spec.ts y
                                 # token.spec.ts migrados a e2e/fixtures/profileMenu.ts
                                 # (contracts/profile-menu.md); se saltan sin E2E_AUTH0_*
npm run build && npm run size   # presupuesto 300 KB gzip en la ruta de entrada
```

## Checklist de aceptación rápida

| Criterio | Cómo verificarlo |
|---|---|
| SC-001 (máximo dos acciones a "Mi perfil"/cerrar sesión) | Paso 1 |
| SC-002 (mismo avatar en encabezado y "Mi perfil") | Paso 2 |
| SC-003 (sin cambiar role ni cuenta desde el menú) | Paso 1, inspección del contenido del menú |
| SC-004 (mensaje claro al intentar cambiar la foto) | Paso 3 |
| FR-007 (operable por teclado, nombre accesible) | Paso 4 |
| `contracts/profile-menu.md` (banner + botón de avatar siempre visibles; "Mi perfil"/"Cerrar sesión" solo tras abrir) | `e2e/responsive.spec.ts`, `ProfileMenu.test.tsx` |

## Si algo de `e2e/` sigue esperando "Perfil"/"Cerrar sesión" visibles sin abrir nada

No es un comportamiento a preservar (research.md D7): ese contrato de 008 se reemplazó a propósito.
Migra el punto que falte a `e2e/fixtures/profileMenu.ts` en vez de revertir el menú.
