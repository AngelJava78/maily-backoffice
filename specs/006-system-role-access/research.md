# Phase 0 Research: Acceso al Backoffice Solo con Rol de Sistema

**Feature**: `006-system-role-access` | **Fecha**: 2026-10-21

Todas las dudas de la especificación están resueltas (`## Clarifications`); esta investigación cubre las decisiones de diseño necesarias para implementar, verificadas leyendo el código actual del Backoffice y, para el contrato consumido, el código real de `mailySoft-usuarios` (rama principal, commit `0d3df16`).

## D1. Dónde vive el reconocimiento del tipo de rol

**Decisión**: un módulo nuevo, `src/features/auth/policy/roleTypes.ts`, sustituye a `src/features/auth/policy/authorizedRoles.ts`:

```ts
export const ROLE_TYPE = { SYSTEM: 1, CLINIC: 2 } as const;
export function isSystemRoleType(typeId: number): boolean {
  return typeId === ROLE_TYPE.SYSTEM;
}
```

**Razón**: FR-002 pide un único módulo que decida por `type.id`, nunca por nombre. El patrón ya existe para el estatus del usuario (`features/users/schemas/userStatus.ts`: `USER_STATUS = { ACTIVE, BLOCKED, DELETED }` + `isActiveStatus`), que `evaluateAccess` ya consume a través de `@/features/users` (su `index.ts`). `roleTypes.ts` sigue la misma forma, pero vive en `auth/policy` (no en `users`) porque qué tipo de rol **da acceso al Backoffice** es una decisión de autorización, no un dato del catálogo de roles (igual razón por la que `authorizedRoles.ts`, al que sustituye, nunca vivió en `users`).

**Alternativas descartadas**: añadir el tipo a `features/users/schemas/role.ts` (el catálogo de roles de la Spec 2, fuera de alcance: esa pantalla no se toca) o duplicar la constante en varios sitios (incumple FR-002, "definido una sola vez").

## D2. `evaluateAccess` se simplifica: un solo motivo de "sin acceso"

**Decisión**: `AccessDecision` pierde `AccessDeniedReason`; `denied` pasa a ser `{ kind: 'denied' }`, sin datos.

```ts
export function evaluateAccess(me: MyAccess): AccessDecision {
  if (me.user === null || !isActiveStatus(me.user.status.id)) {
    return { kind: 'denied' };
  }
  const authorizedRoles = me.roles.filter((role) => isSystemRoleType(role.type.id));
  if (authorizedRoles.length === 0) {
    return { kind: 'denied' };
  }
  return {
    kind: 'granted',
    access: {
      user: me.user,
      roles: me.roles,
      authorizedRoles,
      permissions: new Set(authorizedRoles.flatMap((role) => role.permissions)),
    },
  };
}
```

**Razón**: la aclaración de FR-003 fija un único mensaje para «cuenta no registrada», «cuenta no activa» y «sin rol de Sistema» (FR-013). Nada depende ya del motivo: ni el texto de la pantalla (antes `REASON_TEXT`), ni ninguna regla. Mantener el campo sería complejidad sin uso (principio I, YAGNI). La comprobación explícita del estatus (FR-003) se conserva en la misma función, como protección adicional aunque hoy sea redundante con lo que ya hace la API (ver D del contrato, más abajo): el campo `OperatorAccess.authorizedRoles` conserva su nombre y su forma (sigue siendo "los roles cuyos permisos cuentan"), solo cambia el predicado de `isAuthorizedRoleName(role.name)` a `isSystemRoleType(role.type.id)`.

**Impacto en pruebas**: toda aserción `{status:'denied', reason: '...'}` (en `evaluateAccess.test.ts`, `useOperatorAccess.test.tsx`, `useOperatorAccess.recheck.test.tsx`, `ProtectedRoute.denied.test.tsx`) pierde `reason`.

## D3. Un 403 o un 404 de `/authorization/me` se resuelven como "sin acceso", no como fallo

