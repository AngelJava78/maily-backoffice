# Guía de validación: Token de Acceso para Postman (Herramienta Temporal)

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Parte de la guía de la 001 ([../001-auth-session-profile/quickstart.md](../001-auth-session-profile/quickstart.md)): Auth0, el servicio de usuarios y las cuentas A1 a A9 se preparan allí; aquí solo se añade lo propio de esta feature. La herramienta se activa con un dato (el permiso `token:read`), así que **no hay nada que configurar en la aplicación**.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 | Node 24, Docker, la aplicación SPA y la API de Auth0 (con la SPA autorizada para la API y los refresh tokens con rotación), el servicio de usuarios levantado y migrado, la consulta `me` (ya disponible en el servicio) y los datos de prueba A1 a A9. |
| Postman | La aplicación de escritorio o la web, para usar el token (V5 y V6). |
| El permiso | `token:read` creado y asignado a `Administrator` y `Developer` (sección 1). **Hoy no existe en la API de usuarios.** |
| Panel de Auth0 | Solo para V8 (bajar y restaurar la vigencia del token de la API) y, opcionalmente, V13. |
| Dependencias nuevas | Ninguna: `npm ci` instala lo de siempre. |
| Sin variable de entorno | La feature no usa ninguna. Si tu `.env.local` aún trae `VITE_FEATURE_POSTMAN_TOKEN`, se ignora. |

## 1. Crear y asignar el permiso

Se hace en el servicio de usuarios, no en esta aplicación. Con la base levantada y migrada, desde la carpeta del servicio (el mismo comando que la 001):

```sql
BEGIN;

INSERT INTO permissions (name) VALUES ('token:read') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'token:read'
WHERE r.name IN ('Administrator', 'Developer')
ON CONFLICT DO NOTHING;

COMMIT;
```

```powershell
Get-Content <ruta del archivo .sql> -Raw | docker compose exec -T db psql -U postgres -d usuarios -v ON_ERROR_STOP=1 -f -
```

La alternativa por la API (con el administrador inicial) está en [contracts/users-service.md](contracts/users-service.md). Tras cada cambio de permisos, vuelve a la pestaña o espera 5 minutos para que el Backoffice vuelva a comprobar el acceso (001, FR-019).

Para **quitar** el permiso a todos (apaga la herramienta en ese entorno):

```sql
DELETE FROM role_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'token:read');
```

Efecto sobre las cuentas de la 001:

| Cuenta | Roles | ¿Ve «Token»? |
|---|---|---|
| A1 | Administrator | Sí |
| A2 | Marketing | No |
| A3 | Billing | No |
| A4 | Developer | Sí. Además deja de ver «Sin permisos asignados» en la página principal, porque ya tiene un permiso; para repetir el escenario 6 de la 001, quítaselo |
| A5 | Marketing y Owner | No |
| A6 | Owner (no autorizado) | No entra al Backoffice |
| A7, A8 | Bloqueado y Eliminado | Sin acceso |

## 2. Ejecutar la aplicación

```powershell
cd C:\maily\code\maily-backoffice
npm ci
npm run dev                              # http://localhost:5173 (puerto fijo, proxy /proxy/users)
```

## 3. Escenarios de validación

