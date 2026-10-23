# Research: Evitar la Pantalla de Autorización al Recuperar una Sesión Activa

No quedó ningún `NEEDS CLARIFICATION` en `spec.md`: la ambigüedad real (qué pantalla exacta aparecía)
se resolvió con capturas de pantalla de la persona solicitante antes de escribir el spec. Lo que
sigue documenta la investigación que llevó a esa resolución y a la configuración ya aplicada.

## D1: Causa raíz de la pantalla de autorización repetida

**Decision**: La causa no está en `maily-backoffice`. El proveedor de identidad (Auth0) muestra una
pantalla de autorización ("Authorize App") en cada inicio de sesión cuando la API (el recurso
identificado por `VITE_AUTH0_AUDIENCE`, `https://mailysoft-apis`) no tiene habilitado "Allow
Skipping User Consent" para aplicaciones de primera parte. La aplicación del Backoffice en Auth0 ya
es de primera parte por defecto (toda aplicación creada desde el Dashboard de Auth0 lo es; esa
condición se fija al crearla y no se puede cambiar después — Auth0 First Party and Third Party
Applications). La persona solicitante habilitó ese ajuste en **Applications → APIs →
`https://mailysoft-apis` → Settings → Access Settings → Allow Skipping User Consent** (Auth0
Disable the Consent Screen for Login into Auth0 Applications).

**Rationale**: con ese ajuste apagado, Auth0 pide consentimiento en **todas** las solicitudes de
autorización de esa API, sin importar que la persona ya la haya autorizado antes — no es que
"olvide" el consentimiento cada vez, es que nunca estuvo habilitado para omitirlo. Encenderlo no
cambia nada de lo que pide la aplicación (mismo `scope`, mismo `audience`): solo cambia si Auth0
exige confirmarlo de nuevo cada vez.

**Alternatives considered**: quitar el scope `offline_access` de la solicitud (lo pide
`AppAuth0Provider.tsx` para los refresh tokens que sostienen el modelo de "token solo en memoria"
de la constitución, principio V) — se descarta: rompería la renovación silenciosa de la sesión que
ya depende de ese scope, un costo mucho mayor que la pantalla de autorización que se quiere evitar.

## D2: Por qué no alcanza con autorizar una sola vez

**Decision**: aunque la persona ya haya aceptado antes el mismo conjunto de permisos, sin "Allow
Skipping User Consent" Auth0 vuelve a pedirlo en la siguiente solicitud — no hay una cantidad de
veces después de la cual deje de pedirse por sí sola. Encender el ajuste es lo que activa que Auth0
recuerde un consentimiento ya otorgado para una aplicación de primera parte y no lo vuelva a pedir,
mientras el conjunto de permisos solicitado no cambie (ver FR-003 del spec).

**Rationale**: esto también explica por qué agregar en el futuro un `scope` nuevo (p. ej. para una
feature que necesite un permiso adicional del proveedor de identidad) hace que la pantalla de
autorización vuelva a aparecer una vez para ese conjunto de permisos nuevo — es el comportamiento
esperado de OAuth2/OIDC ante un cambio de alcance, no una regresión de esta feature.

## D3: Por qué probarlo en `localhost` puede no ser concluyente

**Decision**: Auth0 puede seguir mostrando un aviso de confirmación de inicio de sesión cuando el
`redirect_uri` no es verificable — como `localhost`, que es exactamente lo que
`AppAuth0Provider.tsx` construye en desarrollo (`${window.location.origin}/callback`) — para
proteger contra la suplantación de la aplicación en el mismo dispositivo, independientemente de
"Allow Skipping User Consent" (Auth0 User Consent and Third-Party Applications).

**Rationale**: la verificación más concluyente de FR-001 es en un entorno con un dominio real
desplegado, no en `npm run dev`. Si en `localhost` sigue apareciendo algo pero en un entorno
desplegado no, el ajuste sí funcionó — ver quickstart.md.

