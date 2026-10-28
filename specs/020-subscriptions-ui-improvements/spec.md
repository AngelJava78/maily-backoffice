# Feature Specification: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Feature Branch**: `020-subscriptions-ui-improvements`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Deseo cambios visuales en el Front.
1) http://localhost:5173/subscriptions/new
a. El límite de clínicas debe aparecer en la parte inferior, donde están los demás límites. Consultorios, Doctores, Asistentes, Pacientes nuevos al año.
b. Esa sección debe tener un título como aparece "Modulos incluidos" que diga "Límites"
2) http://localhost:5173/subscriptions
a) Debes agregar el tipo de suscripcion, el total de clínicas, consultorios, precio anual. El orden de las columnas es: Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual, Estatus.
3) http://localhost:5173/subscriptions?tab=comparison
a) Agregar un botón como "Mensual y Anual", pero para el filtrar también por tipo de suscripción "Individual/Empresarial". Se mantiene "Mensual y Anual".
b) En límites de la clínica deben aparecer, el límite de las clinicas.
c En modulos, en lugar de decir incluido y no incluido, pon iconos con palomita lo que si está incluído. Lo que no está incluido con X"

Esta feature extiende `003-manage-subscription-types`, `012-configure-subscription-plans`, `018-add-subscription-type` y `019-add-clinics-limit`, ya implementadas: reorganiza visualmente datos que esas features ya definen y ya expone la API (tipo de suscripción, límite de clínicas, límite de consultorios, precio anual, número de clínicas con el plan). No agrega ningún dato nuevo ni cambia ninguna regla de negocio ya definida; el único comportamiento nuevo es un filtro de presentación por tipo de suscripción en el Comparativo, que no persiste nada ni llama a una API distinta de la que ya se usa hoy en esa pantalla.

**Nota de terminología**: en el listado, «Clínicas» sigue siendo el número de clínicas que ya tienen la suscripción asignada (dato de solo lectura, feature 003), no el límite de clínicas. El límite de clínicas (`clinics_limit`, feature 019) es el dato que se agrega al Comparativo, con una etiqueta propia («Límite de clínicas») para no confundirse con la fila ya existente «Clínicas con el plan».

## Clarifications

### Session 2026-10-27

- Q: En el listado de suscripciones, que no tiene el control Mensual/Anual, ¿qué precio determina el orden ascendente con el que se muestran las suscripciones? → A: El precio mensual; en el Comparativo, el orden sigue el precio del ciclo (mensual o anual) que esté seleccionado en cada momento con el control «Mensual y Anual».
- Q: En el Comparativo, ¿en qué orden deben aparecer el filtro de tipo (Individual/Empresarial) y el control «Mensual y Anual»? → A: Primero el filtro de tipo, luego el control «Mensual y Anual».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Los límites de la clínica se ven agrupados en el alta y la edición (Priority: P1)

Un operador que da de alta o modifica una suscripción ve el límite de clínicas junto con los demás límites de la clínica (consultorios, doctores, asistentes, pacientes nuevos al año), agrupados en una sola sección con un título, en vez de ver el límite de clínicas separado cerca del tipo de suscripción, al principio del formulario.

**Why this priority**: Es el cambio que más confunde hoy: el límite de clínicas aparece lejos de los demás límites, como si fuera un dato distinto, cuando en realidad pertenece al mismo grupo.

**Independent Test**: Abrir el alta de una suscripción y comprobar que el límite de clínicas aparece en la misma sección que consultorios, doctores, asistentes y pacientes nuevos al año, bajo un título «Límites»; abrir la edición de una suscripción existente y comprobar lo mismo.

**Acceptance Scenarios**:

