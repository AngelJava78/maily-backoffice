# Investigación (Fase 0): Token de Acceso para Postman (Herramienta Temporal)

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Resuelve los puntos abiertos del Technical Context y fija las decisiones de diseño. Complementa [../001-auth-session-profile/research.md](../001-auth-session-profile/research.md) y [../002-manage-users/research.md](../002-manage-users/research.md): lo que no se repite aquí (Auth0, cliente HTTP, router de datos, estrategia general de pruebas, CI) sigue como allí. Las opciones del SDK de Auth0 se comprobaron en los tipos instalados (`@auth0/auth0-spa-js` 2.28.4) y los contratos del servicio de usuarios se leyeron en su copia local (ver [contracts/users-service.md](contracts/users-service.md)). No quedaba ningún punto sin aclarar en la spec: los abiertos eran de diseño.

## D1. El interruptor es el permiso `token:read`; no hay bandera por entorno

- **Decisión**: la herramienta existe para quien tenga `token:read` en alguno de sus roles activos (FR-001, FR-006) y para nadie más, en cualquier entorno. No se lee ninguna variable de entorno y se elimina `VITE_FEATURE_POSTMAN_TOKEN` (D13). La ruta siempre está registrada, pero su pantalla es un chunk perezoso que solo se pide después de que `RequirePermission` deja pasar. Está apagada por defecto porque nadie tiene el permiso: hoy ni siquiera existe en la API de usuarios (D16).
- **Razón**: es la decisión del responsable (aclaración del 2026-10-19: «No depende de desarrollo, QA o producción»). El dato vive en la base de cada entorno, así que activarla o desactivarla no exige compilar ni desplegar (SC-009), y la regla `rol → capacidad` queda en el único módulo de políticas que pide la constitución V.
- **Choque con la constitución**: el principio V («Herramienta temporal de token para Postman») exige una bandera `VITE_FEATURE_POSTMAN_TOKEN` apagada por defecto y activada por entorno, y «Configuración y secretos» la lista entre las variables mínimas. La desviación es **permanente** mientras exista la herramienta, y la gobernanza exige convertir las permanentes en enmienda. Queda registrada en Complexity Tracking del plan y **la enmienda se hizo el 2026-10-19 (constitución 1.1.0)**. Texto propuesto para `/speckit-constitution` (versión MINOR, 1.1.0: amplía materialmente una guía sin retirar el principio; se conserva como registro):

  ```text
  Herramienta temporal de token para Postman
  - DEBE implementarse como módulo aislado (`features/postman-token`) y cargarse de forma diferida
    solo cuando la persona pasa la guarda de permiso. Su disponibilidad la decide únicamente el
    permiso `token:read` de los roles de la persona, que se asigna o se quita en la API de usuarios;
    NO DEBE depender del entorno ni de una variable de configuración. Mientras ningún role tenga el
    permiso, la herramienta no existe para nadie.
  - ("Generar" significa solicitar al SDK de Auth0 un access token ...: sin cambios.)
  - Ningún otro módulo DEBE depender de él. Retirarlo (quitar el permiso a los roles y eliminar el
    módulo, su ruta y su entrada de navegación) NO requiere enmienda de esta constitución.

  Configuración y secretos, «Variables mínimas»: se elimina «y la flag de la herramienta de token».
  ```

- **Lo que la bandera protegía se conserva**: módulo aislado y sin dependientes; su código no se ejecuta ni se pide hasta pasar la guarda; apagada por defecto; retirarla es quitar el permiso y, después, borrar el módulo, la ruta, la entrada de navegación y el recurso `token` de las políticas.
- **Alternativas descartadas**: permiso **y** bandera (dos interruptores, contradice la decisión); solo bandera (es lo que la spec reemplazó); registrar la ruta de forma dinámica según el permiso (complejidad del router sin beneficio: la guarda ya impide entrar y el chunk perezoso no se pide); decidir por el nombre del role (descartado por el responsable y contrario a la constitución V).
- **Nota de seguridad**: ocultar la opción no protege. El token es el access token de la propia persona y las APIs imponen sus permisos en cada llamada (spec, Assumptions).