**Decisión**: dentro de `useOperatorAccess`, la función que llama al servicio envuelve `getMyAccess` + `evaluateAccess` y convierte un `ApiError` con `status` 403 o 404 en `{ kind: 'denied' }` **resuelto**, no en un rechazo:

```ts
async function resolveAccess(users: HttpClient, signal: AbortSignal): Promise<AccessDecision> {
  try {
    return evaluateAccess(await getMyAccess(users, { signal }));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return { kind: 'denied' };
    }
    throw error;
  }
}
```

**Razón** (FR-023): si se deja propagar el error, pasan dos cosas no deseadas:
1. El `QueryCache` global (`createQueryClient.ts`) ya reacciona a **cualquier** `ApiError` 403 con el aviso «No tienes permiso para realizar esta acción.» (`AppQueryProvider`); un 403 de la propia consulta de acceso lo dispararía, duplicando el aviso que prohíbe FR-023.
2. Un error que se deja propagar entra en la cuenta de reintentos (`shouldRetryQuery`) y termina en `status: 'failed'` (pantalla "No se pudo comprobar el acceso", con Reintentar) — exactamente lo que FR-023 dice que NO debe pasar: un 403/404 es una **respuesta**, se trata como "sin acceso", no como fallo.

Al resolver (no rechazar) con `{kind:'denied'}`, el resto de `useOperatorAccess` no cambia: `query.data` existe y la rama `decision.kind !== 'granted'` ya da `status: 'denied'`, igual que hoy.

**Nunca ocurre hoy con la API real** (ver Assumptions de la spec: `/me` nunca responde 403 ni 404), así que esta rama es una protección ante un cambio de la API o de un intermediario, no un camino que las pruebas del día a día ejerciten con la API real; sí debe probarse con MSW.

## D4. Nueva dirección `/access-denied`: arquitectura de la guarda

**Decisión**: `/access-denied` es una ruta de nivel superior, **hermana** de `PublicLayout` y de `ProtectedRoute` (no hija de ninguna), con su propio componente guarda `AccessDeniedRoute` (`src/app/router/AccessDeniedRoute.tsx`):

```tsx
export function AccessDeniedRoute() {
  const { isLoading, isAuthenticated } = useAuth0();
  const location = useLocation();
  const access = useOperatorAccess();
  const { mailySoftAppUrl } = useAppSettings();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/access" replace state={{ returnTo: location.pathname + location.search }} />;
  }
  return (
    <>
      <SessionWatchers />
      <AccessDeniedContent access={access} mailySoftAppUrl={mailySoftAppUrl} />
    </>
  );
}

function AccessDeniedContent({ access, mailySoftAppUrl }: {...}) {
  switch (access.status) {
    case 'resolving': return <PageLoader />;
    case 'failed': return <AccessCheckFailedPage refetch={access.refetch} email={access.accountEmail} />;
    case 'granted': return <Navigate to="/" replace />;
    case 'denied': return <AccessDeniedPage email={access.accountEmail} mailySoftAppUrl={mailySoftAppUrl} />;
  }
}
```

`ProtectedRoute` cambia solo su rama `denied`: en vez de dibujar `AccessDeniedPage` en el sitio, navega:

```diff
- case 'denied': return <AccessDeniedPage reason={access.reason} email={access.accountEmail} />;
+ case 'denied': return <Navigate to="/access-denied" replace />;
```

**Por qué dos guardas en vez de una**: `useOperatorAccess()` lee la caché de TanStack Query (misma `queryKey`, sin duplicar la llamada de red esté montada una vez o dos), así que las dos guardas comparten el estado sin compartir código de red. Lo único que de verdad se repite son 2 líneas (`isLoading` y `!isAuthenticated` → `Navigate` a `/access`), y ese mismo patrón ya lo hace `AccessPage` de forma independiente hoy (revisa su propio `isLoading`/`isAuthenticated` sin pasar por `ProtectedRoute`). Seguir ese precedente evita una abstracción nueva para 2 sitios (principio I: nada de abstracciones especulativas sin necesidad demostrada).