1. **Given** el formulario de alta, **When** el operador se desplaza hasta la parte inferior, **Then** ve una sola sección titulada «Límites» que contiene el límite de clínicas junto con consultorios, doctores, asistentes y pacientes nuevos al año.
2. **Given** esa sección, **When** el operador compara su título con el de la sección «Módulos incluidos», **Then** ambos títulos tienen la misma apariencia (tamaño, peso y ubicación respecto a sus campos).
3. **Given** el formulario de alta con el tipo en Individual, **When** el operador ve la sección «Límites», **Then** el límite de clínicas sigue mostrando 1, deshabilitado, con el mismo comportamiento ya definido en la feature 019; solo cambió de lugar.
4. **Given** el formulario de alta con el tipo en Empresarial, **When** el operador escribe un límite de clínicas válido junto con el resto de los límites y guarda, **Then** la suscripción se crea con todos esos valores, igual que antes del cambio de ubicación.
5. **Given** el formulario de edición de una suscripción, **When** el operador lo abre, **Then** ve la misma sección «Límites» con el límite de clínicas ya agrupado, con el mismo comportamiento de solo lectura o edición que ya aplica según el tipo de la suscripción.

---

### User Story 2 - El listado de suscripciones muestra tipo, clínicas, consultorios y precio anual (Priority: P2)

Un operador que revisa el listado de suscripciones ve, para cada una, su tipo, el número de clínicas que la usan, su límite de consultorios y su precio anual, además de los datos que ya veía, en un orden fijo de columnas.

**Why this priority**: Hoy el operador tiene que entrar al detalle de cada suscripción para conocer su tipo o su precio anual; verlo en el listado ahorra esa navegación para la tarea más frecuente (comparar suscripciones de un vistazo).

**Independent Test**: Abrir el listado de suscripciones y comprobar que muestra, en este orden, las columnas Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual y Estatus, con datos correctos para al menos una suscripción Individual y una Empresarial, ordenadas de menor a mayor precio mensual.

**Acceptance Scenarios**:

1. **Given** el listado de suscripciones, **When** el operador lo abre, **Then** ve las columnas Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual y Estatus, en ese orden, de izquierda a derecha.
2. **Given** el listado de suscripciones, **When** el operador lo abre, **Then** las filas aparecen ordenadas de menor a mayor precio mensual; el operador puede reordenarlas por cualquier otra columna, incluida Precio anual, con el mismo mecanismo de ordenamiento que la grilla ya ofrece.
3. **Given** una suscripción Individual en el listado, **When** el operador ve su fila, **Then** la columna Tipo muestra «Individual».
4. **Given** una suscripción Empresarial en el listado, **When** el operador ve su fila, **Then** la columna Tipo muestra «Empresarial».
5. **Given** una suscripción con clínicas que ya la usan, **When** el operador ve su fila, **Then** la columna Clínicas muestra ese número, igual que ya lo hace hoy.
6. **Given** una suscripción con un límite de consultorios y un precio anual definidos, **When** el operador ve su fila, **Then** las columnas Consultorios y Precio anual muestran esos valores, el precio anual con el mismo formato de moneda que ya usa Precio mensual.

---

### User Story 3 - El Comparativo se filtra también por tipo de suscripción (Priority: P3)

Un operador que usa el Comparativo de suscripciones puede, además de alternar entre precio mensual y anual con el control que ya existe, filtrar qué planes se comparan según sean de tipo Individual o Empresarial.

**Why this priority**: El Comparativo mezcla hoy planes Individuales y Empresariales en la misma tabla, que no siempre son comparables entre sí para la persona que los revisa; poder acotar por tipo hace la comparación más útil sin quitar la vista completa cuando se necesita.

**Independent Test**: Abrir el Comparativo, comprobar que el filtro de tipo aparece antes que el control «Mensual y Anual»; activar el filtro de tipo en Individual y comprobar que solo se muestran planes Individuales, ordenados de menor a mayor precio; cambiarlo a Empresarial y comprobar que solo se muestran planes Empresariales; comprobar que el control «Mensual y Anual» sigue funcionando igual que antes, sin verse afectado por el nuevo filtro.

**Acceptance Scenarios**:

1. **Given** el Comparativo, **When** el operador lo abre, **Then** ve primero el control nuevo para elegir entre Individual y Empresarial y, a continuación, el control «Mensual y Anual» ya existente, en ese orden, ambos con el mismo patrón visual.
2. **Given** el Comparativo con el filtro en Individual, **When** el operador lo ve, **Then** la tabla solo muestra planes de tipo Individual.
3. **Given** el Comparativo con el filtro en Empresarial, **When** el operador lo ve, **Then** la tabla solo muestra planes de tipo Empresarial.
4. **Given** el Comparativo, **When** el operador cambia el filtro de tipo, **Then** la tabla se actualiza de inmediato, sin recargar la página y sin cambiar la selección vigente de Mensual/Anual.
5. **Given** el Comparativo con el filtro en un tipo que no tiene ningún plan, **When** el operador lo ve, **Then** la tabla muestra un aviso de que no hay planes de ese tipo, sin romper el resto de la pantalla.
6. **Given** el Comparativo con el ciclo en Mensual, **When** el operador lo ve, **Then** los planes comparados aparecen ordenados de menor a mayor precio mensual; **When** cambia el ciclo a Anual, **Then** se reordenan de menor a mayor precio anual.

---

### User Story 4 - El Comparativo muestra el límite de clínicas y usa iconos para los módulos (Priority: P4)

Un operador que usa el Comparativo ve, en la sección de límites de la clínica, el límite de clínicas de cada plan junto con los demás límites; y en la sección de módulos, ve de un vistazo, con un icono, qué módulos incluye cada plan y cuáles no, en vez de tener que leer las palabras «Incluido» y «No incluido» en cada celda.

**Why this priority**: Son dos mejoras de lectura rápida sobre una tabla que ya existe; no cambian ningún dato ni agregan una columna o fila nueva de otro tipo, por eso tienen la prioridad más baja de las cuatro.

**Independent Test**: Abrir el Comparativo y comprobar que la sección «Límites de la clínica» incluye una fila con el límite de clínicas de cada plan; comprobar que la sección «Módulos» muestra un icono reconocible de inclusión o no inclusión en cada celda, en vez del texto «Incluido»/«No incluido».

**Acceptance Scenarios**:

1. **Given** el Comparativo, **When** el operador ve la sección «Límites de la clínica», **Then** encuentra una fila con el límite de clínicas de cada plan, junto a consultorios, doctores, asistentes y pacientes nuevos al año.
2. **Given** un plan Empresarial con límite de clínicas guardado, **When** el operador ve esa fila, **Then** la celda muestra ese número.
3. **Given** la sección «Módulos» del Comparativo, **When** el operador ve un módulo incluido en un plan, **Then** la celda muestra un icono que se reconoce como afirmativo (equivalente a una palomita), sin el texto «Incluido».
4. **Given** la sección «Módulos» del Comparativo, **When** el operador ve un módulo no incluido en un plan, **Then** la celda muestra un icono que se reconoce como negativo (equivalente a una X), sin el texto «No incluido».
5. **Given** cualquiera de esos iconos, **When** se usa un lector de pantalla, **Then** anuncia si el módulo está incluido o no incluido, con un texto equivalente al que antes se leía.

---

### Edge Cases