## D2. El recurso `token` en el módulo de políticas

- **Decisión**: `SECTION_RESOURCES` pasa a `['users', 'subscriptions', 'tenants', 'token']`. `can(access, { resource: 'token', action: 'read' })` ya exige `token:read` sin tocar su lógica, y `RequirePermission`, `SectionDefinition` y `getVisibleSections` aceptan el recurso por su tipo. Se actualiza el comentario del archivo: son los recursos con entrada en la navegación.
- **Efecto en la página principal**: `hasAnySectionPermission` cuenta ahora `token:read`. Una persona cuyo único permiso es ese no ve el aviso «Sin permisos asignados», que sería falso (tiene una herramienta). `HomePage` no cambia. Pruebas existentes a actualizar: `permissions.test.ts` (fija tres recursos); `sections.roles.test.ts` (recorre `SECTION_RESOURCES`) pasa sin cambios, porque ninguno de sus roles lleva permisos `token:*`.
- **Alternativas descartadas**: un `TOOL_RESOURCES` aparte (hay que unir tipos en los mismos cuatro lugares; YAGNI) y no contarlo en el aviso (mostraría «sin permisos» a quien sí tiene uno).

## D3. Ruta, navegación y acceso sin permiso

- **Decisión**: la ruta sigue siendo `/tools/postman-token` (ya publicada en el contrato de la 001); entrada «Token» en la navegación detrás de «Usuarios»; título de documento «Token» (`handle.titleKey: 'token'`); `RequirePermission resource="token"` en la ruta padre y `ErrorBoundary` propio; la pantalla es perezosa y comparte el `Suspense` del layout ([contracts/app-routes.md](contracts/app-routes.md)).
- **Sin permiso** (FR-005, US2-6; clarificación del 2026-10-19): `RequirePermission` redirige a `/` y no renderiza la pantalla, de modo que tampoco se pide su chunk ni se llama a Auth0, pero con un **aviso propio de la herramienta**, `messages.token.noPermission` («No tienes permiso para usar la herramienta Token.»), que recibe como prop opcional `deniedNotice`. Sin la prop mantiene `messages.home.permissionsChanged`, así que `/users` no cambia. No se crea una pantalla nueva de «sin permisos». Sin sesión, la guarda `ProtectedRoute` lleva a `/access` (US2-9).
- **Perder el permiso con la pantalla abierta** (US2-8): la emite la misma guarda, así que el aviso es el mismo, el de la herramienta (la spec no distingue ambos casos). El token en pantalla se descarta al desmontarse.
- **Alternativas descartadas**: cambiar la ruta a `/token` (altera un contrato publicado sin necesidad); una pantalla dedicada «Sin permisos» (otro patrón distinto del de las demás secciones; la persona eligió el aviso en la página principal); el aviso común de las demás secciones («Tus permisos cambiaron…»), que es inexacto para quien nunca tuvo el permiso.

## D4. Estructura de la feature y límites

- **Decisión**: `features/postman-token` con `api`, `components`, `hooks`, `schemas` y su `index.ts`. A diferencia de `users` (002, D2), **sí importa `auth`** por su `index.ts`, y solo para `mapAuth0TokenError` y `useSessionExpiry`: no hay ciclo porque `auth` no la conoce, `eslint-plugin-boundaries` lo permite (`feature → feature` por API pública) y se evita un adaptador en `app` para dos funciones.
- **Carga**: `routes.tsx` la importa con `lazy(() => import('@/features/postman-token'))`, igual que `home` y `profile`. Nadie la importa de forma estática, así que queda fuera de la ruta de entrada.
- **SDK**: el hook usa `useAuth0()` directamente (como `HttpClientsProvider` y `useSessionExpiry`). La función de `api` recibe `getAccessTokenSilently` como parámetro para poder probarse sin React.
- **Tamaño**: ningún componente pasa de 250 líneas (constitución I): `TokenPage`, `TokenValue`, `TokenExpiry` y `TokenFailureAlert`.

## D5. Cómo se obtiene el token («Generar» y «Refrescar»)

