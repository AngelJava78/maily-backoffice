# Implementation Plan: Evitar la Pantalla de Autorización al Recuperar una Sesión Activa

**Branch**: `010-skip-reauth-consent` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-skip-reauth-consent/spec.md`

## Summary

La causa raíz (FR-001) no está en el código del Backoffice: el proveedor de identidad mostraba la
pantalla de autorización en cada inicio de sesión porque la API (`audience` de la aplicación) no
tenía habilitado "omitir el consentimiento ya otorgado" para aplicaciones de primera parte — un
ajuste exclusivo del lado del proveedor, que la persona solicitante ya aplicó (ver spec.md → Input
y Assumptions, y research.md D1). No hay cambios de código de producción que hacer: `AppAuth0Provider.tsx` ya
pedía el `scope`/`audience` correctos y no necesita tocarse. El único entregable de código de esta
feature es una prueba E2E que confirme, con credenciales reales, que la pantalla de autorización no
vuelve a interponerse entre "Iniciar sesión" y la pantalla protegida — así una futura
desconfiguración del proveedor (o un cambio de `scope`) se detecta en CI en vez de notarse como
"comportamiento anormal" otra vez.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.3.1 (sin cambios; esta feature no agrega ni modifica código fuente de producción).

**Primary Dependencies**: `@auth0/auth0-react` 2.28.2, sin cambios de versión ni de configuración — `scope: 'openid email offline_access'` y `audience` en `AppAuth0Provider.tsx` ya eran correctos antes de esta feature. Sin dependencias nuevas.

**Storage**: N/A — no hay estado nuevo, ni de servidor ni de cliente.

**Testing**: Playwright (`e2e/`), con credenciales reales de un entorno de prueba del proveedor de identidad (`E2E_AUTH0_USER_A1`/`E2E_AUTH0_PASSWORD_A1`). `playwright.config.ts` fija `BASE_URL = 'http://localhost:5173'`: por D3/D5 de research.md, la pantalla de autorización aparece siempre ahí, sin importar la configuración del proveedor — así que la prueba E2E no puede afirmar su ausencia (eso solo se confirma en un entorno desplegado, fuera del alcance de esta feature). Entregable de esta feature: `e2e/fixtures/signIn.ts` (`submitCredentials`) ahora acepta esa pantalla si aparece y sigue de largo si no, para que el resto de los specs E2E que inician sesión no se rompan por este paso, en ningún entorno.

**Target Platform**: SPA en navegador (sin cambios).

**Project Type**: SPA frontend de un solo proyecto (sin cambios).

**Performance Goals**: Sin impacto — no hay bundle ni ruta nueva.

**Constraints**: Ningún cambio de código de producción (constitución: "NO DEBE escribirse código de producción sin spec y plan de la feature, salvo correcciones triviales" — aquí no hay, de hecho, código de producción que escribir). El manejo de la pantalla de autorización en la prueba E2E NO DEBE depender de un texto en español (no está en español, y su copy no lo controla este repositorio): se matchea por su etiqueta en inglés ("Accept"), documentado como tal. El tiempo de espera para detectarla DEBE mantenerse corto (research.md D5): en un entorno donde correctamente nunca aparece, cada inicio de sesión paga ese tiempo de espera igual, y no debe comerse el presupuesto de 5 s de `SC-001: the home page shows up within 5 seconds of sending the credentials` (`e2e/access.spec.ts`).

**Scale/Scope**: 0 archivos de producción modificados. 1 configuración externa (proveedor de identidad) ya aplicada antes de este plan, pendiente de verificación concluyente en un entorno desplegado (no en `localhost`). 1 archivo de prueba E2E modificado (`e2e/fixtures/signIn.ts`), consumido por los specs E2E que ya inician sesión (`access.spec.ts`, `dashboard.spec.ts`, `session.spec.ts`, `subscriptions.spec.ts`, `token.spec.ts`, `users.spec.ts`, `responsive.spec.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / Sección | Estado | Notas |
|---|---|---|
| I. Arquitectura por Features y React Idiomático | N/A | Sin componentes, hooks ni archivos de `src/` nuevos o modificados. |
| II. TypeScript Estricto y Datos Validados en la Frontera | N/A | Sin datos nuevos que crucen una frontera. |
| III. Estado de Servidor Separado del Estado de Cliente | N/A | Sin estado nuevo. |
| IV. Integración con APIs REST por Contrato | N/A | Sin llamadas ni contratos nuevos. |
| V. Seguridad y Autenticación con Auth0 (NO NEGOCIABLE) | PASS | El ajuste aplicado ("omitir consentimiento ya otorgado" para la aplicación de primera parte) es exclusivamente del lado del proveedor de identidad: no cambia dónde viven los tokens (siguen solo en memoria), no agrega persistencia, no amplía el `scope` solicitado ni introduce secretos. No es la excepción de "conservar la sesión entre recargas" que exige análisis de riesgo (Complexity Tracking): eso seguiría aplicando solo si se persistiera el token, cosa que esta feature no hace. |
| VI. Experiencia de Usuario, Accesibilidad y Consistencia | N/A | Sin UI nueva en el Backoffice; la pantalla de autorización es del proveedor de identidad, fuera de este repositorio. |
| VII. Calidad Verificable mediante Pruebas | PASS | Se agrega cobertura E2E para un comportamiento hoy no verificado automáticamente (ver Technical Context → Testing), en vez de dejarlo como una comprobación manual repetida. |
| Flujo de Desarrollo (spec-first) | PASS | Spec (con la ambigüedad ya resuelta con capturas de pantalla, sin `[NEEDS CLARIFICATION]` pendientes) → este plan, antes de cualquier cambio; en este caso el "cambio" ya ocurrió fuera del repositorio, documentado aquí para dejar el registro completo (pedido explícito de la persona solicitante). |