- ¿Qué pasa si una suscripción no tiene límite de clínicas guardado (suscripciones en transición, feature 019)? El listado y el Comparativo muestran «No disponible», igual que ya ocurre hoy en el detalle.
- ¿Qué pasa si una suscripción no tiene precio anual definido? La columna Precio anual del listado y la fila correspondiente del Comparativo muestran «No disponible», con el mismo criterio que ya se usa para otros datos faltantes.
- ¿Qué pasa si el filtro de tipo del Comparativo no tiene ningún plan de ese tipo? Se muestra un aviso de que no hay planes de ese tipo, sin dejar la pantalla en blanco ni romper el resto del Comparativo (ver User Story 3, escenario 5).
- ¿Qué pasa con las siete columnas del listado en una ventana angosta? El listado permite desplazamiento horizontal dentro de la grilla, igual que ya ocurre hoy si las columnas no caben en el ancho disponible.
- ¿Qué pasa con un módulo que nunca aplica a un plan (por ejemplo, uno exclusivo de Empresarial en un plan Individual)? Sigue mostrando el icono de «no incluido», con el mismo criterio que hoy usaba el texto «No incluido»: no cambia ninguna regla de qué módulo corresponde a qué plan, solo su presentación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El formulario de alta y el de edición de suscripción DEBEN mostrar el límite de clínicas agrupado en la misma sección que los límites de consultorios, doctores, asistentes y pacientes nuevos al año, ubicada en la parte inferior del formulario, en el lugar donde hoy aparecen esos cuatro límites.
- **FR-002**: Esa sección DEBE tener el título «Límites», con el mismo patrón visual (tipografía, tamaño y peso) que ya usa el título «Módulos incluidos».
- **FR-003**: Mover el límite de clínicas a esta sección es un cambio exclusivamente de ubicación visual: NO DEBE alterar ninguna de las reglas ya definidas en la feature 019 (fijo en 1 y deshabilitado para Individual; editable de 1 a 100 para Empresarial, con su valor inicial, validaciones y mensajes de error).
- **FR-004**: El listado de suscripciones DEBE mostrar las columnas Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual y Estatus, en ese orden exacto.
- **FR-005**: La columna Tipo DEBE mostrar el tipo de la suscripción (Individual o Empresarial). La columna Consultorios DEBE mostrar el límite de consultorios de la suscripción. La columna Precio anual DEBE mostrar el precio anual con el mismo formato de moneda que ya usa Precio mensual. La columna Clínicas conserva su comportamiento actual (número de clínicas que ya tienen la suscripción asignada) y solo cambia de posición.
- **FR-006**: El listado de suscripciones DEBE mostrarse ordenado, al abrirse, de menor a mayor precio mensual; el operador DEBE poder reordenarlo por cualquier otra columna, incluida Precio anual, con el mismo mecanismo de ordenamiento que la grilla ya ofrece hoy.
- **FR-007**: El Comparativo DEBE ofrecer un control para filtrar los planes comparados por tipo de suscripción (Individual o Empresarial), con el mismo patrón visual que ya usa el control «Mensual y Anual», sin reemplazarlo ni alterar su comportamiento. Ese control DEBE ubicarse antes que el control «Mensual y Anual», de modo que el operador elija primero el tipo y luego el ciclo de precio.
- **FR-008**: Al elegir un tipo en ese filtro, el Comparativo DEBE mostrar únicamente los planes de ese tipo, actualizándose de inmediato sin recargar la página; al no haber ningún plan de ese tipo, DEBE mostrar un aviso en vez de una tabla vacía sin explicación.
- **FR-009**: El Comparativo DEBE mostrar los planes comparados ordenados de menor a mayor precio del ciclo vigente (mensual o anual, según el control «Mensual y Anual»); al cambiar el ciclo, el orden DEBE recalcularse con el nuevo precio.
- **FR-010**: La sección «Límites de la clínica» del Comparativo DEBE incluir una fila con el límite de clínicas de cada plan, junto a consultorios, doctores, asistentes y pacientes nuevos al año.
- **FR-011**: En la sección «Módulos» del Comparativo, cada módulo DEBE mostrarse con un icono que indique si está incluido o no incluido en el plan, en lugar del texto «Incluido»/«No incluido»; el icono DEBE tener un texto accesible equivalente para lectores de pantalla, siguiendo el principio VI de la constitución (WCAG 2.1 AA).
- **FR-012**: Cuando el límite de clínicas o el precio anual de una suscripción no estén disponibles, el listado y el Comparativo DEBEN mostrar «No disponible» en lugar del dato, con el mismo criterio ya usado en el detalle (feature 019).
- **FR-013**: Todos los textos, etiquetas y mensajes nuevos de esta función DEBEN estar en español, siguiendo el mismo patrón ya exigido en las features anteriores de suscripciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los formularios de alta y edición muestran el límite de clínicas agrupado bajo el título «Límites», junto con los demás límites de la clínica.
- **SC-002**: El listado de suscripciones muestra las siete columnas pedidas, en el orden exacto, para el 100 % de las suscripciones listadas, ordenadas de menor a mayor precio mensual al abrirse.
- **SC-003**: Un operador filtra el Comparativo por tipo de suscripción y ve el resultado actualizado en menos de 1 segundo, sin recargar la página.
- **SC-004**: El 100 % de las celdas de la sección «Módulos» del Comparativo muestran un icono de inclusión o no inclusión, sin el texto «Incluido»/«No incluido».
- **SC-005**: El 100 % de las filas de «Límites de la clínica» en el Comparativo incluyen el límite de clínicas del plan correspondiente.
- **SC-006**: En el Comparativo, el control de tipo de suscripción aparece antes que el control «Mensual y Anual» en el 100 % de las cargas de la pantalla, y los planes mostrados quedan ordenados de menor a mayor precio del ciclo vigente.

