# Specification Quality Checklist: Módulos y submódulos en árbol jerárquico

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-01
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

- Validación en una iteración. Se corrigió antes de cerrar una promesa que no se podía cumplir: indicar **cuántos** submódulos impiden eliminar un módulo. El Backoffice solo ve los de la vista actual (un submódulo Bloqueado no viene en la lista de «Activos»), así que el número podría quedarse corto; para el aviso de bloqueo sí es exacto porque cuenta submódulos activos, que están a la vista. Ahora el spec distingue «submódulos a la vista» de los que solo conoce el servicio (FR-012, FR-014, FR-016).
- Las reglas de la jerarquía (un solo nivel, mismo tipo, módulos base excluidos, padre Bloqueado, no eliminar con submódulos) salen del contrato del servicio de usuarios (`mailySoft-usuarios`, spec `017-module-submodules`, versión 5.4.0), leído en su repositorio local. **Esa implementación está en curso** (cambios sin commit; versión publicada 5.3.0): la feature no se podrá probar de punta a punta hasta que esté disponible. Es la primera suposición del spec.
- **Decisión de alcance tomada por defecto, no marcada como `[NEEDS CLARIFICATION]` porque hay un valor razonable**: el árbol se aplica a la sección «Módulos» (lista y formulario). «Roles y permisos» y los planes de «Suscripciones» siguen mostrando los módulos, ahora también los submódulos, como lista plana (FR-019). Si se quisiera anidarlos también allí, conviene aclararlo con `/speckit-clarify` antes de `/speckit-plan`.
- Otras decisiones por defecto, todas en Assumptions: solo se ofrecen padres **activos**; los padres empiezan expandidos y el estado de contraído no se conserva; no hay botón «Nuevo submódulo» aparte ni reordenar arrastrando.
- La «fila de contexto» (FR-009) resuelve un caso que el contrato hace inevitable: en la vista «Bloqueados» puede aparecer un submódulo bloqueado cuyo padre está Activo.
