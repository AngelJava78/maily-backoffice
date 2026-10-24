# Feature Specification: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

**Feature Branch**: `015-clinic-roles-system-modules`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Un role de tipo Clínica debe poder recibir en el Backoffice permisos
de módulos de tipo Sistema, además de los de módulos de tipo Clínica que ya podía recibir (regla
asimétrica); un role de tipo Sistema sigue sin poder recibir ni mostrar permisos de módulos de
Clínica. Caso de uso motivador: un administrador de una clínica (role de tipo Clínica) que da de
alta personal (doctores, enfermeras, etc.) en su clínica también necesita permisos del módulo
«Usuarios» (tipo Sistema) para poder crear la cuenta de usuario de ese personal. El backend
(`mailySoft-usuarios`, spec `015` de ese repositorio) ya acepta estas asociaciones sin ningún
cambio de API; falta exclusivamente el Backoffice: la spec `014-roles-permisos` de este repo tiene
el FR-006, que impone la regla simétrica (cada role solo ve módulos de su propio tipo), y queda
desactualizado. Dentro de la matriz de un role de Clínica, las filas de módulos de Sistema y las de
Clínica deben agruparse en dos secciones diferenciadas, cada una con su propio encabezado."

**Nota de contexto**: Esta spec es la contraparte, en el Backoffice, de la spec `015` de
`mailySoft-usuarios` (otro repositorio): esa spec ya hizo el cambio de regla de negocio en el
backend (la tabla de pares rol-módulo permitidos ya acepta (Clínica, Sistema) además de (Sistema,
Sistema) y (Clínica, Clínica); el par (Sistema, Clínica) nunca se añade) sin ningún cambio de
contrato de API. Esta spec no repite ese trabajo: asume la regla de negocio ya vigente del lado del
servidor y se concentra en lo que falta exclusivamente aquí — que la matriz de permisos del
Backoffice deje de impedir, con su propio filtrado, lo que el servidor ya permite, y lo presente de
forma clara cuando un role de Clínica combina ambos grupos de módulos.

## User Scenarios & Testing *(mandatory)*

Los actores son **quien administra Roles y Permisos en el Backoffice** (con `roles:update`) y, de
forma indirecta, **el administrador de una clínica**, cuyo role de tipo Clínica es el que recibe el
permiso nuevo. La spec `014-roles-permisos` introdujo la matriz de permisos con una comprobación de
tipo (FR-006) que, hasta ahora, solo ofrecía a un role los módulos de su propio tipo. Esta feature
**flexibiliza esa comprobación en un solo sentido**: un role de Clínica gana acceso también a
módulos de Sistema; un role de Sistema no gana nada nuevo y sigue sin poder acceder a módulos de
Clínica.

### User Story 1 - Dar de alta personal de clínica con su propia cuenta de usuario (Priority: P1)

Quien administra Roles y Permisos necesita poder asociar al role de un administrador de clínica
(tipo Clínica) un permiso de un módulo de tipo Sistema (por ejemplo, «Usuarios: Crear»), para que
esa persona pueda, desde su propio role, crear la cuenta de usuario de cada doctor, enfermera u
otro miembro de personal que da de alta en su clínica, sin depender de que alguien con un role de
Sistema lo haga por ella.

**Why this priority**: Es el caso de uso que motiva la feature; sin él, el flujo de alta de
personal de una clínica queda incompleto (se puede registrar al personal en la clínica, pero no se
le puede crear su cuenta de usuario).

**Independent Test**: Se puede probar por completo abriendo el detalle de un role de tipo Clínica,
marcando en su matriz un permiso de un módulo de tipo Sistema y guardando: el cambio se acepta sin
error y el permiso queda marcado como concedido.

**Acceptance Scenarios**:

1. **Given** un role de tipo Clínica abierto en su detalle, **When** la persona marca un permiso de
   un módulo de tipo Sistema en la matriz y guarda, **Then** el cambio se guarda sin error y ese
   permiso aparece como concedido.
2. **Given** un role de tipo Clínica recién creado sin ningún permiso, **When** la persona abre su
   matriz de permisos, **Then** ve disponibles para marcar tanto las filas de módulos de Clínica
   como las de módulos de Sistema.
3. **Given** un role de tipo Clínica con permisos de módulos de Sistema y de Clínica a la vez,
   **When** quien administra Roles y Permisos lo duplica o lo usa como origen de "Copiar permisos
   de", **Then** el role nuevo (también de tipo Clínica) recibe ambos grupos de permisos sin ningún
   rechazo.

---

### User Story 2 - La matriz de un role de Clínica distingue el origen de cada módulo (Priority: P2)

Quien administra Roles y Permisos necesita, al ver la matriz de un role de tipo Clínica que ahora
puede mezclar módulos de ambos tipos, distinguir de un vistazo cuáles son módulos propios de la
operación de una clínica y cuáles son módulos de Sistema, para entender el alcance real de lo que
ese role puede hacer sin tener que consultar el tipo de cada módulo por separado.

