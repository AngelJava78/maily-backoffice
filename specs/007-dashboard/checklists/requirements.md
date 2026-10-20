# Specification Quality Checklist: Panel de Maily (Resumen de Solo Lectura)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-20
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
- Validación: 2 iteraciones. Primera: un marcador [NEEDS CLARIFICATION] (dirección del servicio sin configurar), FR-032 y FR-033 sin escenario de aceptación y SC-003 sin cubrir el entorno sin dirección. Se resolvió la aclaración con el solicitante (Clarifications, sesión 2026-10-20: aviso «no disponible», sin consultas), se añadieron los escenarios 10 y 11 de la User Story 1 y se amplió SC-003. Segunda: sin hallazgos. Revisión del 2026-10-20 al fusionarse la 003: la dirección del servicio es obligatoria, así que se retiraron el escenario del entorno sin dirección (el 11 pasó a ser el 10) y esa parte de FR-031 y SC-003; la constitución 1.3.0 resuelve los puntos 1 y 2 de «Para el plan».
- Trazabilidad FR → escenarios: FR-001 → US1-1; FR-002 → US1-1 y US2-1; FR-003 → US1-2 y US2-1; FR-004 → US1-2; FR-005 → US1-3; FR-006 → US1-9; FR-007 → US1-4, US1-5 y US1-7; FR-008 → US1-6; FR-009 → US1-2, US3-1 y caso límite del cambio de día; FR-010 → US1-8 y US4-4; FR-011 → US2-1; FR-012 → US2-2 y US2-3; FR-013 → US2-4; FR-014 → US2-5 y US2-6; FR-015 → US2-7 y su caso límite; FR-016 → US3-1; FR-017 → US3-3; FR-018 → US3-4 a US3-6; FR-019 → US3-7 y US3-8; FR-020 → US3-2 y US3-8; FR-021 → US3-9 y casos límite de consultas en curso; FR-022 → US3-6, US3-10 y caso límite de recarga; FR-023 → caso límite de inactividad; FR-024 → US4-1 y US4-2; FR-025 → US4-3; FR-026 → US4-4 y US4-5; FR-027 → US4-6 y US4-7; FR-028 → US5-1 y US5-2; FR-029 → US5-3; FR-030 → US5-4; FR-031 → caso límite de la dirección obligatoria; FR-032 y FR-033 → US1-10 y US3-1; FR-034 → US4-1 y US4-3; FR-035 → US1-3; FR-036 → entregable de documentación, se verifica por revisión.
- Nombres que aparecen en la spec y no se consideran detalles de implementación: el permiso `dashboard:read` (objeto de la feature, como `token:read` en la 005), las variables `VITE_DASHBOARD_REFRESH_MINUTES` y `VITE_SUBSCRIPTIONS_API_URL` (configuración que decide quien despliega) y el repositorio `maily-system-api` (fuente del contrato). Las indicaciones técnicas del solicitante (librería de estado de servidor, tiempo de vigencia de 30 s, esquema de validación, simulador de red, manejador global del 403, patrones existentes) se recogen al final de Assumptions como restricciones para el plan, sin formar parte de los requisitos de comportamiento.
- Decisiones tomadas sin preguntar (revisables con `/speckit-clarify`): (a) «Panel» es el encabezado principal de la página y el saludo va debajo; (b) quien no tiene ningún permiso ve solo el aviso actual de "sin permisos asignados", no además el de los indicadores; (c) una consulta fallida también reinicia la cuenta del intervalo, para que un fallo no provoque consultas en bucle; (d) tras un rechazo por permiso, el Panel no vuelve a consultar en esa visita; (e) la variable vacía equivale a no definida, como las demás opcionales; (f) «Ir al inicio» de la página no encontrada no cambia; (g) la hora de la última actualización incluye la fecha si no es del día en curso.
- Para el plan: (1) la ausencia de botón de reintentar se aparta de los principios IV y VI de la constitución y debe justificarse en Complexity Tracking o resolverse con una enmienda; (2) la constitución no menciona el Panel en el alcance del producto; (3) el manejador global del 403 hoy muestra «No tienes permiso para realizar esta acción.», que duplicaría el aviso del Panel (FR-015); (4) hay que reconciliar el tiempo de vigencia de 30 s con la regla de volver a la pestaña (FR-019), que se mide con el intervalo y no con la vigencia; (5) la feature 006 no está todavía en esta rama y es requisito previo; (6) coordinar con la feature 003 la conexión compartida con el servicio.
- Precisiones del plan (2026-10-20, research D5 y D9), revalidadas sin hallazgos:
  - FR-009 muestra siempre la fecha y la hora con segundos. Decidir si fue "hoy" exigiría leer la hora actual en el render, y los segundos hacen visible el cambio al volver (SC-005).
  - FR-021, el escenario 9 de la User Story 3 y el caso límite de salir con una consulta en curso: salir del Panel cancela la consulta (la constitución IV exige que sea cancelable). Nunca hay dos en curso.