- **Decisión**: `getAccessTokenSilently({ cacheMode: 'off' })`, en su variante simple (devuelve el token como texto), tanto en «Generar» como en «Refrescar». `cacheMode: 'off'` existe en el SDK instalado (`'on' | 'off' | 'cache-only'`) y es lo que el cliente HTTP ya usa tras un `401`, con la misma configuración de la 001: tokens en memoria, refresh tokens con rotación y respaldo por iframe, `audience` en el proveedor ([contracts/auth0-token-request.md](contracts/auth0-token-request.md)).
- **Razón**: FR-015 y SC-008 piden un token **nuevo**, no reutilizado. Con la caché activa el SDK devolvería el mismo token mientras siga vigente (mismo texto, misma expiración) y «Refrescar» no mostraría ningún cambio. Con `'off'` cada pulsación pide uno a Auth0 (el intercambio del refresh token, que el SDK rota).
- **Una solicitud por pulsación y sin cancelación**: el SDK no acepta señal. Si la persona sale de la pantalla mientras espera, el resultado se descarta junto con el componente. No se añade coordinación propia con las renovaciones del cliente HTTP: el SDK gestiona las suyas y el botón impide dos solicitudes de esta pantalla (FR-016).
- **Alternativas descartadas**: `cacheMode: 'on'` (reutiliza el token); `detailedResponse: true` (devuelve también el `id_token`, que no se quiere tener en memoria, y el doble de Auth0 de las pruebas solo tipa la variante simple); pedirlo con otra `audience` (fuera de alcance: es el mismo token que usa el backoffice, spec Assumptions).

## D6. Cómo se conoce la expiración

- **Decisión**: la expiración sale del claim `exp` del propio JWT. `decodeAccessToken(token)` separa las tres partes, decodifica la central (base64url → JSON) y la valida con Zod (`accessTokenClaimsSchema`: `exp` entero positivo; el resto de claims se descarta al validar). `IssuedToken.expiresAt` es `new Date(exp * 1000).toISOString()` (ISO 8601 UTC, constitución IV). No se verifica la firma: lo hace la API y no es una decisión de seguridad del frontend.
- **Fail closed**: si el texto no es un JWT con `exp` legible (token opaco, `audience` mal configurada) el resultado es `unreadable-token` (D10): no se muestra un token sin su expiración.
- **Formato**: `formatDateTime(expiresAt)`, el helper compartido (zona del navegador, `dateStyle: medium`, `timeStyle: short`, p. ej. «20 oct 2026, 14:20»). Los segundos no aportan: no hay cuenta regresiva (fuera de alcance).
- **Por qué `exp` y no `expires_in`**: es un instante absoluto, no depende del reloj ni del momento en que llegó la respuesta, y la variante simple del SDK no devuelve `expires_in`.
- **Alternativas descartadas**: `jwt-decode` (una dependencia para unas diez líneas; la constitución pide dependencias al mínimo) y `detailedResponse` (D5).
- **Privacidad**: ningún claim se registra ni se conserva, salvo `exp`.

## D7. Estado del token: local, con `useReducer`

- **Decisión**: `useAccessToken` guarda `{ token, revealed, status, failure, now }` en un `useReducer` cuyas transiciones puras (`tokenReducer`) se escriben con prueba primero ([data-model.md](data-model.md)). La etiqueta del botón («Generar» si `token === null`, si no «Refrescar») y la validez se derivan en el render: nada se copia a otro estado.
- **Por qué no TanStack Query**: el token no es estado de servidor del Backoffice (lo emite el proveedor de identidad para esta persona) y la constitución V pide que viva solo en el estado del componente. Además, una mutación se queda en la caché de mutaciones hasta `gcTime` (5 minutos) tras salir de la pantalla, el mismo hallazgo que D13 de la 002 con la contraseña, lo que contradice FR-018. `gcTime: 0` lo evitaría, pero ataría la privacidad a un detalle interno de la librería cuando el estado local la resuelve sin riesgo.
- **Descarte**: al desmontarse el componente (salir, recargar, cerrar sesión, perder el permiso) el estado desaparece; no hay `useEffect` de limpieza.

## D8. Caducidad en vivo