**Why this priority**: No bloquea la Historia 1 (el permiso ya se puede conceder sin esto), pero
sin ella la tabla mezclaría, sin ninguna señal, módulos de naturaleza muy distinta (por ejemplo,
«Pacientes» y «Usuarios») bajo el role de un mismo administrador de clínica, lo que dificulta
revisar de un vistazo qué tan amplio es realmente ese role.

**Independent Test**: Se puede probar por completo abriendo la matriz de un role de tipo Clínica
que tenga módulos de ambos tipos entre sus filas disponibles y comprobando que aparecen agrupados
bajo un encabezado por tipo, incluso si el role todavía no tiene ningún permiso concedido.

**Acceptance Scenarios**:

1. **Given** un role de tipo Clínica, **When** la persona abre su matriz de permisos, **Then** las
   filas de módulos de tipo Clínica aparecen agrupadas bajo un encabezado que las identifica como
   tales, y las de tipo Sistema bajo un encabezado distinto.
2. **Given** un role de tipo Clínica sin ningún permiso de módulo de Sistema concedido todavía,
   **When** la persona abre su matriz, **Then** el grupo de módulos de Sistema igual aparece, con
   sus filas disponibles para marcar (no solo cuando ya tiene algo concedido).
3. **Given** un role de tipo Sistema, **When** la persona abre su matriz de permisos, **Then** la
   tabla se ve exactamente igual que antes de esta feature: una sola lista de filas, sin
   encabezados de grupo, porque ese role nunca recibe módulos de Clínica.

---

### User Story 3 - Un role de Sistema sigue sin alcanzar módulos de Clínica (Priority: P1)

Quien administra Roles y Permisos necesita que esta flexibilización no abra, ni por descuido, la
matriz de un role de Sistema a módulos de Clínica: debe seguir viendo y pudiendo marcar únicamente
módulos de Sistema, igual que hoy.

**Why this priority**: Es la salvaguarda que hace que la regla sea asimétrica y no una eliminación
lisa y llana del filtrado por tipo de la spec `014`; sin ella, cualquier role de Sistema podría
terminar mostrando, o dejando marcar, módulos y datos de clínicas.

**Independent Test**: Se puede probar por completo abriendo la matriz de un role de tipo Sistema y
comprobando que ningún módulo de tipo Clínica aparece entre sus filas, ni siquiera como fila no
marcable.

**Acceptance Scenarios**:

1. **Given** un role de tipo Sistema, **When** la persona abre su matriz de permisos, **Then** solo
   ve módulos de tipo Sistema entre sus filas; ningún módulo de tipo Clínica aparece.
2. **Given** un role de tipo Sistema, **When** se le asocia un permiso de un módulo de Sistema,
   **Then** la asociación se sigue aceptando exactamente igual que antes de esta feature.

### Edge Cases

- ¿Qué pasa si la persona no tiene permiso para leer el catálogo de módulos o permisos? Sigue el
  mismo comportamiento que ya describe la spec `014` (FR-020): la matriz señala puntualmente que no
  pudo construirse, sin afectar al resto del detalle del role.
- ¿Qué pasa si, entre que se carga la matriz y se guarda, el catálogo cambia de forma que una fila
  ofrecida deja de ser válida? El guardado rechaza puntualmente esa celda, igual que ya ocurre hoy
  ante cualquier conflicto de ese tipo; esta feature no cambia ese manejo.
- ¿Qué pasa con el contador "X de Y permisos" de un role de Clínica? Y crece para incluir también
  las filas de módulos de Sistema, igual que cualquier otra fila de la matriz.
- ¿Qué pasa con las filas de módulos de Clínica que un role de Clínica ya mostraba antes de esta
  feature? No cambian: esta feature solo añade un grupo de filas, nunca quita uno que ya existiera.
- ¿Qué pasa con el orden de las filas dentro de cada grupo, para un role de Clínica? El mismo orden
  que ya usa la tabla hoy (orden de módulo y luego nombre), aplicado dentro de cada grupo por
  separado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST incluir, en la matriz de permisos de un role de tipo Clínica, tanto
  los módulos de tipo Clínica como los de tipo Sistema, permitiendo marcar o desmarcar permisos de
  ambos grupos indistintamente.
- **FR-002**: El sistema MUST seguir incluyendo, en la matriz de permisos de un role de tipo
  Sistema, únicamente los módulos de tipo Sistema (sin cambios respecto al comportamiento anterior
  a esta feature).