**Alternativas descartadas**:
- **Anidar `/access-denied` bajo `ProtectedRoute`** (como hermana de `AppLayout`) y que `ProtectedRoute` decida con un `<Outlet context={access}>`: funciona, pero obliga a `ProtectedRoute` a dejar de ser "quien decide todo" y reparte la decisión granted/denied en dos envoltorios adicionales (uno para la rama `AppLayout`, otro para `/access-denied`) sin ahorrar las comprobaciones de Auth0 (que siguen en `ProtectedRoute`, no en los dos nuevos). Más piezas, mismo resultado.
- **`ProtectedRoute` siempre `<Navigate to="/access-denied"/>` cuando deniega, y que esa misma ruta reciba el contenido vía `Outlet` cuando ProtectedRoute decide mostrar algo**: autoreferencial (estando ya en `/access-denied`, `ProtectedRoute` volvería a navegar al mismo sitio) y arriesga un bucle o, al menos, una navegación de más en cada render; se descartó por fragilidad.

## D5. `/access-denied` no comparte `PublicLayout`

**Decisión**: la ruta no tiene layout. `AccessDeniedPage` sigue dibujando su propio `<Container component="main" maxWidth="sm">`, exactamente como hoy.

**Razón**: `PublicLayout` también envuelve con `<Container component="main">`; anidar ambas produciría dos regiones `<main>` (viola "una región main por página", constitución VI). Como hoy `AccessDeniedPage`/`AccessCheckFailedPage` ya se dibujan sin ningún layout (los sustituye `ProtectedRoute` en el sitio de lo protegido), mantenerlas así para la nueva ruta no cambia su mecánica de foco/título: siguen con su propio `useFocusOnMount` + `useDocumentTitle`, y no hace falta tocar `useRouteAccessibility.ts` ni su `routeHandleSchema` (nadie invoca ese hook en esta rama del árbol de rutas).

## D6. El enlace "Ir a MailySoft": de dónde sale la URL

**Decisión**: una variable de entorno nueva y opcional, `VITE_MAILYSOFT_APP_URL`, que llega a `AccessDeniedPage` por props, nunca por un hook propio de la feature:

`env.ts` (validada) → `AppSettingsProvider` (`AppSettings.mailySoftAppUrl: string | undefined`) → `AccessDeniedRoute` (lee `useAppSettings()`) → prop `mailySoftAppUrl` de `AccessDeniedPage`.

**Razón**: `eslint-plugin-boundaries` solo permite que `feature` dependa de `shared` (`src/features/auth` no puede importar `src/app/providers/AppSettingsProvider`: la regla `boundaries/dependencies` lo rechazaría). Es exactamente el mismo problema, y la misma solución, que `VITE_DASHBOARD_REFRESH_MINUTES` de la feature 007 (research D11: "el intervalo de la configuración, que las features no pueden leer por sí mismas"): `HomeRoute` lee `useAppSettings()` y se lo pasa a `HomePage` por props. `AccessDeniedRoute`/`AccessDeniedPage` repiten el mismo patrón.

**Validación** (distinta de `apiBase`, que exige una ruta del mismo origen o una URL absoluta sin query/hash, pensada para una base a la que el cliente HTTP añade rutas y un token): esta variable es un **enlace a otra aplicación**, nunca recibe el token, así que:
- se acepta cualquier URL absoluta válida (con o sin ruta, query o fragmento);
- se sigue exigiendo `https` fuera de desarrollo (constitución IV: "todo entorno distinto del desarrollo local debe... HTTPS"), y se rechazan espacios y `\`, igual que en `apiBase`, por la misma razón defensiva (un navegador lee `/\x` como `//x`), aunque aquí no viaje ningún token;
- a diferencia de `apiBase`, **se permite la barra final**: es una URL de destino, no una base a la que se le concatenan rutas.