- **Decisión**: el reloj de la pantalla es el campo `now` (milisegundos) del estado del reductor. Solo lo escriben dos acciones: `issued`, que trae el instante en que llegó el token (se lee dentro de la función asíncrona del botón, un manejador de eventos), y `ticked`, que trae el instante leído por un temporizador o por un listener. El render **nunca** lee el reloj: deriva `expired = token !== null && now >= Date.parse(token.expiresAt)`, así que sigue puro (constitución I).
- **Un solo efecto**: `useExpiryTimer(expiresAt, now, tick)` programa un `setTimeout` para el instante de expiración y un listener de `visibilitychange` que llama a `tick` al volver a la pestaña (los temporizadores de las pestañas en segundo plano se retrasan); ambos se limpian al desmontar y al cambiar `expiresAt` o `now`. El tiempo del temporizador se acota a 2^31−1 ms, el máximo de `setTimeout` (un valor mayor dispararía de inmediato): si se acorta, el `ticked` deja el reloj antes de la expiración y el efecto programa el siguiente. Si ya expiró, no programa nada. El estado solo se escribe dentro de devoluciones de llamada (el botón, el temporizador, el listener) y nunca de forma síncrona en el cuerpo del efecto ni durante el render, que es lo que exigen `react-hooks/purity` y `react-hooks/set-state-in-effect` de `eslint-plugin-react-hooks` 7.1.1, aplicadas como error por la configuración del proyecto.
- **Anuncio**: el cambio a «Expirado» se escribe en una región `role="status"` (D12).
- **Reloj del dispositivo**: si está mal, el cambio a «Expirado» se adelanta o se atrasa, pero la fecha mostrada sigue siendo el `exp` real.
- **Alternativas descartadas**: un `setInterval` de 1 s (renderiza cada segundo, es ruido para lectores de pantalla y pruebas, y la cuenta regresiva está fuera de alcance) llamar a `Date.now()` en el render o en el inicializador de un `useState` (lectura del reloj durante el render, que prohíbe `react-hooks/purity`) y un efecto que fije la hora al montarse (escritura síncrona de estado en un efecto).

## D9. Ocultar, mostrar y copiar

- **Decisión**: mientras está oculto, el DOM **no contiene el token**: el campo muestra una máscara fija («••••••••••••», sin relación con la longitud) y el valor real solo está en el estado. «Mostrar» renderiza el texto completo en un campo de solo lectura multilínea que se ajusta sin recortarse (`overflowWrap: anywhere`) y se puede seleccionar. No se usa `type="password"`: no admite varias líneas, obligaría a dejar el token en el DOM y activa los gestores de contraseñas.
- **Copiar**: `navigator.clipboard.writeText(token.value)` con el valor real, oculto o visible (US1-4). Éxito: aviso de éxito. Fallo o API ausente (contexto no seguro, permiso denegado): aviso de error que indica «Mostrar» para copiarlo a mano (caso límite de la spec); no lo revela por su cuenta.
- **Después de «Refrescar»** el token nuevo vuelve a estar oculto (FR-015). Un token expirado se puede mostrar pero no copiar (FR-013).
- **Botones** con texto visible igual a su nombre accesible («Mostrar», «Ocultar», «Copiar»; WCAG 2.5.3).
- **Alternativas descartadas**: ocultar con CSS (`-webkit-text-security`: el valor seguiría en el DOM y no es estándar) y copiar con `document.execCommand` (obsoleto).

## D10. Fallos del token

