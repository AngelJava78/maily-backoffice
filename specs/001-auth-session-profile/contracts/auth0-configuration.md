# Contrato: configuración de Auth0

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17

Lo que debe existir en Auth0 y cómo lo usa la aplicación. La app de referencia (ASP.NET MVC) era una *Regular Web Application* con secreto de cliente; esta es una **Single Page Application** sin secreto (constitución V). No sirve reutilizar la aplicación del MVC.

## Aplicación (Applications → Create → Single Page Application)

| Ajuste | Valor |
|---|---|
| Tipo | Single Page Application |
| Token Endpoint Authentication Method | None (cliente público, PKCE) |
| Allowed Callback URLs | `http://localhost:5173/callback` y la URL de cada entorno |
| Allowed Logout URLs | `http://localhost:5173/access` y `http://localhost:5173/access/idle` (y las de cada entorno) |
| Allowed Web Origins | `http://localhost:5173` (y los de cada entorno) |
| Refresh Token Rotation | **Activada** (requisito de la constitución) |
| Vigencias del refresh token | Recomendación: absoluta no mayor que una jornada y de inactividad de 1 a 2 horas |

## API (APIs → Create API)

| Ajuste | Valor |
|---|---|
| Identifier (`audience`) | El que se configure en `VITE_AUTH0_AUDIENCE` (por ejemplo `https://api.mailysoft.com`; es un identificador, no tiene que resolver) |
| Signing algorithm | RS256 |
| Allow Offline Access | **Activado** (necesario para refresh tokens) |
| Vigencia del access token | Recomendación: corta (por ejemplo, 1 hora) |

Sin una API con ese `audience` el inicio de sesión falla con "Service not found". Los servicios de MailySoft aún no validan el token; se pide igualmente para cumplir la constitución, para la herramienta de token de la 005 y para cuando los servicios lo exijan.

## Parámetros del SDK (`Auth0Provider`)

| Parámetro | Valor | Nota |
|---|---|---|
| `domain`, `clientId` | `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` | Públicos. |
| `authorizationParams.audience` | `VITE_AUTH0_AUDIENCE` | |
| `authorizationParams.redirect_uri` | `${window.location.origin}/callback` | |
| `authorizationParams.scope` | `openid email offline_access` | La aplicación lee el `sub` y el correo (este solo para mostrar la cuenta en las pantallas de acceso denegado y de comprobación fallida, aclaración 13); el nombre y los demás datos salen del servicio de usuarios (aclaración 11). |
| `cacheLocation` | `memory` | Valor por defecto; se declara explícito. |
| `useRefreshTokens` | `true` | Por defecto `false`. |
| `useRefreshTokensFallback` | `true` | Por defecto `false`; permite autenticación silenciosa con iframe al recargar. |
| `legacySameSiteCookie` | `false` | Por defecto `true`; los navegadores soportados no la necesitan. |
| `onRedirectCallback` | `router.navigate(appState?.returnTo ?? '/', { replace: true })` | Cierra el flujo de login. |

Los valores por defecto se verificaron en el código de `@auth0/auth0-spa-js` (`src/global.ts`). Datos que el SDK guarda por sí mismo y que no son tokens: la transacción de login en `sessionStorage` y una cookie indicadora de sesión; los tokens permanecen en memoria.

## Flujos

| Flujo | Llamada | Resultado |
|---|---|---|
| Iniciar sesión | `loginWithRedirect({ appState: { returnTo } })` | Auth0 → `/callback` → `returnTo` o `/`. |
| Cierre voluntario | `logout({ logoutParams: { returnTo: <origen>/access } })` | Termina la sesión en Auth0 y vuelve a la pantalla de acceso. |
| Cierre por inactividad | `logout({ logoutParams: { returnTo: <origen>/access/idle } })` | Igual, con el aviso de inactividad. |
| Otra pestaña (cierre ajeno) | `logout({ openUrl: false })` | Descarta el estado local sin redirigir. |
| Token para llamadas | `getAccessTokenSilently()` (y con `cacheMode: 'off'` tras un 401) | Lo usa solo el cliente HTTP. |

## Errores del SDK y su tratamiento

| Error | Tratamiento |
|---|---|
| `login_required`, `consent_required`, `invalid_grant`, `MissingRefreshTokenError`, `TimeoutError` al renovar | Sesión vencida: ir a `/access` con aviso `expired` conservando la ruta de retorno (FR-013). |
| `access_denied` (la persona canceló) | Mensaje neutro en `/access` (aviso `cancelled`). |
| Cualquier otro error del proveedor | Mensaje claro con reintento (aviso `idpError`, FR-015). |

## Cuentas de prueba

Para validar la feature se necesitan cuentas en Auth0 (o un entorno de pruebas dedicado) que cubran: sin usuario en MailySoft, usuario bloqueado, usuario eliminado, solo role `Owner`, role autorizado sin permisos y role autorizado con permisos. Ver [../quickstart.md](../quickstart.md).
