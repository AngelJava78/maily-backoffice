# Specification Quality Checklist: Lista de roles y permisos en tabla, como la de Usuarios

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

- 16 de 16 puntos pasan. Revisión hecha el 2026-11-03: los 24 requisitos (FR-001 a FR-024) tienen al menos un escenario de aceptación o un criterio de éxito, y la búsqueda de términos técnicos (API, servicio, librerías) solo encuentra menciones en «Contexto» y en Assumptions.
- Tras el error de la feature 023 (leyó «lista» como la lista de permisos), las lecturas de la petición que no se pueden comprobar quedan como supuestos visibles y no como marcadores de aclaración, porque cada una tiene un valor por omisión razonable (el de la pantalla de Usuarios). La persona que pidió la feature debería confirmarlas antes de planear:
  1. El **detalle de un role pasa a una pantalla propia**, como el de un usuario, porque la tabla ocupa todo el ancho. Alternativas no elegidas: un panel lateral o un diálogo sobre la tabla.
  2. Las **columnas** son Nombre (enlace), Tipo, Descripción, Permisos y Fecha de alta; la imagen solo muestra las de Usuarios (Nombre, Correo electrónico, Fecha de alta).
  3. La tabla lleva el **mismo pie de paginación** que la de Usuarios (10, 25 o 50 filas por página), aunque hoy la lista de roles no se pagina.
- «Contexto» y Assumptions mencionan qué hace hoy la API de roles (sin paginación; todos los roles de un estatus en una sola respuesta; nada de un role bloqueado salvo su fila de la lista), comprobado en su contrato local y en el cliente del Backoffice el 2026-11-03, porque decide qué se puede mostrar; los requisitos están escritos en términos de lo que la persona ve y hace.
- Puntos abiertos para `/speckit-plan`, no para la spec:
  - Enmendar la constitución: el Principio VI describe a Roles como lista maestro-detalle y dice que esa variante no requiere Complexity Tracking; con esta feature deja de ser cierto.
  - Resolver la tensión con el Principio IV (paginar en el servidor, no descargar la colección completa para paginarla en el navegador): justificar la paginación en pantalla en Complexity Tracking o pedir a la API de roles que pagine.
  - Elegir la forma de las direcciones nuevas (tabla y detalle) y cómo abrir directamente el detalle de un role bloqueado, del que la API no da detalle: hay que sacarlo de la lista de bloqueados. Los enlaces antiguos con un role elegido deben seguir abriendo ese role (FR-019).
  - El aviso de cambios sin guardar pasa de proteger el cambio de filtro o de role dentro de una pantalla a proteger la salida de la pantalla de detalle (FR-020).
  - El número de permisos se pide role por role; con la tabla paginada solo hace falta pedirlo para los roles de la página que se ve.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
