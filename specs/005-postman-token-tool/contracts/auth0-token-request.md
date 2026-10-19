# Contrato: cómo se pide el token a Auth0

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [../spec.md](../spec.md)

Resume lo que la pantalla Token consume del SDK de Auth0 y qué espera de lo que devuelve. No cambia nada de la configuración de Auth0 que fijó la 001 ([../../001-auth-session-profile/contracts/auth0-configuration.md](../../001-auth-session-profile/contracts/auth0-configuration.md)): la herramienta pide al SDK el mismo access token que ya usa el cliente HTTP, solo que **siempre nuevo**. Verificado en los tipos instalados de `@auth0/auth0-spa-js` 2.28.4 el 2026-10-19.

## La llamada

| Aspecto | Valor |
|---|---|
| Método | `getAccessTokenSilently` de `useAuth0()` |
| Opciones | `{ cacheMode: 'off' }` (`'on' \| 'off' \| 'cache-only'` en el SDK; el cliente HTTP ya usa `'off'` tras un `401`) |
| Variante | Simple: devuelve el access token como texto. No se usa `detailedResponse` |
| Cuándo | Una vez por pulsación de «Generar» o «Refrescar»; nunca al abrir la pantalla |
| Concurrencia | Una a la vez: el botón se deshabilita mientras espera. El SDK no admite cancelarla |
| `audience`, `scope` | Los del proveedor: `audience` de las APIs de MailySoft y `scope` `openid email offline_access`; no se pasan por llamada |
| Destino | Solo Auth0. La pantalla no llama a ninguna API de MailySoft |

Configuración del proveedor de la que depende (ya existente, no se toca): `cacheLocation: 'memory'`, `useRefreshTokens` con rotación y `useRefreshTokensFallback`. Con `cacheMode: 'off'` el SDK intercambia el refresh token por un access token nuevo (y rota el refresh token); si no hubiera refresh token usa el respaldo por iframe.

## Lo que se espera del resultado

Un JWT de tres partes separadas por punto, cuyo payload es JSON con el claim `exp`.

| Parte | Uso |
|---|---|
| Cabecera y firma | Se ignoran. La firma no se verifica: lo hace cada API |
| Payload | Se decodifica (base64url → JSON) y se valida con `accessTokenClaimsSchema` |
| `exp` | Entero > 0 en segundos Unix. Es lo único que se conserva: `expiresAt = new Date(exp * 1000).toISOString()` |
| Cualquier otro claim | Se descarta al validar; no se conserva ni se registra |

Ejemplo de payload (los valores son ilustrativos):

```json
{ "iss": "https://tenant.us.auth0.com/", "sub": "auth0|abc", "aud": "https://api.mailysoft.example", "iat": 1792400000, "exp": 1792486400, "scope": "openid email offline_access" }
```

Un resultado que no cumple (texto vacío, sin tres partes, payload que no es JSON, `exp` ausente o no entero) es un `unreadable-token`: la pantalla no muestra un token sin su expiración.

## Errores

| Qué llega | Tipo (`kind`) | Cómo se reconoce |
|---|---|---|
| `{ error: 'login_required' \| 'consent_required' \| 'invalid_grant' }`, `MissingRefreshTokenError`, `TimeoutError` | `session-expired` | `mapAuth0TokenError` (feature `auth`) los convierte en `SessionExpiredError` |
| El SDK resuelve con un valor que no es texto o es vacío | `unreadable-token` | Validación del resultado |
| Resultado que no es un JWT con `exp` | `unreadable-token` | `decodeAccessToken` |
| Cualquier otro error | `unknown` | Por descarte |

Los mensajes y botones de cada tipo están en [app-routes.md](app-routes.md). El error original se guarda como `cause` del `TokenRequestError` y nunca se muestra; el `logger` recibe solo `{ kind }`.

## Requisitos sobre Auth0

Ninguno nuevo. Conviene tener presente:

| Punto | Detalle |
|---|---|
| Vigencia del token | La fija la API de Auth0 de MailySoft («Token Expiration», 86 400 s por defecto). Para probar el paso a «Expirado» sin esperar un día se baja un momento (quickstart V8) y se restaura |
| Refresh token con rotación | Ya habilitado en la 001; cada «Generar» o «Refrescar» consume una rotación |
| `audience` | Si estuviera mal configurada, Auth0 podría devolver un token opaco: se vería como `unreadable-token` |

## Dobles de prueba

| Dónde | Cómo |
|---|---|
| Componentes y hooks (`renderWithProviders`) | `auth0.mocks.getAccessTokenSilently.mockResolvedValue(fakeAccessToken({ exp }))`; se comprueba que se llama con `{ cacheMode: 'off' }` y que el doble clic produce una sola llamada |
| Aplicación completa (`renderApp`) | `getTokenSilently` (espía del cliente) devuelve `fakeAccessToken({ exp })` cuando `cacheMode` es `'off'`; por lo demás devuelve `test-token:<sub>`, que es lo que reconoce el simulador del servicio de usuarios |
| Ayudante | `src/test/accessToken.ts`: `fakeAccessToken({ exp })` arma un JWT de tres partes en base64url sin firma válida |
| Fallos | Rechazar con `{ error: 'login_required' }`, con `MissingRefreshTokenError`, con un `Error` cualquiera y devolver `'no-es-un-jwt'` |
