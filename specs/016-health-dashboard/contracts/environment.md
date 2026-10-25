# Contrato de configuración: variables y datos de compilación

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Lo que la feature añade a la configuración del Backoffice. Las reglas comunes de las `VITE_*` (públicas, validadas con Zod al arrancar, documentadas en `.env.example`, nunca secretos) siguen en [specs/001-auth-session-profile/contracts/environment.md](../../001-auth-session-profile/contracts/environment.md), que recibe una fila por variable nueva. Todas se fijan al compilar: cambiarlas exige volver a compilar y desplegar.

## Variables del navegador (`VITE_*`)

| Variable | Obligatoria | Ejemplo | Regla de validación | Si es inválida |
|---|---|---|---|---|
| `VITE_HEALTH_REFRESH_SECONDS` | No | `60` | Entero de 10 a 300 (segundos), escrito solo con dígitos; ausente o vacía vale 30 | El Backoffice no arranca y la pantalla de configuración inválida nombra la variable y su regla, sin el valor (FR-047) |
| `VITE_HEALTH_DIRECT_SERVICES` | No | `[{"code":"mailysoft-pacientes","name":"mailySoft-pacientes","url":"https://pacientes.maily.example"}]` | Lista JSON de hasta 20 objetos con **exactamente** `code`, `name` y `url` (abajo); ausente, vacía o `[]` vale `[]` | Igual (FR-073) |

### `VITE_HEALTH_REFRESH_SECONDS`

- Válidos: `10`, `030` (30) y `300`. Inválidos: `9`, `301`, `30.5`, `+30`, `-30`, `3e1`, `treinta`, ` 30 ` y solo espacios.
- Regla (`messages.config.rules.healthRefreshSeconds`): «Entero de 10 a 300 (segundos), escrito solo con dígitos; si no se define, 30.»
- Llega a la página como `healthRefreshMs` (`AppSettingsProvider`).

### `VITE_HEALTH_DIRECT_SERVICES`

| Campo | Regla |
|---|---|
| `code` | Formato y longitud del código del registro: de 2 a 50, minúsculas, dígitos y guiones, empieza con letra, sin guion final ni dos seguidos. Único en la lista y distinto de `maily-system-api` y `mailysoft-usuarios` (los `service` de su `/info`) |
| `name` | De 1 a 100 caracteres sin contar los espacios de los extremos; se muestra recortado y tal cual en la sección |
| `url` | La regla de las URL base de las APIs (`VITE_USERS_API_URL`): una ruta del mismo origen que empieza con `/` (no `//`) o una URL absoluta `http(s)`, `https` en producción, sin `/` final, sin credenciales, parámetros ni fragmento, sin espacios ni `\` |

- Inválidos: un texto que no es JSON o no es una lista, solo espacios, un elemento al que le falta un campo o que trae otro, un `code` repetido o de un servicio fijo, un `name` vacío o de 101 caracteres, una URL `http` en un build de producción, con barra final o con parámetros, y 21 elementos (FR-073, SC-023).
- Regla (`messages.config.rules.healthDirectServices`): «Lista JSON de hasta 20 objetos { code, name, url }: code con el formato del código de un componente, único y distinto de maily-system-api y mailysoft-usuarios; name de 1 a 100 caracteres; url con las reglas de las URL base de las APIs.»
- Llega a la feature como `HttpClients.healthServices`, un cliente anónimo por servicio, en el orden de la lista. Solo se usa para `/health/live` y `/health/ready`: no habilita ninguna otra consulta a esos servicios (decisión (y) de la spec).
- **Despliegue**: cada origen absoluto de la lista debe agregarse al `connect-src` de la CSP del Backoffice, y cada servicio debe responder con CORS para el origen del Backoffice en esas dos rutas, sin credenciales (FR-077). Sin la variable, la comprobación directa no conecta con ningún origen nuevo.
- Ejemplo de desarrollo con el intermediario opcional: `[{"code":"mailysoft-pacientes","name":"mailySoft-pacientes","url":"/proxy/patients"}]`.

## Datos de compilación (no `VITE_*`)

Los lee `vite.config.ts` en Node al compilar y los inyecta con `define`. A diferencia de las `VITE_*`, un valor ausente o inválido **nunca** impide compilar ni arrancar: se ve «No disponible» (FR-045).

| Dato | Constante inyectada | Origen | Formato esperado | Si falta o no cumple |
|---|---|---|---|---|
| Versión | `__APP_VERSION__` | `version` de `package.json` (la única fuente) | Semver (`1.0.0`) | «No disponible» |
| Commit | `__APP_COMMIT_SHA__` | Variable de compilación `APP_COMMIT_SHA` | De 7 a 64 caracteres hexadecimales | «No disponible» |
| Fecha de build | `__APP_BUILD_DATE__` | Variable de compilación `APP_BUILD_DATE` | ISO 8601 con zona (`2026-10-24T16:05:00Z`) | «No disponible» |

- Los mismos nombres que usan maily-system-api, mailySoft-usuarios y mailySoft-pacientes para su `/info`.
- Ejemplo (Git Bash o el pipeline): `APP_COMMIT_SHA=$(git rev-parse HEAD) APP_BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) npm run build`. En PowerShell: `$env:APP_COMMIT_SHA = git rev-parse HEAD; $env:APP_BUILD_DATE = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); npm run build`.
- El Backoffice no las rellena solo: un build sin ellas muestra «No disponible» (US4-2, SC-011).

## Solo desarrollo

| Variable | Uso |
|---|---|
| `PATIENTS_API_PROXY_TARGET` | Opcional. Si se define, `vite.config.ts` agrega el intermediario `/proxy/patients` hacia esa dirección, como `/proxy/users` y `/proxy/subscriptions`; sin ella, no existe y la comprobación directa usa la URL del servicio con su CORS (que debe incluir `http://localhost:5173`) |

## `.env.example`

```text
# Segundos entre actualizaciones de «Salud de servicios» (10 a 300; 30 si no se define). Se fija al compilar.
# VITE_HEALTH_REFRESH_SECONDS=30
# Servicios que la comprobación directa consulta además de maily-system-api y mailySoft-usuarios:
# lista JSON de hasta 20 { code, name, url }. Cada origen absoluto debe estar en el connect-src de la CSP
# y responder con CORS en /health/live y /health/ready. Se fija al compilar.
# VITE_HEALTH_DIRECT_SERVICES=[{"code":"mailysoft-pacientes","name":"mailySoft-pacientes","url":"https://pacientes.maily.example"}]
# Al compilar (las lee vite.config.ts; sin ellas se ve «No disponible»):
# APP_COMMIT_SHA=
# APP_BUILD_DATE=
# Solo desarrollo:
# PATIENTS_API_PROXY_TARGET=http://127.0.0.1:<puerto de mailySoft-pacientes>
```