- **FR-003**: Esta regla sustituye la redacción simétrica del FR-006 de la spec `014-roles-permisos`
  («la tabla de permisos DEBE incluir únicamente los módulos del mismo tipo que el role... y
  viceversa») por una asimétrica: un role de Sistema solo ve y recibe módulos de Sistema (sin
  cambio); un role de Clínica ve y recibe módulos de Sistema y de Clínica a la vez. El FR-006 de la
  spec `014` MUST actualizarse como parte del trabajo de esta feature para no contradecirla.
- **FR-004**: Dentro de la matriz de permisos de un role de tipo Clínica, el sistema MUST agrupar
  visualmente las filas de módulos de tipo Clínica y las de tipo Sistema en dos secciones
  diferenciadas, cada una identificada con su propio encabezado o etiqueta.
- **FR-005**: La matriz de permisos de un role de tipo Sistema MUST seguir mostrándose como una
  sola lista de filas, sin encabezados de grupo (sin cambios respecto al comportamiento anterior a
  esta feature).
- **FR-006**: Por cada módulo de la tabla, en cualquiera de los dos grupos de un role de Clínica, el
  sistema MUST seguir mostrando únicamente las acciones que ese módulo tiene disponibles, sin
  cambios respecto al FR-007 de la spec `014`.
- **FR-007**: El contador de "X de Y permisos" de un role de tipo Clínica MUST reflejar el total
  combinado de permisos disponibles de ambos grupos de módulos (Clínica y Sistema).
- **FR-008**: "Copiar permisos de" y "Duplicar" MUST seguir restringidos a un role de origen del
  mismo tipo que el role destino (sin cambios respecto a FR-012/FR-014 de la spec `014`); al ser
  siempre del mismo tipo, ambas operaciones ya trasladan los permisos de ambos grupos de un role de
  Clínica sin necesitar ningún comportamiento adicional.
- **FR-009**: El selector de tipo al crear un role MUST seguir sin cambios (Clínica o Sistema, fijo
  una vez creado el role), sin una tercera opción ni posibilidad de elegir ambos tipos a la vez.

### Key Entities

- **Módulo** (existente, spec `013`): sin cambios en su propio modelo; esta feature cambia solo qué
  módulos se ofrecen juntos en la matriz de un role, según el tipo del role.
- **Role** (existente, specs `002`/`006`/`014`): sin cambios en su propio modelo ni en que su tipo
  queda fijo desde que se crea.
- **Matriz de permisos** (existente, spec `014`, modificada aquí): pasa de mostrar siempre un único
  grupo de filas (las del mismo tipo que el role) a, en el caso de un role de Clínica, dos grupos
  diferenciados (Clínica y Sistema) bajo el mismo role; para un role de Sistema sigue siendo un
  único grupo, sin cambios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quien administra Roles y Permisos asocia un permiso de un módulo de Sistema a un role
  de Clínica en el mismo flujo y con el mismo resultado que ya usa para permisos de módulos de
  Clínica, sin pasos adicionales ni mensajes de error.
- **SC-002**: El 100% de los roles de tipo Sistema siguen mostrando y pudiendo recibir, después de
  esta feature, únicamente permisos de módulos de tipo Sistema.
- **SC-003**: Al abrir la matriz de un role de tipo Clínica con módulos de ambos tipos entre sus
  filas, el 100% de las personas que la revisan identifican a qué grupo (Clínica o Sistema)
  pertenece cada fila sin consultar ningún otro recurso.
- **SC-004**: Duplicar o usar "Copiar permisos de" sobre un role de Clínica que combina permisos de
  ambos tipos de módulo traslada el 100% de ellos al role nuevo, sin que ninguno se reporte como
  fallido por incompatibilidad de tipos.

## Assumptions

- El backend ya acepta estas asociaciones sin ningún cambio de contrato (confirmado contra la spec
  `015` de `mailySoft-usuarios`: la tabla de pares rol-módulo permitidos ya incluye (Clínica,
  Sistema) además de (Sistema, Sistema) y (Clínica, Clínica); el par (Sistema, Clínica) nunca se
  añade). Esta spec no depende de ningún cambio adicional de esa API y no repite su trabajo.
- El tipo de un role y el tipo de un módulo no cambian después de creados (reglas ya vigentes de
  las specs `002`, `008` y `013`); esta spec no contempla que uno de los dos cambie de tipo.
- El FR-006 de la spec `014-roles-permisos` queda desactualizado por esta feature y su texto MUST
  corregirse para dejar de describir la regla simétrica (ver FR-003).
- No se introduce una tercera combinación además de (Clínica, Sistema): el par (Sistema, Clínica)
  queda fuera de alcance de forma explícita y deliberada, igual que en la spec `015` del backend.
- A diferencia de la spec `015` del backend (que corrigió roles de Sistema con permisos de Clínica
  inválidos ya asociados), esta spec no incluye ninguna corrección de datos existentes: del lado
  del Backoffice no hay datos propios que limpiar, solo la lógica de qué módulos ofrece la matriz.
