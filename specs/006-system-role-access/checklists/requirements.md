# Specification Quality Checklist: Acceso al Backoffice Solo con Rol de Sistema

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
- Validación, iteración 1 (2026-10-21): todo pasa salvo los dos marcadores [NEEDS CLARIFICATION] (FR-003 y FR-015), que corresponden a los dos «[Confirmar]» de la descripción y esperan la respuesta del solicitante. Correcciones hechas durante la validación: FR-017 no decía qué título lleva la pestaña (ahora «Sin acceso — MailySoft Backoffice», con el formato de las demás pantallas); el texto mezclaba «role» y «rol» (se unificó en «rol», el término del solicitante y del mensaje nuevo de la página); la mención a la Spec 7 se limitó a la traducción de nombres de rol y de tipo, que es lo que dice la descripción.
- Trazabilidad FR → escenarios: FR-001 → US1-1, US1-2, US2-1 a US2-3 y caso límite de roles sin usuario; FR-002 → US1-3 a US1-5 y SC-008; FR-003 → US2-4 (pendiente de aclaración); FR-004 → US2-5, US3-5 y casos límite de la comprobación periódica; FR-005 → caso límite del rol de Sistema Bloqueado o Eliminado; FR-006 → US1-2 y caso límite de roles de ambos tipos; FR-007 → US3-1 y US3-2; FR-008 → US3-3, US3-4 y SC-003; FR-009 → US3-5 y casos límite de retirar u obtener el rol con la sesión abierta; FR-010 → US2-7 y caso límite del cambio de contraseña; FR-011 a FR-013 → US2-1; FR-014 → US2-1, US2-3, US4-5 y caso límite del correo; FR-015 → US2-1 (pendiente de aclaración); FR-016 → US5-1 a US5-4; FR-017 → SC-010; FR-018 → US2-5, US2-6 y casos límite de la dirección inexistente y de la pantalla de inicio de sesión; FR-019 → US2-8; FR-020 → US2-9; FR-021 → US4-6; FR-022 → US4-4; FR-023 → US4-5 y caso límite de la comprobación periódica; FR-024 → US4-1 y US4-2; FR-025 → US4-3; FR-026 → entregable de documentación, se verifica por revisión.
- Nombres que aparecen en la spec y no se consideran detalles de implementación: la dirección `/access-denied` (una URL visible que el solicitante pidió definir); los identificadores del tipo de rol (1 Sistema, 2 Clínica) y del estatus (1 Activo), datos de la plataforma en los que se basa la regla, como `dashboard:read` en la 007; los códigos de respuesta entre paréntesis (401, 403, 404, 5xx), escritos como en la descripción para que los casos se puedan probar; el repositorio `mailySoft-usuarios` y su commit `0d3df16`, fuente y evidencia de los supuestos verificados. Las indicaciones técnicas del solicitante (función única reutilizable, constante, validación de la respuesta, respuestas simuladas, rama) se recogen al final de Assumptions como restricciones para el plan.
- Decisiones tomadas sin preguntar (revisables con `/speckit-clarify`): (a) `/access-denied` como equivalente de `/sin-acceso`, porque la constitución pide rutas en inglés; (b) además de un rol de Sistema se exige un usuario de MailySoft (constitución V y FR-004 de la 001); con la API actual no cambia nada, porque nunca devuelve roles sin usuario; (c) se conservan las comprobaciones periódicas de la 001 con la misma regla: la descripción no exige detectar el cambio en tiempo real, pero tampoco pide quitarlas; (d) un 403 o un 404 cuentan como «sin acceso» también en una comprobación posterior, porque son una respuesta y no un fallo, y no muestran el aviso global de falta de permiso; (e) «Cerrar sesión» vuelve a la pantalla de inicio de sesión, que ya es una dirección de cierre registrada en Auth0; (f) la página de error conserva su botón «Cerrar sesión» y sus textos, aunque la descripción solo exige «Reintentar»; (g) un rol de un tipo desconocido no da acceso ni permisos; (h) el correo se elige como dice FR-014 y la línea se oculta si no hay ninguno.
- Para el plan:
  1. Rama: `006-system-role-access`, con la convención `NNN-nombre` de la constitución (Flujo de Desarrollo). Se renombró el 2026-10-21 desde `feature/spec-01-acceso-roles-sistema`, así que ya no hay desviación que registrar.
  2. Número 006: la feature 007 (FR-013, Assumptions y research D17) ya se refiere a este cambio como «feature 006». El script habría usado 008 por defecto.
  3. Hoy las pantallas de acceso denegado y de comprobación fallida se dibujan en lugar de cualquier ruta protegida, sin dirección propia. FR-011 y FR-018 exigen una dirección y una redirección. Hay que decidir qué ruta de retorno se conserva: `/access-denied` no debería ser el destino tras iniciar sesión.
  4. El manejador global del 403 muestra hoy «No tienes permiso para realizar esta acción.» ante cualquier consulta, incluida la de acceso (FR-023).
  5. La validación de la respuesta debe exigir el tipo de cada rol: un rol sin tipo es un fallo de contrato (FR-024). La indicación de cambio de contraseña no se lee.
  6. El simulador del servicio de usuarios y las fábricas de prueba deben incluir el tipo de rol. Las cuentas de prueba del quickstart de la 001 deben revisarse: Support ahora entra.
  7. README (resumen de «Acceso») y documentación de la 001: FR-026.
  8. Hueco detectado fuera del alcance: con un cambio de contraseña pendiente, la API rechaza toda operación salvo la consulta de acceso y espera que la aplicación lance un inicio de sesión interactivo. Hoy el Backoffice lo ignora: una persona con rol de Sistema en ese estado entra y recibe rechazos por falta de permiso. Candidato a otra spec.
  9. Si se confirma el enlace de FR-015, hace falta una variable de entorno nueva, validada al arrancar y documentada en `.env.example` y en el README (constitución, Configuración y secretos).
