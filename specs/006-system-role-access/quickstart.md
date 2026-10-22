# Guía de validación: Acceso al Backoffice Solo con Rol de Sistema

**Feature**: `006-system-role-access` | **Fecha**: 2026-10-21 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Parte de la guía de la feature 001 ([../001-auth-session-profile/quickstart.md](../001-auth-session-profile/quickstart.md)): Auth0, el servicio de usuarios y las cuentas A1 a A9 se preparan allí. Esta feature **no necesita cuentas nuevas**: la clasificación real de `mailySoft-usuarios` ya hace que A6 (antes «solo Owner, no autorizado») sea ahora «solo un rol de Clínica», que es justo el caso que esta feature necesita probar. Lo que la API no puede ejercitar (un 403/404 de `/me`, un rol sin tipo, Support entrando) se prueba con las pruebas automatizadas (sección 3), que simulan el servicio.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 | Node 24, la aplicación SPA, la API de Auth0 y el servicio de usuarios (`mailySoft-usuarios`, rama principal; ya incluye las specs 009 a 012, así que `/authorization/me` ya devuelve `type` por rol). Las cuentas A1 (Administrator), A6 (ahora: solo un rol de Clínica), A7 (bloqueada), A8 (eliminada), A9 (sin usuario en MailySoft). |
| Configuración del Backoffice | `.env.local` como en la 001. `VITE_MAILYSOFT_APP_URL` es opcional (sección 4); sin ella, «Sin acceso» no muestra el enlace. |
| Dependencias | Ninguna nueva: `npm ci` basta. |
| Cambios en `mailySoft-usuarios` | Ninguno (SC-011): solo se lee para verificar el contrato. |

## 1. Ejecutar la aplicación

```powershell
npm ci
npm run dev   # http://localhost:5173
```

## 2. Escenarios de validación manual

| # | Escenario | Pasos | Resultado esperado | Spec |
|---|---|---|---|---|
| V1 | Rol de Sistema | Entra con A1 | Entra con normalidad, llega al Panel. | US1-1, FR-001 |
| V2 | Solo rol de Clínica | Entra con A6 | `/access-denied`: título «No tienes acceso al Backoffice», el mensaje único, «Iniciaste sesión como» + el correo de A6, botón «Cerrar sesión»; sin menú ni encabezado. | US2-1, FR-011 a FR-014 |
| V3 | Sin usuario en MailySoft | Entra con A9 | `/access-denied`, con el correo de la cuenta de Auth0 (no hay usuario de MailySoft). | US2-1, FR-014 |
| V4 | Cuenta bloqueada o eliminada | Entra con A7, luego con A8 | `/access-denied` en los dos casos. | US2-1, FR-003 |
| V5 | Ninguna pantalla interna mientras se comprueba | Con la pestaña Red abierta, entra con A6 y observa la carga | Solo el indicador de carga hasta que llega la respuesta; ninguna otra petición a las APIs de MailySoft hasta entonces. | US3-1 a US3-4, FR-008, SC-003 |
| V6 | Ruta interna directa, denegado | Con la sesión de A6, escribe `/profile`, `/users`, o cualquier dirección inexistente | Siempre `/access-denied`, nunca el contenido ni «Página no encontrada». | US2-5, FR-018 |
| V7 | Atrás del navegador | Desde `/access-denied` (sesión de A6), pulsa Atrás | Sigue en `/access-denied`, sin contenido interno. | US2-6 |
| V8 | `/access-denied` con acceso | Entra con A1 y escribe `/access-denied` en la barra de direcciones | Redirige al Panel (`/`). | US2-8, FR-019 |
| V9 | `/access-denied` sin sesión | Sin iniciar sesión, abre `/access-denied` directamente | Lleva a la pantalla de inicio de sesión. | US2-9, FR-020 |
| V10 | Cerrar sesión y cambiar de cuenta | En `/access-denied` (A6), pulsa «Cerrar sesión» y luego «Iniciar sesión» con A1 | Auth0 pide credenciales de nuevo (no entra solo con A6); con A1 entra con normalidad. | US5-1 a US5-3, FR-016 |
| V11 | Falla la comprobación | Detén el servicio de usuarios (`Ctrl+C`) e intenta entrar con cualquier cuenta | Página de error genérica con «Reintentar» (no `/access-denied`, no acceso). Levanta el servicio y pulsa «Reintentar»: entra o ve «Sin acceso» según la cuenta. | US4-1 a US4-3, FR-024, FR-025 |
| V12 | Accesibilidad y diseño | Recorre `/access-denied` con lector de pantalla y a 320 px de ancho | Foco en el título al llegar; sin desplazamiento horizontal; sin violaciones de axe. | SC-010 |

## 3. Comprobaciones automatizadas

Los casos que la API real no puede producir (ver la tabla) viven aquí, no en la sección 2:

- La regla completa de `evaluateAccess` con respuestas simuladas: Sistema solo, Sistema + Clínica, Clínica solo, sin roles, tipo desconocido, nombres de tipo intercambiados, un rol llamado «Support» (ahora entra).
- Los códigos 403/404 de `/authorization/me` tratados como «sin acceso» (FR-023), y la ausencia del aviso global «No tienes permiso para realizar esta acción.».
- Las redirecciones de `/access-denied` y de las rutas protegidas (FR-018 a FR-021).
- El enlace «Ir a MailySoft», presente y ausente según `VITE_MAILYSOFT_APP_URL`.

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage   # incluye auth/policy, auth/schemas y auth/hooks
npm run build
npm run size
npm run test:e2e        # e2e/access.spec.ts; se omite sin las variables E2E_AUTH0_USER_*
```

## 4. Probar el enlace «Ir a MailySoft» (opcional)

```powershell
# En .env.local:
VITE_MAILYSOFT_APP_URL=https://clinicas.mailysoft.example
```

Reinicia `npm run dev`, entra con A6 y comprueba que el enlace «Ir a MailySoft» aparece en `/access-denied` y lleva a esa dirección. Quita la variable (o déjala vacía) y recarga: el enlace desaparece, el resto de la página no cambia.

Para comprobar la validación: pon un valor inválido (`ftp://x`, `no es una url`, `http://x` en un build de producción simulado) y reinicia — aparece «Configuración inválida» nombrando `VITE_MAILYSOFT_APP_URL`, y el Backoffice no arranca.