**Alternatives considered**: ninguna dentro del alcance de esta feature — evitar también ese aviso
en `localhost` no es parte de lo que pidió la persona solicitante (que probó y confirmó el defecto
en una sesión real, no específicamente en `localhost`) y excede FR-001.

## D4: Cómo detectar la pantalla de autorización en la prueba E2E, sin depender de su texto

**Decision**: la aserción nueva en `e2e/fixtures/signIn.ts` no debe buscar un texto literal como
"Accept" — esa pantalla la sirve el proveedor de identidad (hoy en inglés, independientemente del
idioma del Backoffice; research.md D1 de 001 y el resto de la constitución fijan que los textos de
este repositorio van en español, pero esa página no es de este repositorio) y su copy puede cambiar
sin que este repositorio se entere. En cambio, la señal estable es estructural: tras enviar las
credenciales, la URL debe salir del dominio del proveedor de identidad (`VITE_AUTH0_DOMAIN`) hacia
`/callback` del Backoffice directamente, sin detenerse en una página intermedia que pida una acción
más.

**Rationale**: una aserción por URL/origen es resistente a cambios de copy, de idioma o de diseño
de la pantalla de autorización, y es exactamente lo que FR-001 pide verificar (volver a la pantalla
protegida sin un paso de más), no el texto específico de ese paso.

**Alternatives considered**: esperar a ver el encabezado "Authorize App" con un timeout corto y
fallar si aparece — se descarta: requiere mantener un selector atado a una página que no controla
este repositorio, y un cambio de copy de Auth0 lo rompería sin que cambiara el comportamiento real.

## D5: Por qué la prueba E2E no puede afirmar que la pantalla *no* aparece

**Decision**: `playwright.config.ts` fija `BASE_URL = 'http://localhost:5173'` y las pruebas E2E
siempre corren contra `npm run dev` ahí, también en CI (`webServer.command: 'npm run dev'`) — nunca
contra un entorno desplegado. Por D3, eso significa que la pantalla de autorización va a aparecer
**siempre** en estas pruebas, sin importar si "Allow Skipping User Consent" está bien configurado.
Confirmado además al reaplicar el ajuste y probar en `localhost`: la pantalla seguía apareciendo.

**Rationale**: una prueba que afirmara "no debe aparecer" rompería todos los specs E2E que inician
sesión, en todos los entornos donde corren hoy — el riesgo exacto que evitó T001 de `tasks.md` al
bloquear la implementación hasta confirmar el comportamiento real. En cambio,
`e2e/fixtures/signIn.ts` (`submitCredentials`) ahora **acepta** la pantalla de autorización si
aparece, y sigue de largo si no — resiliente en `localhost` (donde siempre aparece) y en un
entorno desplegado (donde no debería, una vez confirmado FR-001 ahí). La verificación de que FR-001
funciona de verdad solo es posible en un entorno con dominio real desplegado; esta prueba E2E no
puede ser esa verificación, solo evita que el resto de la suite se rompa por culpa de este paso.

**Alternatives considered**: cambiar `BASE_URL`/`webServer` de Playwright para apuntar a un entorno
desplegado — se descarta, excede el alcance de esta feature (es infraestructura de pruebas
compartida por todo `e2e/`, no algo que decidir solo para esta corrección puntual).

## Fuentes consultadas

- [Disable the Consent Screen for Login into Auth0 Applications](https://support.auth0.com/center/s/article/Disable-the-consent-screen-for-login-into-Auth0-applications)
- [User Consent and Third-Party Applications](https://auth0.com/docs/get-started/applications/third-party-applications/user-consent-and-third-party-applications)
- [First Party and Third Party Applications](https://auth0.com/docs/get-started/applications/first-party-and-third-party-applications)
- [Consent screen showing up, despite Allow Skipping User Consent (Auth0 Community)](https://community.auth0.com/t/consent-screen-showing-up-despite-allow-skipping-user-consent/17623)
- ["Allow Skipping User Consent" setting does not work (Auth0 Community)](https://community.auth0.com/t/allow-skipping-user-consent-setting-does-not-work/41824)
