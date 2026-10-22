# Quickstart: validar Estilos, Diseño e Iconografía de MailySoft v2

Guía para comprobar, en cada etapa (tokens → iconos → componentes base → layout → pantallas), que
el Backoffice se ve como web-soft y no rompió nada. No repite contenido de `research.md`,
`data-model.md` ni `contracts/`: solo enlaza a ellos.

## Prerrequisitos

- Node.js 24 (`.nvmrc`) y `npm ci` en el Backoffice (`C:\Maily\code\maily-backoffice-spec-03`).
- `.env.local` con las variables `VITE_*` de Auth0 y las APIs (ver `.env.example`).
- Para ver pantallas **internas** del Backoffice o de MailySoft v2 lado a lado: la persona
  solicitante inicia sesión ella misma (nadie más lo hace) o entrega capturas — ver Assumptions
  del spec. Si usas un puerto de desarrollo distinto a 5173, agrégalo a los Allowed Callback/
  Logout/Web Origins de la aplicación Auth0 antes de probar.
- web-soft (`C:\Maily\code\Maily360\MailySoft\web-soft`) solo se **lee**, nunca se modifica ni se
  le envían formularios; o se usa la app desplegada (https://maily360-production.up.railway.app)
  solo para observar.

## Levantar y comparar

```sh
npm run dev   # Backoffice, http://localhost:5173
```

Abre el Backoffice y la referencia de web-soft (local o producción, según quién compara) **lado a
lado**, a dos anchos: uno de escritorio (≥1024 px) y uno de móvil (320-375 px). Las pantallas de
referencia para el aspecto visual son las ya migradas de web-soft, no su área de plataforma (ver
`research.md` §2): `Topbar`/`BottomNav` para el layout, `ContactosPage`/`AgendaPage` para
listados/formularios.

## Validar por etapa

Al cerrar cada etapa, captura de pantalla del Backoffice junto a la referencia, y espera
aprobación antes de seguir (Assumptions del spec):

1. **Tokens**: `src/shared/theme/tokens.ts` + `theme.ts` — compara un botón, un input con foco y sin
   foco, y un texto sobre fondo, contra los valores de `research.md` §3-§6.
2. **Iconos**: ningún archivo de `src/features/**` importa `@mui/icons-material` ni
   `lucide-react` directo (ver verificación en `contracts/icon-component.md`).
3. **Componentes base**: una tabla, un badge, un avatar, un modal de confirmación y un toast,
   comparados contra `contracts/base-components.md`.
4. **Layout**: el header a 1024 px y a 320 px, comparado contra `contracts/layout.md` (incluida
   la verificación de accesibilidad de abajo).
5. **Pantallas**: cada ruta existente, verificando que la URL, los datos y las acciones no
   cambiaron (FR-017).

## Verificación automática (cada etapa y al final)

```sh
npm run build && npm run size   # presupuesto 300 KB gzip en la ruta de entrada
npm run lint
npm run format:check
npm test -- --coverage          # unit + componentes + axe
npx playwright test             # E2E, incluye e2e/responsive.spec.ts (header a 1024/320 px)
```

Todas DEBEN seguir en verde (línea base: build, bundle, lint, formato y 2685 pruebas pasan en
`main`, `eaed393`). Si `npm run size` falla, revisa primero cuánto pesan los 4 pesos de Inter
cargados y los iconos de `lucide-react` importados (research.md §15) antes de recortar alcance.

## Checklist de aceptación rápida

| Criterio | Cómo verificarlo |
|---|---|
| SC-001 (5/5 elementos iguales a web-soft) | Comparación visual lado a lado de layout, listado, formulario, modal y mensajes |
| SC-002 (0 valores fijos) | `grep` de hex/px literales fuera de `tokens.ts`/`theme.ts` en `src/features` |
| SC-003 (0 iconos fuera del componente común) | Verificación de `contracts/icon-component.md` |
| SC-004 (100 % de pantallas con el nuevo layout) | Recorrer la lista de rutas de Technical Context/Assumptions |
| SC-005 (espacio reservado en el header) | Inspección de `HeaderUserMenu` a ambos anchos |
| SC-006 (mismas rutas y comportamiento) | Playwright E2E completo, sin diffs de comportamiento |
| SC-007 (`docs/DESIGN.md` completo) | Revisión manual contra FR-021 a FR-024 |
| SC-008 (build/lint/pruebas pasan) | Comandos de arriba |
| SC-009 (0 violaciones de accesibilidad, contraste AA) | `axe` + medición manual de contraste del borde de campos y los iconos informativos |
| SC-010 (una sola librería de UI) | `package.json` sin Tailwind ni ninguna librería de componentes nueva |
| SC-011 (0 textos fijos nuevos dispersos) | Todo texto nuevo vive en `src/shared/messages/es.ts` |

## Si algo no tiene equivalente en web-soft

No se inventa un valor: se consulta con la persona solicitante y se registra en la tabla de
Equivalencia (`data-model.md`) con una nota, antes de cerrar la etapa correspondiente.