- **Decisión**: `requestAccessToken` devuelve un `IssuedToken` o lanza `TokenRequestError` con un `kind`: `session-expired` (cuando `mapAuth0TokenError` produce `SessionExpiredError`: `login_required`, `consent_required`, `invalid_grant`, refresh token ausente o tiempo agotado), `unreadable-token` (D6) o `unknown` (red, Auth0 caído, cualquier otro).
- **Pantalla**: una alerta con el mensaje de `messages.token.errors[kind]` y «Reintentar», que repite la última acción. Para `session-expired` se suma «Iniciar sesión de nuevo» (`useSessionExpiry()`: registra el motivo, cierra la sesión local y la guarda de rutas lleva a `/access` con la ruta de retorno). Nunca se muestra el mensaje crudo del SDK (constitución IV).
- **Qué conserva** (FR-019): si falla el primer «Generar», la pantalla sigue en su estado inicial; si falla «Refrescar», conserva el token que tenía.
- **Registro**: `logger.error` solo con `{ kind }` para `unreadable-token` y `unknown`. El `logger` ya redacta `token` y `accessToken`, pero no se le pasa ni el token ni el error del SDK.
- **Excepción de la constitución V, v1.2.0** («si la renovación silenciosa de la sesión falla, DEBE redirigirse a login conservando la ruta de retorno»): aquí la persona pidió el token, y la spec (caso límite 2, FR-019) pide el mensaje con reintento o nuevo inicio de sesión y conservar el token en pantalla; la redirección la hace «Iniciar sesión de nuevo» y conserva la ruta de retorno. Las renovaciones en segundo plano y los `401` siguen redirigiendo solos (001). La enmienda 1.2.0 del 2026-10-19 lo permite para esta herramienta; queda registrado en Complexity Tracking del plan.
- **Alternativa descartada**: redirigir siempre (descarta el token en pantalla y el reintento de un fallo pasajero; un `TimeoutError` también se clasifica como sesión terminada).

## D11. Privacidad y descarte del token

- **Dónde vive**: solo en el estado del hook y, si está visible, en el DOM. No va a la URL, al estado de navegación, a claves de consulta, a `localStorage` ni `sessionStorage` (ESLint ya lo impide), a `logger` ni a un Context.
- **Qué lo descarta**: salir de la ruta, recargar, cerrar sesión (la guarda desmonta el layout), perder el permiso (`RequirePermission` navega a `/` tras la recomprobación de la 001, que ocurre cada 5 minutos, al volver a la pestaña y al recargar) y volver atrás desde la caché del navegador (`useReloadOnBfcacheRestore` recarga la página).
- **No se hace a propósito**: ocultarlo solo tras un tiempo o al perder el foco, y limpiar el portapapeles (fuera de alcance de la spec).
- **Campo visible**: `autoComplete="off"` y `spellCheck={false}`.

## D12. Mensajes y accesibilidad

- **Textos** en `messages.token`, más `nav.sections.token` y `titles.token`, todos en español y en el único módulo de mensajes ([contracts/app-routes.md](contracts/app-routes.md)).
- **Estructura**: `h1` «Token» con foco al montar (`useFocusOnMount`, como `ProfilePage`); la advertencia es un `Alert` con `role="note"` siempre presente (FR-017), no `alert`, para que no se vuelva a anunciar en cada visita; `LiveStatus` anuncia «Token generado…» y «El token expiró…»; el aviso de copiado usa `useNotify`; vigente o expirado se dice con texto en un `Chip`, no solo con color; el botón principal usa `loading` de MUI (deshabilitado y con indicador, FR-016).
- **Diseño**: una columna desde 320 px en un `Paper` con borde; el token largo se ajusta y no hay desplazamiento horizontal de la página.

## D13. Retirada de la bandera y alineación de la 001

- **Código y configuración que cambian**: `src/app/config/env.ts` (el campo y el ayudante `flag`), `src/app/config/env.test.ts`, `src/vite-env.d.ts`, `src/test/renderApp.tsx`, `src/app/providers/HttpClientsProvider.test.tsx`, `src/shared/messages/es.ts` (`config.rules.flag`, que solo usaba esa variable), `.env.example` y `README.md`. Una `VITE_FEATURE_POSTMAN_TOKEN` que quede en un `.env.local` se ignora (el esquema no es estricto): no rompe a nadie.
- **Documentación de la 001 que se alinea**: `spec.md` (aclaración 4, escenario 6 de la historia 1 y FR-009), `contracts/app-routes.md` (fila `/tools/postman-token`), `contracts/environment.md` (variable y `.env.example`) y `data-model.md` («los tres recursos conocidos» pasan a cuatro, con `token`). El `tasks.md` de la 001 es histórico y no se toca.
- **Alternativa descartada**: dejar la variable sin uso (parecería que hace algo).

