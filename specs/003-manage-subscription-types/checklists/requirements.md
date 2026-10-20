# Specification Quality Checklist: Administración de Suscripciones

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-17
**Updated**: 2026-10-20
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
- Revisión del 2026-10-20: la spec se alineó con la API de suscripciones ya implementada (`maily-system-api`, feature `001-subscriptions-api`), que es la fuente de verdad. El pedido y el contrato coinciden; las precisiones del contrato están en Assumptions («Contraste con el contrato»).
- Cambios respecto a la versión anterior: la sección y el título pasan de «Tipos de suscripción» a «Suscripciones»; los atributos son definitivos y se retira la periodicidad (solo hay precio mensual en pesos mexicanos); se añade la User Story 4 «Cambiar el estatus de una suscripción» (P2), y eliminar pasa de User Story 4 a User Story 5 para conservar el orden por prioridad (P1, P1, P2, P2, P3), como en la 002; se retira la detección de ediciones ajenas (antiguo escenario 5 de la User Story 3 y parte de FR-012): gana el último cambio y solo se envía lo que cambió; eliminar ahora se ofrece solo en el detalle, se deshabilita si hay clínicas y añade los rechazos de la plataforma; FR-001 a FR-014 se reescribieron y se añadieron FR-015 a FR-023; SC-002 se refiere al catálogo completo (hasta 100) y se añadieron SC-007 a SC-011; Key Entities suma «Estatus de suscripción»; se añadió la sesión de Clarifications del 2026-10-20; y el Input cita ahora la descripción de la feature que dio el usuario (en lugar de la orden genérica «Genera las especificaciones que sean necesarias» con la que se crearon las specs 001 a 004), conserva el alcance heredado del proyecto y suma, en su propia línea, el «Ajuste del 2026-10-20».
- Validación: 2 iteraciones. En la primera se corrigió un hallazgo: FR-005 y FR-008 no decían a dónde vuelve el operador al cancelar, aunque los escenarios US2-7 y US3-3 sí (al listado desde el alta y al detalle desde la edición). La segunda, sin hallazgos: 0 marcadores [NEEDS CLARIFICATION] y ningún término técnico en historias, casos límite, FR ni SC.
- Cobertura FR → escenarios: FR-001 → US1 esc. 1-2 y caso límite de la última página; FR-002 → US1 esc. 1 y 9, US2 esc. 1; FR-003 → US1 esc. 1, 5 y 8; FR-004 → US1 esc. 9-10; FR-005 → US2 esc. 1-2 y 7; FR-006 → US2 esc. 5-6, US3 esc. 5 y casos límite de textos largos, mayúsculas y espacios, precio 0 y elemento vacío; FR-007 → US2 esc. 9, US4 esc. 9 y US5 esc. 9; FR-008 → US3 esc. 1-4, 6 y 7; FR-009 → US5 esc. 1-3; FR-010 → US1 esc. 11 y 13, US2 esc. 6 y 8, US3 esc. 5, 8 y 9, US4 esc. 7-8, US5 esc. 6-8; FR-011 → US2 esc. 2, US3 esc. 2, US4 esc. 2, 3 y 5, US5 esc. 2; FR-012 → US3 esc. 7-8, US4 esc. 7-8, US5 esc. 8 y casos límite de concurrencia; FR-013 → US1 esc. 12-14, US2 esc. 10, US3 esc. 9-10, US4 esc. 10, US5 esc. 11; FR-014 → US1 esc. 5-6; FR-015 → US1 esc. 3, US3 esc. 2, US4 esc. 2 y 5 y caso límite de empates; FR-016 → US1 esc. 4 y caso límite de estatus desconocido; FR-017 → US4 esc. 1-6; FR-018 → US5 esc. 2, 4-7 y 10; FR-019 → US1 esc. 7 y caso límite de clínicas no disponibles; FR-020 → caso límite de estatus desconocido; FR-021 → US2 esc. 1-2 y US3 esc. 7; FR-022 → SC-011; FR-023 → US2 esc. 3-4 y caso límite de los 20 elementos.
- Términos: los permisos `subscriptions:*` y WCAG 2.1 AA son identificadores de negocio y una norma, no detalles de implementación. Las rutas de la API, el encabezado del token, el audience y `VITE_SUBSCRIPTIONS_API_URL` solo aparecen en Assumptions, como se pidió. «Chip» solo aparece en Clarifications, con las palabras de la decisión; los FR hablan de «etiqueta».
- Decisiones tomadas sin preguntar (valores por defecto razonables): (a) guardar una edición sin cambios no contacta a la plataforma, que exige al menos un dato, y vuelve al detalle con un aviso; (b) cancelar el alta vuelve al listado y cancelar la edición, al detalle; (c) un estatus desconocido se muestra en una etiqueta neutra y ofrece los tres estatus; (d) tras un rechazo por clínicas asignadas, el detalle se actualiza con su número de clínicas; (e) al eliminar sin poder comprobar las clínicas, el mensaje con reintento indica ese motivo (así se concilian el «mensaje genérico» de la lista de rechazos y el «se muestra el motivo» de los escenarios de eliminar); (f) el motivo usa el singular «Tiene 1 clínica asignada»; (g) desde un detalle abierto por dirección directa se vuelve a la primera página, y si la página guardada ya no existe se muestra la última; (h) el desempate por nombre es alfabético y sin distinguir mayúsculas.
- Alineación del nombre, hecha el 2026-10-20 a petición del usuario: la 001 (aclaración 3, FR-009 y FR-017 de su spec, su `quickstart.md`, su `contracts/app-routes.md` y su `data-model.md`), la 004, el README y el texto de navegación (`src/shared/messages/es.ts`, clave `subscriptions`) dicen ahora «Suscripciones», y la ruta reservada de la sección pasa de `/subscription-types/*` a `/subscriptions/*`, con el id `subscriptions`. Las tareas completadas de la 001 conservan el nombre anterior como registro histórico, y la constitución sigue diciendo «tipos de suscripción» (cambiarlo es una enmienda con `/speckit-constitution`).
- Para el plan: justificar en Complexity Tracking la paginación sobre el catálogo completo (principio IV); documentar el contrato en `contracts/`; usar la ruta reservada `/subscriptions/*`; decidir cómo llega el navegador a la API en cada entorno (su lista de sitios permitidos está vacía por defecto; la API de usuarios usa un intermediario en desarrollo); enviar el precio como texto decimal para no perder precisión (la API acepta número o texto); y decidir qué ocurre si `VITE_SUBSCRIPTIONS_API_URL` no está configurada (hoy es opcional).
