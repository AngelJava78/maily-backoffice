# Specification Quality Checklist: Estilos, Diseño e Iconografía de MailySoft v2

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-21
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- Validación: 1 iteración (2026-10-21). Quedan los 3 marcadores [NEEDS CLARIFICATION] del original (FR-002, stack; FR-013, sidebar; FR-015, etiqueta «Backoffice») y el conflicto entre FR-005 (valores de web-soft) y FR-019 (WCAG AA) del caso límite de accesibilidad. Por eso fallan los dos puntos de Requirement Completeness sin marcar; se resuelven con las decisiones pendientes de abajo.
- Fidelidad al original: los 9 requisitos son FR-001 a FR-024, agrupados con su numeración; los 8 criterios de aceptación son SC-001 a SC-008; el contexto y el fuera de alcance están en Assumptions. No se quitó ni se cambió ningún requisito. SC-009 a SC-011 solo expresan como resultados medibles los requisitos 7, 1 y 8.
- Decisiones pendientes antes del plan (preguntadas a la persona solicitante el 2026-10-21; entre paréntesis, la recomendación):
  1. Stack: replicar el diseño de web-soft con MUI o reemplazar MUI por Tailwind (MUI: lo exige la constitución). Resuelve FR-002.
  2. Etiqueta «Backoffice» junto al logo (sí, con el estilo de la píldora «Plataforma» de web-soft). Resuelve FR-015.
  3. Layout: sidebar o el layout de web-soft, con barra superior y barra inferior en móvil (el de web-soft). Resuelve FR-013.
  4. Referencia visual: el sistema de tokens de las pantallas ya migradas de web-soft, no el aspecto actual de su área de plataforma (las migradas).
  5. Carga de Inter: `@fontsource/inter` autoalojada (OFL-1.1, fuera de la lista de licencias), Google Fonts (ampliar la CSP) o los archivos copiados al repo (`@fontsource/inter`, con una enmienda que admita OFL-1.1 para fuentes).
  6. Borde de los campos: `borde-fuerte` (#4A7FA7, 4,3:1) en lugar de `borde` (#E3EAF2, 1,2:1) para cumplir WCAG (sí). Resuelve el conflicto FR-005 / FR-019.
  7. Nombres de tokens: en español, como web-soft y FR-005, frente a la regla de identificadores en inglés del principio I (en español, con enmienda).
  8. Pantallas internas para comparar: puerto y credenciales de desarrollo del Backoffice local (hoy `.env.local` es de ejemplo y Auth0 solo acepta el puerto 5173) y capturas de web-soft con datos de prueba (agregar el 5183 en Auth0; capturas de la persona solicitante).
  9. Conservar el comportamiento accesible de MUI y las funciones del Backoffice que web-soft no tiene (Escape y foco retenido en los modales, notificaciones con el aspecto de los avisos de web-soft, filas por página, reintentar) (sí). Resuelve el resto del conflicto FR-005 / FR-019.
  10. Seguir el flujo de Spec Kit (plan, tareas, implementación) con las etapas y los puntos de control de la persona solicitante (sí).
- Trazabilidad FR → escenarios: FR-001 → US1-2, US1-5 y US4-3; FR-002 → SC-010; FR-003 → US4-3; FR-004 → US4-2 y SC-002; FR-005 → US1-2 y US4-3; FR-006 → US5-1 y SC-002; FR-007 → US2-8 y SC-003; FR-008 → US2-8; FR-009 → US2-3; FR-010 → US2-2 y US5-3; FR-011 → US2-4 y US2-5; FR-012 → US2-6; FR-013 → US1-1 y US1-2; FR-014 → US1-4, US5-2 y SC-005; FR-015 → US1-1; FR-016 → US1-3 y el caso límite de 320 px; FR-017 → US2-1, SC-004 y SC-006; FR-018 → US2-7; FR-019 → US3-1 a US3-4 y SC-009; FR-020 → US5-4 y SC-011; FR-021 → US4-1; FR-022 → US4-1 y US4-3; FR-023 → US4-1 y US4-2; FR-024 → US5-5. SC-007 y SC-008 se verifican con el entregable de documentación y con el build, el lint y las pruebas.
- Nombres que aparecen en la spec y no se consideran detalles de implementación: MailySoft v2 y web-soft (la referencia), `docs/DESIGN.md` (entregable pedido), los nombres de los tokens de web-soft y los ejemplos `color-*` del original (objeto de la feature) y Auth0 (para delimitar el fuera de alcance). MUI y Tailwind aparecen solo en el marcador de FR-002 y en las restricciones para el plan. SC-008 (compilar, lint y pruebas) es un criterio técnico del original y se conserva tal cual.
- Decisiones tomadas sin preguntar (revisables con `/speckit-clarify`): (a) la pantalla de acceso (`/access`) es la pantalla previa al login propia del Backoffice y entra en el alcance; (b) lo que el Backoffice ofrece y web-soft no tiene se conserva con el aspecto de web-soft, por FR-017 (se confirma en la decisión 9); (c) si no cargan la fuente o el logo, se usan los respaldos de web-soft (fuente del sistema y nombre en texto); (d) los textos nuevos que pida el diseño van al módulo central de mensajes.