## D14. Estrategia de pruebas

- **Capas** (constitución VII):
  1. Lógica pura con prueba primero: `decodeAccessToken` (JWT válido, sin `exp`, `exp` no numérico, base64 inválido, token opaco o vacío), `tokenReducer` (todas las transiciones y que un fallo conserva el token), `classifyTokenError`, y `can` y `getVisibleSections` con `token`.
  2. Hooks con el doble de Auth0 y reloj falso: `useAccessToken` (éxito, `cacheMode: 'off'` en cada llamada, doble clic = una llamada, un fallo por tipo, resultado tras desmontar) y `useExpiryTimer` (programa la expiración en el instante exacto, tope de 2^31−1, `visibilitychange`, se limpia al cambiar `expiresAt`), con el reloj del reductor (`issued` y `ticked`).
  3. Componentes con Testing Library y user-event: estados de [contracts/app-routes.md](contracts/app-routes.md), mostrar y ocultar (el valor no está en el DOM cuando está oculto), copiar (éxito y fallo), refrescar reemplaza y vuelve a ocultar, error con «Reintentar» e «Iniciar sesión de nuevo», expirado sin «Copiar», y axe.
  4. Integración con `renderApp` y `createUsersDirectoryMock` (`grant` y `revoke` de `token:read` al role del operador): «Token» aparece solo con el permiso, la dirección directa sin permiso redirige, retirar el permiso y recomprobar descarta el token, un operador con solo `token:read` no ve el aviso de «sin permisos asignados»; con `failNext`, una primera resolución fallida no muestra la opción ni el token y una recomprobación fallida los conserva (FR-003); y «Iniciar sesión de nuevo» termina en `/access` con la ruta de retorno (constitución V, excepción de la v1.2.0).
  5. E2E `e2e/token.spec.ts`, omitido sin cuentas: A1 (Administrator con `token:read`) genera, copia y refresca; A2 (Marketing) no ve la opción.
- **Ayudante nuevo**: `src/test/accessToken.ts` con `fakeAccessToken({ exp })`, un JWT de tres partes en base64url sin firma válida. El doble de Auth0 devuelve `test-token:<sub>`, que no se puede decodificar, y el simulador de la 002 lo necesita así para identificar al operador.
- **Datos**: el simulador no cambia sus datos por defecto (el role `Administrator` no lleva `token:read`, o la navegación de las pruebas existentes mostraría un enlace más); cada prueba concede el permiso con `grant`.
- **Cobertura y determinismo**: las carpetas `api`, `hooks`, `schemas` y `policy` ya cuentan para el umbral de 80 %; relojes falsos y zona UTC (ya fijada en `vite.config.ts`).

## D15. Rendimiento

Sin dependencias nuevas. La pantalla es un chunk perezoso propio (pocos KB: MUI ya está en la entrada). La ruta de entrada solo gana el texto de `messages`, la entrada del registro y la ruta (menos de 1 KB). `npm run size` sigue siendo la puerta (273,6 KB de 300 tras la 002). Cada pulsación hace una sola solicitud a Auth0 y ninguna a las APIs de MailySoft.

## D16. El permiso en la API de usuarios

- **Estado**: no existe. Los datos iniciales del servicio traen 15 recursos por 4 acciones y ninguno es `token`.
- **Cómo se crea y se asigna**: `POST /api/v1/permissions` (exige `permissions:write`) con `{ "name": "token:read" }`, y `POST /api/v1/roles/{role_id}/permissions` (exige `roles:update`) con `{ "permission_id": <id> }` para `Administrator` y `Developer`. El formato `recurso:acción` lo admite ([contracts/users-service.md](contracts/users-service.md)).
- **La consulta `me`** ya devuelve los permisos activos de los roles activos y existe en el servicio (`get_current_access`), así que no necesita cambios. Ninguna operación del servicio exige `token:read`: lo usa solo el backoffice para decidir qué mostrar.
- **Quién lo hace**: quien administra el servicio, fuera de este repositorio. El quickstart trae los pasos y un SQL equivalente. Mientras no exista, nadie ve la herramienta (caso límite de la spec).
