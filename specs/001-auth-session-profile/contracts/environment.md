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
| `VITE_CLINICS_API_URL` | No (feature 004) | `http://127.0.0.1:8001` | Igual que la anterior. |
| `VITE_SUBSCRIPTIONS_API_URL` | No (feature 003) | `http://127.0.0.1:8002` | Igual que la anterior. |
| `VITE_FEATURE_POSTMAN_TOKEN` | No | `false` | `true` o `false`; por defecto `false` (feature 005). |

Variable solo de desarrollo, leída por `vite.config.ts` (sin prefijo `VITE_`, no llega al navegador):

| Variable | Por defecto | Uso |
|---|---|---|
| `USERS_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Destino del proxy `/proxy/users` en `npm run dev`. |

## `.env.example` (contenido previsto)

```dotenv
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.mailysoft.example
VITE_USERS_API_URL=/proxy/users
# VITE_CLINICS_API_URL=
# VITE_SUBSCRIPTIONS_API_URL=
VITE_FEATURE_POSTMAN_TOKEN=false
# Solo desarrollo (vite.config.ts):
# USERS_API_PROXY_TARGET=http://127.0.0.1:8000
```

## Servidor de desarrollo

- Puerto fijo `5173` con `strictPort`, para que las URL registradas en Auth0 sigan siendo válidas.
- Proxy `/proxy/users` → `USERS_API_PROXY_TARGET`, quitando el prefijo `/proxy/users`. Evita CORS (el servicio de usuarios solo lo habilita si se configura `CORS_ALLOWED_ORIGINS`) y el *preflight* de la cabecera `Authorization`.

## Entornos desplegados

- Servir la SPA y consumir las APIs por HTTPS.
- Las APIs deben ser alcanzables desde el mismo origen (proxy inverso) o permitir CORS para el origen de la SPA, incluida la cabecera `Authorization`.
- Servir `index.html` con `Cache-Control: no-store` y una Content Security Policy restrictiva que permita el dominio de Auth0 (`connect-src` y `frame-src`) y los estilos de Emotion mediante *nonce*.
- Registrar en Auth0 las URL de callback, cierre de sesión y orígenes web de cada entorno.