Salvo que se indique otra cuenta, se entra con A1. Los tokens viven solo en memoria: recargar la pestaña pide las credenciales de nuevo (001), así que para moverse se usa la navegación de la aplicación.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US2-1 a US2-4, FR-001, FR-002, FR-004, SC-003 | Con el permiso asignado (sección 1), entrar con A1, A4, A2 y A3. | A1 y A4 ven «Token» en la navegación; A2 y A3 no. La página principal de A4 ya no muestra «Sin permisos asignados». |
| V2 | US2-6, US2-9, FR-005, SC-004 | Iniciar sesión con A2 yendo directamente a `http://localhost:5173/tools/postman-token`; después, abrir esa dirección sin sesión. | A2 llega a `/` con el aviso «No tienes permiso para usar la herramienta Token.»; en la pestaña Red no hay ninguna solicitud de token a Auth0. Sin sesión: pantalla de acceso, sin token. |
| V3 | US1-1, US1-10, US1-11, FR-009, FR-017 | Abrir «Token». | `h1` «Token» con el foco; la advertencia visible; el campo del token vacío con su ayuda; la expiración en «—»; el botón «Generar»; sin «Mostrar», «Ocultar» ni «Copiar»; en Red no hay solicitud de token al abrir; no hay controles para otras personas ni aplicaciones. |
| V4 | US1-2, US1-3, US1-5, US1-6, FR-007, FR-010, FR-012, FR-014, FR-016 | Pulsar «Generar» e intentar pulsarlo otra vez enseguida; después «Mostrar» y «Ocultar». | El botón queda deshabilitado con un indicador y hay una sola solicitud; aparecen el token oculto, la fecha y hora de expiración en tu zona horaria y «Vigente»; el botón pasa a «Refrescar». «Mostrar» enseña el valor completo sin recortarlo; «Ocultar» lo oculta. Con el token oculto, su texto **no aparece** en el HTML de las herramientas del navegador. |
| V5 | US1-4, US1-8, FR-011, SC-001, SC-002 | Con el token oculto, «Copiar»; en Postman, `GET http://127.0.0.1:8000/api/v1/authorization/me` con Authorization → *Bearer Token* y el token pegado (solo el token, sin «Bearer»). Cronometrar desde que se abre «Token». | Aviso «Token copiado al portapapeles.»; Postman responde `200` con el usuario de A1 y sus roles, incluido `token:read`: la llamada se atiende con su identidad y permisos. Abrir, generar y copiar lleva menos de 30 segundos. |
| V6 | US1-7, FR-015, SC-008 | Con el token visible, «Refrescar»; comparar el final del token y la expiración con los anteriores; repetir la llamada de Postman con el token viejo. | El token nuevo es distinto, vuelve a estar oculto y trae otra expiración; el botón sigue en «Refrescar». El token viejo todavía responde `200` (no se revoca). |
| V7 | US1-9, FR-018, SC-005 | Con un token en pantalla, ir a «Perfil» y volver; cerrar sesión y entrar de nuevo; usar Atrás y Adelante. | Cada vez la pantalla está en su estado inicial, sin token y con «Generar». |
| V8 | US4-1 a US4-3, FR-012, FR-013, SC-007 | En Auth0 (API → Settings → *Token Expiration*) bajar la vigencia a 120 s; generar un token; esperar sin tocar nada; luego «Refrescar». Restaurar el valor original (por defecto 86 400). | «Vigente» pasa solo a «Expirado» a la hora mostrada, sin recargar, y un lector de pantalla lo anuncia; «Copiar» desaparece y «Mostrar» y «Ocultar» siguen; «Refrescar» entrega un token vigente con otra expiración. |
| V9 | US2-8, FR-018, SC-009 | Con A1 en «Token» y un token en pantalla, quitar `token:read` a `Administrator` (sección 1); volver a la pestaña o esperar 5 minutos. | La aplicación sale a `/` con el aviso «No tienes permiso para usar la herramienta Token.»; «Token» desaparece de la navegación y el token ya no está en pantalla. El token copiado antes sigue respondiendo `200` en Postman hasta su expiración. |
| V10 | US3-1 a US3-5, FR-006, FR-020, SC-006, SC-009 | Con `token:read` sin crear o sin asignar, entrar con A1; asignarlo y esperar la recomprobación; quitarlo. En cada caso abrir «Usuarios» y «Perfil». Si hay otro entorno con su propia base de datos, repetir contra él con la misma compilación. | Sin permiso nadie ve «Token»; con él aparece sin recompilar ni reiniciar nada; las demás secciones funcionan igual en todos los casos. Ni `.env.example` ni `README.md` mencionan una variable de la herramienta. |
| V11 | Caso límite del portapapeles, FR-011 | En la consola del navegador: `navigator.clipboard.writeText = () => Promise.reject(new Error('prueba'))`; pulsar «Copiar». | Aviso de error que indica pulsar «Mostrar»; el token sigue oculto; tras «Mostrar» se puede seleccionar y copiar a mano. |
| V12 | Casos límite de fallos, FR-019 | En las herramientas del navegador poner la red en «Sin conexión» y pulsar «Generar»; con red, generar; sin red otra vez, «Refrescar»; volver a conectar y «Reintentar». | Primero, el estado inicial con la alerta «No se pudo obtener el token» y «Reintentar», sin texto técnico; después, el token anterior sigue en pantalla con la alerta; con red, «Reintentar» lo resuelve y la alerta desaparece. Si el SDK informara un tiempo agotado, se verá «Tu sesión ya no es válida» con «Reintentar» e «Iniciar sesión de nuevo». |
| V13 | FR-019, caso límite 2 (opcional) | Si el tenant revoca los refresh tokens al cerrar la sesión: revocar la sesión de A1 en Auth0 (Users → A1 → Sessions) y pulsar «Refrescar» con un token en pantalla. | Alerta «Tu sesión ya no es válida» con «Reintentar» e «Iniciar sesión de nuevo» y el token anterior en pantalla; el segundo botón lleva a la pantalla de acceso y, tras identificarse, de vuelta a «Token» en su estado inicial. Si el tenant no revoca así, se cubre con las pruebas automatizadas (research D14). |
| V14 | Constitución VI (WCAG 2.1 AA) | Con solo teclado y con un lector de pantalla (NVDA o Narrador), recorrer la pantalla; ampliar a 200 % y a 320 px de ancho. | Todo se alcanza con Tab en un orden lógico; se anuncian «Token generado…», el aviso de copiado y «El token expiró…»; no hay desplazamiento horizontal y el token largo se ajusta. |

## 4. Comprobaciones automatizadas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage      # umbral de 80 % de líneas en api, policy, schemas, hooks y shared/api|lib
npm run build
npm run size               # entrada de 300 KB gzip o menos
npx playwright test e2e/token.spec.ts   # se omite sin las variables E2E_AUTH0_* de la 001 (A1 y A2)
```

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| A1 entra pero no ve «Token» | El permiso no existe o no está en el role correcto, o aún no pasó la recomprobación | Repetir la sección 1; volver a la pestaña o esperar 5 minutos |
| «Generar» dice «No se pudo leer el token» | Auth0 devolvió un token opaco: la `audience` de la aplicación no coincide con la API | Revisar `VITE_AUTH0_AUDIENCE` y el identificador de la API en Auth0 (001, `auth0-configuration.md`) |
| «Generar» dice «Tu sesión ya no es válida» al instante | Refresh tokens no habilitados para la API o la aplicación | Revisar *Allow Offline Access* y la rotación (001) |
| «Copiar» avisa que no pudo | Origen no seguro o permiso del portapapeles denegado | Usar `localhost` o HTTPS; pulsar «Mostrar» y copiar a mano |
| Postman responde `401` | Token expirado, o pegado con «Bearer» duplicado | Refrescar; en la pestaña Authorization elegir *Bearer Token* y pegar solo el token |
| Postman responde `403` en otras operaciones | El token tiene exactamente los permisos de la persona | Es lo esperado: las APIs imponen sus propios permisos |