## Assumptions

- Dependencia: extiende las features 003-manage-subscription-types, 012-configure-subscription-plans, 018-add-subscription-type y 019-add-clinics-limit, ya implementadas; todos los datos que esta feature reorganiza visualmente (tipo, límite de clínicas, límite de consultorios, precio anual, número de clínicas con el plan) ya existen y ya los expone la API que el Backoffice consume hoy.
- Terminología: en el listado, «Clínicas» es y sigue siendo el número de clínicas que ya tienen la suscripción asignada (feature 003), no el límite de clínicas; por eso el pedido de agregar «el total de clínicas» se interpreta como reordenar esa columna ya existente, no como agregar un dato nuevo. El límite de clínicas (feature 019) se agrega únicamente al Comparativo, con una etiqueta propia para no confundirse con esa columna.
- Dentro de la nueva sección «Límites» del formulario, el límite de clínicas se ubica primero, seguido de Consultorios, Doctores, Asistentes y Pacientes nuevos al año, que conservan su orden actual entre sí.
- El filtro de tipo del Comparativo es un control exclusivo de dos opciones (Individual / Empresarial), con el mismo patrón visual y de comportamiento que el control «Mensual y Anual»; al abrir el Comparativo, el filtro inicia en Individual, el tipo por defecto del sistema (feature 018).
- Orden ascendente por precio: en el listado, el precio mensual es el criterio de orden al abrirse (la grilla ya permite reordenar por cualquier columna, como hoy); en el Comparativo, que no es una grilla reordenable por el operador, el orden de los planes lo determina siempre el precio del ciclo vigente (mensual o anual, según el control «Mensual y Anual»), sin un control de orden independiente.
- El icono de inclusión/no inclusión en Módulos sigue el mismo sistema de iconos ya usado en el resto del Backoffice, con un icono distinto para cada estado y su texto accesible equivalente para lectores de pantalla; no se introduce una librería de iconos nueva.
- Esta feature es puramente visual/de presentación: no agrega datos nuevos, no cambia ninguna regla de negocio ya definida (límite de clínicas, tipo de suscripción, precios, módulos incluidos por plan), y no agrega ni modifica ninguna llamada a las APIs ya usadas por estas pantallas.
- Fuera de alcance: cualquier cambio a las reglas de negocio ya definidas; agregar o quitar columnas del listado más allá de las pedidas; un tercer tipo de suscripción en el filtro del Comparativo; exportar, imprimir o descargar el listado o el Comparativo; y cualquier cambio al formulario de alta/edición que no sea la reubicación del límite de clínicas descrita aquí.
- Pruebas: en la fase de especificación no se escriben ni se ejecutan pruebas; se escribirán y ejecutarán en `/speckit-implement`, como exige el principio VII de la constitución.
- Restricciones: la feature respeta la constitución v1.7.0 y el stack ya definido (MUI, MUI X Data Grid, el sistema de iconos único en `src/shared/ui/Icon.tsx`); no introduce tecnologías ni dependencias nuevas.
