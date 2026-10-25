# Contrato: configuración por entorno

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17

Toda la configuración viaja en variables `VITE_*` (públicas: nunca contienen secretos), se valida con Zod al arrancar y falla de inmediato con un mensaje claro (constitución, "Configuración y secretos"). Los archivos `.env*` reales no se versionan; `.env.example` sí.

## Variables

| Variable | Obligatoria | Ejemplo | Regla de validación |
|---|---|---|---|
| `VITE_AUTH0_DOMAIN` | Sí | `dev-xxxx.us.auth0.com` | Nombre de dominio sin esquema. |
| `VITE_AUTH0_CLIENT_ID` | Sí | `AbCd...` | Texto no vacío. |
| `VITE_AUTH0_AUDIENCE` | Sí | `https://api.mailysoft.com` | Texto no vacío (identificador de la API de Auth0). |
| `VITE_USERS_API_URL` | Sí | `/proxy/users` | Ruta que empieza con `/` o URL `http(s)`; en builds de producción una URL absoluta DEBE ser `https`. Sin `/` final. |
| `VITE_SUBSCRIPTIONS_API_URL` | Sí (feature 003) | `/proxy/subscriptions` | Igual que la anterior. |
| `VITE_DASHBOARD_REFRESH_MINUTES` | No (feature 007) | `10` | Entero de 1 a 60 (minutos), escrito solo con dígitos; ausente o vacía vale 5. Se fija al compilar. Detalle en [specs/007-dashboard/contracts/environment.md](../../007-dashboard/contracts/environment.md). |
| `VITE_CLINICS_API_URL` | No (feature 004) | `http://127.0.0.1:8001` | Igual que la anterior. |
| `VITE_HEALTH_REFRESH_SECONDS` | No (feature 016) | `10` | Entero de 10 a 300 (segundos), escrito solo con dígitos; ausente o vacía vale 30. Se fija al compilar. Detalle en [specs/016-health-dashboard/contracts/environment.md](../../016-health-dashboard/contracts/environment.md). |
| `VITE_HEALTH_DIRECT_SERVICES` | No (feature 016) | `[{"code":"mailysoft-pacientes","name":"mailySoft-pacientes","url":"https://pacientes.maily.example"}]` | Lista JSON de hasta 20 `{ code, name, url }` para la comprobación directa; ausente, vacía o `[]` vale `[]`. Se fija al compilar. Detalle en [specs/016-health-dashboard/contracts/environment.md](../../016-health-dashboard/contracts/environment.md). |

Variables solo de desarrollo, leídas por `vite.config.ts` (sin prefijo `VITE_`, no llegan al navegador):

| Variable | Por defecto | Uso |
|---|---|---|
| `USERS_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Destino del proxy `/proxy/users` en `npm run dev`. |
| `SUBSCRIPTIONS_API_PROXY_TARGET` | `http://127.0.0.1:8010` | Destino del proxy `/proxy/subscriptions` en `npm run dev` (feature 003; el puerto que documenta la API). |

## `.env.example` (contenido previsto)

```dotenv
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.mailysoft.example
VITE_USERS_API_URL=/proxy/users
VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions
# Minutos entre actualizaciones del Panel (1 a 60; 5 si no se define). Se fija al compilar.
# VITE_DASHBOARD_REFRESH_MINUTES=5
# VITE_CLINICS_API_URL=
# Solo desarrollo (las lee vite.config.ts):
# USERS_API_PROXY_TARGET=http://127.0.0.1:8000
# SUBSCRIPTIONS_API_PROXY_TARGET=http://127.0.0.1:8010
```

## Servidor de desarrollo

- Puerto fijo `5173` con `strictPort`, para que las URL registradas en Auth0 sigan siendo válidas.
- Proxy `/proxy/users` → `USERS_API_PROXY_TARGET`, quitando el prefijo `/proxy/users`. Evita CORS (el servicio de usuarios solo lo habilita si se configura `CORS_ALLOWED_ORIGINS`) y el *preflight* de la cabecera `Authorization`.
- Proxy `/proxy/subscriptions` → `SUBSCRIPTIONS_API_PROXY_TARGET`, quitando el prefijo, por la misma razón: la API de suscripciones también tiene `CORS_ALLOWED_ORIGINS` vacía por defecto (feature 003).

## Entornos desplegados

- Servir la SPA y consumir las APIs por HTTPS.
- Las APIs deben ser alcanzables desde el mismo origen (proxy inverso) o permitir CORS para el origen de la SPA, incluida la cabecera `Authorization`.
- Servir `index.html` con `Cache-Control: no-store` y una Content Security Policy restrictiva:
  - `connect-src` y `frame-src` DEBEN permitir el dominio de Auth0 (renovación del token por petición o, de respaldo, por iframe) y `connect-src` el origen de cada API que no se sirva por el mismo origen.
  - `worker-src blob:` es NECESARIO: el SDK de Auth0 guarda el *refresh token* en un Web Worker creado desde un *blob* (`cacheLocation: memory`, `useRefreshTokens`).
  - Los estilos de MUI (Emotion) se crean en tiempo de ejecución. Para evitar `'unsafe-inline'`, el servidor genera un *nonce* por respuesta, lo envía en `style-src 'self' 'nonce-…'` y lo escribe en `<meta property="csp-nonce" content="">` de `index.html`; la aplicación lo copia a cada `<style>` que crea Emotion (`src/app/providers/styleCache.ts`). Si el hosting no puede generar un *nonce* por respuesta, la alternativa es `style-src 'self' 'unsafe-inline'`.
  - El ejemplo completo está en la sección "Despliegue" del `README.md`.
- Registrar en Auth0 las URL de callback, cierre de sesión y orígenes web de cada entorno.