```ts
function isExternalAppUrl(value: string, isProduction: boolean): boolean {
  if (/[\\\s]/.test(value)) return false;
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  return (url.protocol === 'https:' || (!isProduction && url.protocol === 'http:')) && url.hostname !== '';
}
```

Mensaje de regla nuevo: `messages.config.rules.mailySoftAppUrl`.

## D7. Mensajes: una sección `denied` nueva, sin tocar `AccessCheckFailedPage`

**Decisión**: `messages.denied` pasa de `{ title, reasons: {...} }` a:

```ts
denied: {
  title: 'No tienes acceso al Backoffice',
  message: 'Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.',
  signedInAs: (email: string) => `Iniciaste sesión como ${email}`,
  goToMailySoft: 'Ir a MailySoft',
},
```

`reasons` se elimina (ya no hay motivos distintos, D2). `messages.common.account` (`"Cuenta: ${email}"`) se conserva **sin cambios**: lo sigue usando `AccessCheckFailedPage`, que esta feature no toca, y que no debe heredar la redacción "Iniciaste sesión como…" porque su spec (001) nunca la pidió.

## D8. Pruebas de la plataforma simulada: el tipo de rol por defecto

**Decisión**: `roleDto()` (factories.ts) y `directoryRole()` (test/handlers/usersDirectory/model.ts) añaden `type`/`typeId` con **valor por defecto Sistema** (`ROLE_TYPE.SYSTEM`). `defaultDirectory()` (seed.ts) clasifica sus roles predefinidos según la tabla real: Administrator, Developer, Support, Marketing y Billing = Sistema; Owner y Doctor = Clínica.

**Razón y riesgo asumido**: la migración real de la API (`0007_role_types.py`) usa el default contrario (Clínica) a propósito, para no dar acceso por omisión a un rol de producción desconocido. Copiar ese mismo default en el simulador de pruebas invertiría silenciosamente el resultado de **todas** las pruebas de integración de usuarios, suscripciones, token y Panel que hoy inician sesión como el Administrator semilla (o cualquier otro role hoy autorizado) sin mencionar jamás `type`: pasarían todas a "sin acceso" a menos que se acordara añadir el override en cada sitio, un cambio con una superficie enorme y fácil de dejar incompleto. El valor por defecto Sistema en el **simulador** minimiza esa superficie; el precio es que una prueba nueva que hoy confiaba en "cualquier nombre fuera de la lista = sin acceso" (p. ej. `roleDto({name:'Owner'})` sin más) debe marcar explícitamente `type: {id: 2, name: 'Clínica'}` (o `typeId: 2` en `directoryRole`) para seguir representando un role que no da acceso. Se documenta aquí para que quien añada pruebas nuevas no lo dé por hecho.

## D9. Documentación del contrato consumido

**Decisión**: esta feature escribe `contracts/users-service-me.md`, la versión vigente y verificada de `GET /api/v1/authorization/me` (con `type` por rol y `password_change_required`). Los de la feature 001 (`contracts/users-service.md`, `users-service-me-request.md`) describen la operación como estaba **antes** de que `mailySoft-usuarios` implementara las specs 009 a 012 (la llaman "propuesta pendiente"); quedan como registro histórico de la solicitud original, con una nota que remite al contrato de la 006 para el estado actual. No se reabre ni se reescribe la spec 001.

## Resumen de lo que no cambia

- El cliente HTTP, el manejo de 401 (sesión vencida) y los reintentos de 5xx/red: sin cambios (FR-022, FR-024).
- El cierre de sesión (`useLogout`, `LogoutButton`): sin cambios; ya termina la sesión en Auth0 y entre pestañas (FR-016).
- Las comprobaciones periódicas (cada 5 min, al volver a la pestaña): mismo mecanismo de la feature 001 (`ACCESS_RECHECK_INTERVAL_MS`), ahora decidiendo con la regla nueva (FR-009).
- `RequirePermission`, `can()`, `hasAnythingToSee`: sin cambios; siguen leyendo `access.permissions`, que ya solo trae los permisos de los roles de Sistema (FR-006).
