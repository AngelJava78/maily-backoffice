# Quickstart: validar que no vuelve a aparecer la pantalla de autorización

Guía para comprobar que el ajuste ya aplicado en el proveedor de identidad (research.md D1)
realmente evita la pantalla de autorización al recuperar una sesión activa. Confirmado en
`localhost` (dos veces) que ahí sigue apareciendo — no es una falla del ajuste (research.md D3/D5):
**la única verificación concluyente de FR-001 es en un entorno con dominio real desplegado.**

## Prerrequisitos

- Una cuenta de prueba con sesión ya autorizada en el Backoffice (si nunca inició sesión antes, va
  a ver la pantalla de autorización una vez — eso es lo esperado, ver Edge Cases del spec).
- **Obligatorio para un resultado concluyente**: un entorno con un dominio real desplegado, no
  `npm run dev` en `localhost` — confirmado (research.md D5) que en `localhost` la pantalla aparece
  siempre, sin importar el ajuste.
- Para la prueba automatizada: `E2E_AUTH0_USER_A1` y `E2E_AUTH0_PASSWORD_A1` (igual que el resto de
  `e2e/`, ver README) — pero nota que `e2e/` corre contra `localhost` (`playwright.config.ts`), así
  que tampoco sirve para confirmar FR-001; solo confirma que la suite no se rompe (research.md D5).

## Verificar manualmente

1. Inicia sesión normalmente una vez (para que exista un consentimiento ya otorgado que verificar).
2. Desde cualquier pantalla protegida, presiona F5.
3. Si el navegador no recupera la sesión por sí solo, aparece "Acceso al Backoffice"; haz clic en
   "Iniciar sesión" (FR-004 — este clic sigue igual, no es lo que cambia esta feature).
4. **Lo que debe pasar**: vuelves directo a la pantalla donde estabas. **Lo que ya no debe pasar**:
   una pantalla pidiendo "Authorize App" / aceptar un acceso, de por medio.
5. Repite en una pestaña nueva (mismo efecto que F5, ver spec.md).

## Verificación automática (de que la suite no se rompe, no de FR-001)

```sh
npx playwright test e2e/access.spec.ts   # o cualquier otro spec que inicie sesión
```

`e2e/fixtures/signIn.ts` (`submitCredentials()`) ahora acepta la pantalla de autorización si
aparece y sigue de largo si no (research.md D5), así que cualquier spec E2E que ya use
`signIn()`/`startSignIn()` + `submitCredentials()` no se rompe por este paso en ningún entorno —
pero como `e2e/` corre contra `localhost`, donde la pantalla siempre aparece, esta prueba **no**
puede confirmar FR-001 por sí sola. Se salta igual que el resto de `e2e/` si faltan las credenciales
(`E2E_AUTH0_USER_A1`/`E2E_AUTH0_PASSWORD_A1`).

## Checklist de aceptación rápida

| Criterio | Cómo verificarlo |
|---|---|
| FR-001 (sin pantalla de autorización con sesión ya autorizada) | Pasos 1-4 de la verificación manual |
| FR-002 (sigue pidiendo credenciales si la sesión ya no es vigente) | Cerrar sesión explícitamente y repetir: debe pedir usuario/contraseña de nuevo, no solo el clic |
| FR-003 (autorización nueva si cambia el permiso solicitado) | Fuera de alcance de esta verificación: se confirma el día que una feature futura agregue un `scope` nuevo |
| FR-004 (el clic en "Iniciar sesión" no cambió) | Paso 3 de la verificación manual |
| SC-001/SC-003 (100 % de las recargas, sin reconceder permisos) | Repetir los pasos 2-4 varias veces seguidas |
| SC-002 (menos de 3 segundos tras el clic) | Cronometrar el paso 3 al 4 |

## Si en `localhost` sigue apareciendo la pantalla de autorización

Va a seguir apareciendo ahí — confirmado (research.md D3/D5), no es una falla del ajuste. No
concluyas nada sobre FR-001 probando solo en `localhost`: probar en un entorno con dominio real
desplegado es la única forma de confirmarlo o descartarlo.