**Resultado**: PASS. Sin violaciones que justificar — ver Complexity Tracking.

**Re-chequeo post-diseño (Fase 1)**: `research.md` y `quickstart.md` no introducen código de producción,
dependencias ni estado nuevo más allá de lo ya evaluado arriba. Sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/010-skip-reauth-consent/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se generan `data-model.md` ni `contracts/`: la feature no agrega entidades (Technical Context →
Storage: N/A) ni expone o consume una interfaz nueva — el único cambio de código es una prueba, no
una API ni un componente con props propias.

### Source Code (repository root)

Proyecto único existente (sin monorepo). Esta feature **no modifica `src/`**: el código de
producción (`AppAuth0Provider.tsx`, `AccessPage.tsx`, el resto del flujo de sesión) ya estaba bien
escrito y no necesita cambios — la causa raíz era la configuración del proveedor de identidad, ya
corregida fuera de este repositorio.

```text
e2e/
└── fixtures/
    └── signIn.ts         # MODIFICADO — submitCredentials() acepta la pantalla de autorización
                          #   del proveedor de identidad si aparece (siempre en localhost, D5) y
                          #   sigue de largo si no; ningún spec E2E que inicia sesión (vía
                          #   signIn()/startSignIn()+submitCredentials()) queda varado ahí
```

**Structure Decision**: no aplica una "estructura" nueva — se extiende el único punto de entrada
que ya centraliza el inicio de sesión en las pruebas E2E (`e2e/fixtures/signIn.ts`), para que los
specs existentes (`access.spec.ts`, `dashboard.spec.ts`, `session.spec.ts`,
`subscriptions.spec.ts`, `token.spec.ts`, `users.spec.ts`, `responsive.spec.ts`) ganen la
verificación sin que cada uno tenga que repetirla.

## Complexity Tracking

> Sin violaciones que justificar: ningún principio de la constitución se ve afectado por un ajuste
> de configuración del proveedor de identidad que no toca tokens, persistencia, secretos ni scope.
> Tabla vacía a propósito.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
