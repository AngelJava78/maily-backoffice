# Feature Specification: Panel de Maily (Resumen de Solo Lectura)

**Feature Branch**: `007-dashboard`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Spec 007 – Panel de Maily (dashboard de solo lectura) en el backoffice." La descripción completa (contexto, comportamiento, configuración, alcance, fuera de alcance, restricciones y criterios de éxito) se recoge en esta especificación. Objetivo literal: "Quien entra al backoffice ve en la página de inicio, llamada ahora «Panel», un resumen de la plataforma que se mantiene actualizado. El panel es de solo lectura: desde él no se modifica nada."

## Clarifications

### Session 2026-10-20

- Q: La dirección del servicio del panel (`VITE_SUBSCRIPTIONS_API_URL`) es hoy opcional. Si un entorno no la define, ¿qué debe pasar con el Panel para quien tiene `dashboard:read`? → A (superada por la siguiente): la variable seguía opcional y el Panel mostraba un aviso de que los indicadores no estaban disponibles en ese entorno, sin consultar.
- Q: Al fusionarse la feature 003, `VITE_SUBSCRIPTIONS_API_URL` pasó a ser obligatoria (sin ella el backoffice no arranca). ¿Qué ocurre con la aclaración anterior? → A: Se acepta que es obligatoria: sin ella aparece la pantalla de configuración inválida, de modo que el Panel siempre tiene la dirección y el caso «entorno sin dirección» deja de existir. El Panel reutiliza la conexión con el servicio que creó la 003. Se descartó volver a hacerla opcional, porque cambiaría la decisión de la 003.
- Q: La spec quita el botón «Reintentar», pero la constitución (principios IV y VI) exige una acción de reintentar en los estados de error y su alcance del producto no menciona el Panel. ¿Cómo se resuelve? → A: Con una enmienda MINOR de la constitución (mediante `/speckit-constitution`): en las pantallas con actualización periódica, el reintento automático en el siguiente ciclo cuenta como la acción de reintentar, y el Panel entra en el alcance del producto. Se descartaron una excepción solo en Complexity Tracking (la constitución exige enmienda para las desviaciones permanentes) y añadir un botón «Reintentar».
- Q: Mientras se actualizan los datos que ya están en pantalla, ¿debe verse alguna señal de que se están actualizando? → A: Sí, una señal discreta junto a la hora de la última actualización («Actualizando…» o un indicador pequeño) mientras haya una consulta en curso con datos previos, tanto al entrar al Panel como en los ciclos automáticos. No mueve el foco ni se anuncia a los lectores de pantalla, y desaparece al terminar la consulta, salga bien o mal. Se descartaron mostrarla solo al entrar y no mostrar ninguna señal.
- Q: Una persona sin ningún permiso (ni secciones, ni herramientas, ni `dashboard:read`) llega al Panel. ¿Qué avisos ve? → A: El saludo y únicamente el aviso actual de que su role todavía no tiene permisos asignados, que ya explica que no puede ver nada; no ve además el aviso de los indicadores. Se descartaron mostrar los dos avisos y reemplazar el aviso actual por el de los indicadores.
- Q: ¿Cómo deben escribirse los números de los indicadores? → A: Con la convención del español de México: coma como separador de miles desde 4 cifras (1,284 y 12,840). Las fechas siguen con el formato actual del backoffice. Se descartaron el español genérico (1284 y «12 840») y escribirlos sin separador.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el resumen de la plataforma en el Panel (Priority: P1)

Una persona con acceso al backoffice y con el permiso `dashboard:read` entra al backoffice y, en la página principal, que ahora se llama «Panel», ve su saludo de siempre y, debajo, seis indicadores de la plataforma (clínicas totales, clínicas activas, clínicas en periodo de prueba, doctores, pacientes y usuarios) y la lista de las clínicas más recientes con su nombre, su estatus y su fecha de alta. Si algún dato no está disponible, lo ve marcado como tal sin que afecte a los demás.

**Why this priority**: Es el propósito de la feature: dar de un vistazo el estado de la plataforma a quien entra al backoffice, sin tener que recorrer cada sección.

**Independent Test**: Con una sesión cuyo role incluya `dashboard:read` y el servicio del panel disponible, abrir el backoffice y comprobar que la navegación, el encabezado de la página y el título de la pestaña dicen «Panel», que se ven el saludo, los seis indicadores con sus valores y las clínicas recientes, y la hora de la última actualización; repetir con respuestas que traigan valores no disponibles, ceros y una lista vacía.

**Acceptance Scenarios**:

1. **Given** una persona con acceso al backoffice, tenga o no `dashboard:read`, **When** entra a la dirección raíz del backoffice, **Then** la opción de la navegación, el encabezado principal de la página y el título de la pestaña dicen «Panel», y en ningún lugar dice «Inicio».
2. **Given** una persona con `dashboard:read`, **When** abre el Panel y la plataforma responde, **Then** ve su saludo y, debajo, los seis indicadores, cada uno con su etiqueta y su valor, y la hora de la última actualización correcta.
3. **Given** una persona con `dashboard:read`, **When** abre el Panel y la plataforma devuelve clínicas recientes, **Then** ve cada clínica con su nombre, su estatus y su fecha de alta en su hora local, en el orden en que llegan (de la más nueva a la más antigua), sin enlaces ni acciones sobre ellas.
4. **Given** una respuesta en la que un indicador no está disponible (por ejemplo, el de doctores), **When** la persona mira el Panel, **Then** ese indicador dice «No disponible» y los demás muestran su valor normalmente.
5. **Given** una respuesta en la que un indicador vale 0, **When** la persona mira el Panel, **Then** ese indicador muestra 0; y un indicador no disponible nunca muestra 0.
6. **Given** una respuesta con la lista de clínicas recientes vacía, **When** la persona mira el Panel, **Then** en lugar de la lista ve «Sin clínicas registradas».
7. **Given** una respuesta en la que la lista de clínicas recientes no está disponible, **When** la persona mira el Panel, **Then** la lista dice «No disponible» (y no «Sin clínicas registradas»).
8. **Given** el Panel con los indicadores en pantalla, **When** la persona revisa sus opciones, **Then** no existe ninguna acción para modificar datos, filtrar, paginar, ver gráficas, actualizar a mano o reintentar.
9. **Given** la plataforma devuelve cierta cantidad de clínicas recientes (su valor por defecto), **When** la persona mira el Panel, **Then** ve exactamente esa cantidad: el backoffice no pide ni recorta un número propio.
10. **Given** una persona que usa un lector de pantalla, **When** entra al Panel y lo recorre, **Then** el foco está en el encabezado «Panel», oye cada indicador con su etiqueta y su valor (incluido «No disponible») y, de cada clínica reciente, su nombre, su estatus y su fecha de alta.

---

### User Story 2 - Ver el Panel sin permiso para los indicadores (Priority: P1)

Una persona que entra al backoffice pero cuyo role no incluye `dashboard:read` ve igualmente el Panel, con su saludo y un aviso de que no tiene permiso para ver los indicadores; el backoffice no consulta los datos de la plataforma en su nombre. Si su role no tiene ningún permiso, sigue viendo el aviso actual de que su role no tiene permisos asignados.

**Why this priority**: El Panel es la página a la que llega todo el mundo; debe ser correcto y seguro para quien no tiene el permiso, y no debe pedir datos que la persona no puede ver.

**Independent Test**: Iniciar sesión con una persona sin `dashboard:read` y comprobar que ve el saludo y el aviso, que no se hace ninguna llamada al servicio del panel y que la navegación muestra «Panel»; repetir con una persona sin ningún permiso y con otra cuyo único permiso sea `dashboard:read`; quitar y dar el permiso durante una sesión y comprobar que el Panel cambia cuando el backoffice vuelve a comprobar el acceso.

**Acceptance Scenarios**:

1. **Given** una persona con permisos para alguna sección pero sin `dashboard:read`, **When** abre el Panel, **Then** ve su saludo y un aviso de que no tiene permiso para ver los indicadores, no ve indicadores ni clínicas y no se hace ninguna consulta al servicio del panel.
2. **Given** una persona sin permiso de consulta para ninguna sección, herramienta ni para los indicadores, **When** abre el Panel, **Then** ve su saludo y solo el aviso actual de que su role todavía no tiene permisos asignados (no el aviso de los indicadores), y no se hace ninguna consulta al servicio del panel.
3. **Given** una persona cuyo único permiso es `dashboard:read`, **When** abre el Panel, **Then** ve los indicadores y no ve el aviso de que su role no tiene permisos asignados.
4. **Given** una persona con `dashboard:read` en un role que no da acceso al backoffice y sin ese permiso en sus roles de tipo Sistema activos, **When** abre el Panel, **Then** se la trata como persona sin `dashboard:read`.
5. **Given** una persona con los indicadores en pantalla, **When** la comprobación periódica del acceso indica que ya no tiene `dashboard:read`, **Then** el Panel retira de inmediato los indicadores y los datos guardados de la sesión, muestra el aviso de que no tiene permiso para verlos y deja de consultar el servicio del panel.
6. **Given** una persona en el Panel sin `dashboard:read`, **When** la comprobación periódica del acceso indica que ahora lo tiene, **Then** el Panel consulta el servicio y muestra los indicadores sin que la persona tenga que salir y volver.
7. **Given** una persona con `dashboard:read` según la última comprobación del acceso, **When** el servicio del panel rechaza la consulta por falta de permiso, **Then** el Panel muestra el aviso de que no tiene permiso para ver los indicadores en lugar de ellos (y de los datos anteriores), la sesión permanece abierta, no recibe además avisos contradictorios o duplicados, y la comprobación periódica del acceso actualiza sus permisos.

---

### User Story 3 - Mantener el Panel actualizado sin intervenir (Priority: P2)

Mientras la persona tiene el Panel a la vista, los datos se actualizan solos cada cierto número de minutos (5 por defecto). Al volver al Panel desde otra sección, ve de inmediato los últimos datos de la sesión con su hora y, en cuanto llega la respuesta, los datos y la hora se renuevan. Fuera del Panel o con la pestaña oculta no se consulta nada.

**Why this priority**: Un resumen desactualizado puede inducir a error, pero consultar de más carga la plataforma y no aporta nada a quien no está mirando. El Panel ya es útil con la carga al entrar (User Story 1); esta historia lo mantiene vigente.

**Independent Test**: Con un intervalo de 5 minutos y un reloj controlado, abrir el Panel a las 10:02 y comprobar que la siguiente consulta ocurre a las 10:07; ocultar la pestaña y comprobar que no se consulta; volver antes y después de cumplirse el intervalo; ir a otra sección y volver, comprobando que se ven los datos anteriores con su hora hasta que llega la respuesta y que la hora cambia; entrar y salir rápidamente varias veces y comprobar que nunca hay dos consultas en curso.

**Acceptance Scenarios**:

1. **Given** la persona en el Panel con la pestaña visible y un intervalo de 5 minutos, **When** pasan 5 minutos desde la última consulta, **Then** el Panel consulta de nuevo mostrando la señal discreta de actualización, muestra los datos nuevos y actualiza la hora de la última actualización, sin mover el foco ni anunciar nada.
2. **Given** la persona entra al Panel a las 10:02 y la consulta sale bien, con un intervalo de 5 minutos, **When** permanece en el Panel con la pestaña visible, **Then** la siguiente consulta ocurre a las 10:07 y no antes.
3. **Given** la persona en otra sección o con la pestaña oculta, **When** pasa uno o varios intervalos, **Then** no se hace ninguna consulta al servicio del panel.
4. **Given** la persona ya vio el Panel en esta sesión y está en otra sección, **When** vuelve al Panel desde la navegación (aunque no haya pasado el intervalo), **Then** ve de inmediato los últimos datos con la hora de su última actualización y una señal discreta de que se están actualizando, se consulta el servicio y, al llegar la respuesta, los datos y la hora se renuevan y la señal desaparece.
5. **Given** la primera visita al Panel en la sesión, **When** la persona entra, **Then** ve un indicador de carga hasta que llega la respuesta.
6. **Given** la persona estuvo fuera del Panel más tiempo que el intervalo, **When** vuelve, **Then** sigue viendo los últimos datos de la sesión (no se perdieron) mientras llega la respuesta.
7. **Given** el Panel abierto con una última actualización correcta a las 10:02 y un intervalo de 5 minutos, **When** la persona oculta la pestaña a las 10:03 y vuelve a las 10:05, **Then** no se consulta al volver y la siguiente consulta ocurre a las 10:07.
8. **Given** el Panel abierto con una última actualización correcta a las 10:02 y un intervalo de 5 minutos, **When** la persona oculta la pestaña a las 10:03 y vuelve a las 10:10, **Then** se consulta al volver y la siguiente consulta automática ocurre 5 minutos después de esa consulta.
9. **Given** una consulta del Panel en curso, **When** la persona sale y vuelve a entrar al Panel varias veces antes de que termine, **Then** cada salida cancela la consulta en curso y cada entrada lanza una sola, de modo que nunca hay más de una en curso a la vez.
10. **Given** la persona cierra sesión, **When** ella u otra persona vuelve a iniciar sesión en el mismo navegador y abre el Panel, **Then** no se ve ningún dato de la sesión anterior: se muestra la carga hasta que llega la respuesta.

---

### User Story 4 - Seguir viendo los datos aunque una actualización falle (Priority: P2)

Si una actualización falla, la persona sigue viendo los últimos datos que tenía, con la hora de su última actualización y un aviso de que no se pudieron actualizar. Si es la primera carga de la sesión la que falla, ve un mensaje de error. En ambos casos el Panel vuelve a intentarlo solo en el siguiente ciclo automático.

**Why this priority**: Un fallo pasajero de la plataforma no debe dejar el Panel vacío ni hacer creer que los datos están al día. Depende de la actualización periódica (User Story 3) para reintentar.

**Independent Test**: Con el simulador de la plataforma, cargar el Panel correctamente y hacer fallar la siguiente consulta (error interno, servicio de permisos no disponible, error de red); comprobar que se mantienen los datos con su hora y aparece el aviso, anunciado a lectores de pantalla; dejar que el siguiente ciclo salga bien y comprobar que el aviso desaparece; repetir con la primera carga fallida.

**Acceptance Scenarios**:

1. **Given** el Panel con datos en pantalla, **When** una consulta automática falla, **Then** se mantienen los últimos datos con la hora de su última actualización correcta y aparece un aviso de que no se pudieron actualizar, anunciado a los lectores de pantalla.
2. **Given** la persona vuelve al Panel con datos de la sesión, **When** la consulta al entrar falla, **Then** se mantienen esos datos con su hora y aparece el mismo aviso.
3. **Given** la primera visita al Panel en la sesión, **When** la consulta falla, **Then** se muestra un mensaje de error en lugar de los indicadores, anunciado a los lectores de pantalla.
4. **Given** cualquiera de los fallos anteriores, **When** la persona busca cómo reintentar, **Then** no hay botón para actualizar ni para reintentar: el Panel vuelve a consultar en el siguiente ciclo automático.
5. **Given** un aviso de fallo en pantalla, **When** la siguiente consulta sale bien, **Then** el aviso desaparece y se muestran los datos nuevos con su hora.
6. **Given** el Panel abierto, **When** la consulta falla porque la plataforma no puede verificar el permiso por ahora, por un error interno, por un error de red o porque la respuesta no tiene el formato esperado, **Then** se muestra el aviso de fallo que corresponda (con datos previos o sin ellos) y nunca un mensaje técnico del servidor.
7. **Given** el Panel abierto, **When** la consulta se rechaza porque la sesión ya no es válida, **Then** se aplica el manejo de sesión existente: un intento de renovarla y, si no se puede, la pantalla de acceso, que devuelve al Panel tras identificarse.

---

### User Story 5 - Ajustar la frecuencia de actualización por entorno (Priority: P3)

Quien despliega el backoffice decide cada cuántos minutos se actualiza el Panel en cada entorno, entre 1 y 60, sin tocar el código. Si no lo indica, vale 5. Un valor mal escrito impide arrancar el backoffice y se informa de qué variable corregir.

**Why this priority**: El valor por defecto sirve para todos los entornos; poder ajustarlo es útil pero no imprescindible para que el Panel funcione.

**Independent Test**: Compilar el backoffice sin la variable y comprobar que el intervalo es de 5 minutos; con valores válidos (1, 30, 60) comprobar que se usa ese intervalo; con valores inválidos (0, 61, 2.5, «cinco», solo espacios) comprobar que aparece la pantalla de configuración inválida que nombra la variable y que el backoffice no arranca.

**Acceptance Scenarios**:

1. **Given** un backoffice compilado sin `VITE_DASHBOARD_REFRESH_MINUTES` (o con la variable vacía), **When** la persona está en el Panel, **Then** el Panel se actualiza cada 5 minutos.
2. **Given** un backoffice compilado con un entero entre 1 y 60, **When** la persona está en el Panel, **Then** el Panel se actualiza cada ese número de minutos.
3. **Given** un backoffice compilado con un valor fuera de rango, con decimales, con texto o con solo espacios, **When** se abre, **Then** se muestra la pantalla de configuración inválida, que nombra la variable sin repetir su valor, y el backoffice no arranca.
4. **Given** el backoffice desplegado, **When** se quiere cambiar la frecuencia, **Then** la documentación indica que hay que cambiar la variable, volver a compilar y desplegar.

---

### Edge Cases

- ¿Qué ocurre si los seis indicadores y la lista llegan no disponibles a la vez? Los seis dicen «No disponible» y la lista también; no se confunde con «Sin clínicas registradas» ni con ceros.
- ¿Qué ocurre si la respuesta de la plataforma no tiene el formato esperado (faltan campos, números negativos o con decimales, una clínica sin nombre o con una fecha no válida)? Se trata como una consulta fallida (User Story 4): se mantienen los datos previos, si los hay, y nunca se muestran datos a medias ni valores inventados.
- ¿Qué ocurre si los indicadores no cuadran entre sí (por ejemplo, activas más en prueba suman más que el total)? Se muestran tal como llegan: el backoffice no corrige ni valida reglas de negocio de la plataforma.
- ¿Qué ocurre con el estatus de una clínica? Se muestra el nombre del estatus tal como lo entrega la plataforma (por ejemplo, «Activa» o «En prueba»), sin traducirlo ni interpretarlo.
- ¿Qué ocurre con un nombre de clínica muy largo o un número muy grande? Se ajustan al espacio disponible sin recortarse ni desbordar la página.
- ¿Qué ocurre con una clínica dada de alta cerca de la medianoche UTC? Su fecha de alta se muestra en la hora local de la persona, aunque el día no coincida con el de UTC.
- ¿Qué ocurre si la última actualización correcta no fue hoy (por ejemplo, una sesión que cruza la medianoche)? La hora de la última actualización siempre incluye la fecha, así que nunca parece reciente (FR-009).
- ¿Qué ocurre si la pestaña está oculta cuando toca una consulta automática? No se consulta; al volver se aplica la regla de volver a la pestaña (escenarios 7 y 8 de la User Story 3). Lo mismo ocurre si el equipo se suspende y se reanuda.
- ¿Qué ocurre si la persona oculta la pestaña o sale del Panel mientras una consulta está en curso? Si oculta la pestaña, la consulta sigue y su resultado se usa. Si sale del Panel, la consulta se cancela (nadie la está viendo) y, al volver, se lanza la consulta de entrada (FR-018); nunca hay dos en curso a la vez (FR-021).
- ¿Qué ocurre si la persona entra y sale del Panel muchas veces seguidas? Nunca hay más de una consulta del Panel en curso a la vez.
- ¿Qué ocurre si la persona tiene el backoffice abierto en varias pestañas? Cada pestaña conserva sus propios datos y aplica sus propias reglas de actualización.
- ¿Qué ocurre al recargar la página del navegador? Los datos de la sesión, que solo viven en memoria, se pierden: el Panel se comporta como en la primera visita y muestra la carga.
- ¿Qué ocurre con el cierre por inactividad? Las actualizaciones automáticas no cuentan como actividad de la persona: no evitan ni retrasan el cierre de sesión por inactividad (feature 001). Al cerrarse la sesión por cualquier motivo, los datos se descartan.
- ¿Qué ocurre si fallan varias actualizaciones seguidas? Los datos previos siguen visibles con la hora de su última actualización correcta y el aviso permanece; el aviso se anuncia cuando aparece y no se repite en cada ciclo mientras siga visible.
- ¿Qué ocurre si la comprobación periódica del acceso no puede hacerse (el servicio de usuarios no responde)? Se conservan los últimos permisos conocidos, como en el resto del backoffice (feature 001), y el Panel sigue según ellos.
- ¿Qué ocurre si el servicio rechaza la consulta por falta de permiso pero la siguiente comprobación del acceso todavía incluye `dashboard:read`? El Panel mantiene el aviso de falta de permiso y no consulta durante esa visita; al volver a entrar al Panel, consulta de nuevo.
- ¿Qué ocurre si la persona llega al Panel porque perdió el permiso de otra sección? Se muestra el aviso habitual de que la sección ya no está disponible (feature 001) y el Panel se comporta según sus propios permisos.
- ¿Qué ocurre si no está configurada la dirección del servicio del panel? Desde la feature 003 es obligatoria: el backoffice no arranca y muestra la pantalla de configuración inválida, así que el Panel nunca funciona sin ella (ver Clarifications y FR-031).
- ¿Qué ocurre con los datos ficticios de la fase 1 del servicio? Se muestran como cualquier otro dato: la plataforma no indica que sean ficticios y el Panel no añade un aviso de «datos de ejemplo».

## Requirements *(mandatory)*

### Functional Requirements

**Nombre y navegación**

- **FR-001**: La página principal del backoffice (la dirección raíz, que no cambia) DEBE llamarse «Panel» en la navegación, en su encabezado principal y en el título de la pestaña del navegador; esos tres lugares NO DEBEN decir «Inicio».
- **FR-002**: El Panel DEBE aparecer en la navegación y estar disponible para toda persona con acceso al backoffice, tenga o no el permiso de los indicadores.
- **FR-003**: El Panel DEBE conservar el saludo con el nombre de la persona.

**Contenido con permiso**

- **FR-004**: Con el permiso `dashboard:read`, el Panel DEBE mostrar, debajo del saludo, seis indicadores con su etiqueta: clínicas totales, clínicas activas, clínicas en periodo de prueba, doctores, pacientes y usuarios, con los números en la convención del español de México (coma como separador de miles desde 4 cifras: 1,284 y 12,840).
- **FR-005**: Con el permiso `dashboard:read`, el Panel DEBE mostrar la lista de clínicas recientes con el nombre, el estatus y la fecha y hora de alta de cada una en la zona horaria local de la persona, en el orden en que las entrega la plataforma (de la más nueva a la más antigua). Las clínicas NO DEBEN ser enlaces ni ofrecer acciones.
- **FR-006**: El Panel NO DEBE pedir una cantidad concreta de clínicas recientes: DEBE mostrar todas las que la plataforma devuelva según su valor por defecto.
- **FR-007**: Un indicador, o la lista de clínicas recientes, cuyo valor no esté disponible DEBE mostrarse como «No disponible», sin afectar a los demás. Un valor no disponible NUNCA DEBE mostrarse como 0, y un 0 DEBE mostrarse como 0.
- **FR-008**: Una lista de clínicas recientes vacía DEBE mostrar «Sin clínicas registradas».
- **FR-009**: El Panel DEBE mostrar la fecha y la hora locales, con segundos, de la última actualización correcta (la fecha siempre, para que una actualización de otro día no parezca reciente). Mientras haya una consulta en curso y ya haya datos en pantalla, al entrar o en un ciclo automático, junto a esa hora DEBE verse una señal discreta de que los datos se están actualizando, que desaparece al terminar la consulta, salga bien o mal.
- **FR-010**: El Panel DEBE ser de solo lectura: NO DEBE ofrecer acciones que modifiquen datos, enlaces a clínicas, filtros, gráficas, paginación ni botones para actualizar o reintentar.

**Contenido sin permiso y cambios de permiso**

- **FR-011**: Sin el permiso `dashboard:read`, el Panel DEBE mostrar el saludo y un aviso de que la persona no tiene permiso para ver los indicadores, y NO DEBE hacer ninguna consulta al servicio del panel.
- **FR-012**: Si la persona no tiene permiso de consulta para ninguna sección, herramienta ni para los indicadores, el Panel DEBE mostrar, en lugar del aviso de FR-011, el aviso actual de que su role todavía no tiene permisos asignados. Quien solo tenga `dashboard:read` NO DEBE ver ese aviso.
- **FR-013**: Para decidir si la persona tiene `dashboard:read` DEBEN contar solo los permisos de sus roles activos que dan acceso al backoffice (feature 006).
- **FR-014**: Cuando la comprobación periódica del acceso cambie los permisos de la persona mientras está en el Panel, el Panel DEBE reflejarlo de inmediato: si pierde `dashboard:read`, DEBE retirar los indicadores y descartar los datos guardados de la sesión, mostrar el aviso de FR-011 (o el de FR-012) y dejar de consultar; si lo obtiene, DEBE consultar y mostrar los indicadores sin que la persona salga y vuelva.
- **FR-015**: Si el servicio del panel rechaza la consulta por falta de permiso, el Panel DEBE mostrar el aviso de FR-011 en lugar de los indicadores, descartar los datos anteriores, dejar de consultar durante esa visita y mantener la sesión abierta; los permisos se actualizan con la comprobación periódica del acceso. La persona NO DEBE recibir por ese rechazo avisos duplicados ni contradictorios.

**Actualización**

- **FR-016**: Mientras la persona está en el Panel y la pestaña está visible, el Panel DEBE consultar automáticamente el servicio cada intervalo configurado (FR-028).
- **FR-017**: Fuera del Panel o con la pestaña oculta NO DEBE hacerse ninguna consulta automática del Panel.
- **FR-018**: Al entrar al Panel desde cualquier otra pantalla del backoffice, el Panel DEBE consultar el servicio siempre, aunque no haya pasado el intervalo. Mientras llega la respuesta DEBE mostrar los últimos datos de la sesión con la hora de su última actualización y la señal de actualización de FR-009 o, si todavía no los hay, un indicador de carga.
- **FR-019**: Al volver a la pestaña con el Panel abierto, el Panel DEBE consultar solo si desde la última actualización correcta ya pasó el intervalo, o si todavía no hubo ninguna; en otro caso, la siguiente consulta automática ocurre cuando se cumpla el intervalo.
- **FR-020**: Cada consulta, automática o al entrar, DEBE reiniciar la cuenta del intervalo al terminar: la siguiente consulta automática ocurre un intervalo después (por ejemplo, si se entra a las 10:02 con 5 minutos, la siguiente es a las 10:07). Si la consulta salió bien, también DEBE actualizarse la hora de la última actualización correcta.
- **FR-021**: Nunca DEBE haber más de una consulta del Panel en curso: entrar y salir rápido NO DEBE lanzar consultas en paralelo. Al salir del Panel, la consulta en curso DEBE cancelarse; mientras se está en el Panel, una consulta que toca cuando ya hay otra en curso NO DEBE lanzar una segunda, sino esperar el resultado de la que ya está en curso.
- **FR-022**: Los últimos datos correctos DEBEN conservarse en memoria durante toda la sesión, aunque la persona esté fuera del Panel más tiempo que el intervalo, y DEBEN descartarse al cerrarse la sesión por cualquier motivo. NO DEBEN guardarse en el almacenamiento del navegador.
- **FR-023**: Las consultas automáticas NO DEBEN contar como actividad de la persona a efectos del cierre de sesión por inactividad.

**Fallos**

- **FR-024**: Si una consulta falla y ya había datos, el Panel DEBE mantener los últimos datos con la hora de su última actualización correcta y mostrar un aviso de que no se pudieron actualizar.
- **FR-025**: Si falla la primera carga de la sesión, el Panel DEBE mostrar un mensaje de error en lugar de los indicadores.
- **FR-026**: Tras un fallo, el Panel DEBE volver a consultar en el siguiente ciclo automático, sin botón de reintentar; cuando una consulta posterior sale bien, el aviso o el mensaje de error DEBE desaparecer.
- **FR-027**: El Panel DEBE tratar como fallo (FR-024 y FR-025) la imposibilidad del servicio de verificar el permiso, un error interno, un error de red o de tiempo agotado, un rechazo de datos de la solicitud y una respuesta que no cumpla el contrato; NUNCA DEBE mostrar mensajes técnicos del servidor. Una sesión no válida DEBE seguir el manejo de sesión existente (feature 001).

**Configuración**

- **FR-028**: El intervalo de actualización DEBE configurarse por entorno con `VITE_DASHBOARD_REFRESH_MINUTES`: un entero de 1 a 60 escrito solo con dígitos. Si la variable no está definida o está vacía, DEBE valer 5.
- **FR-029**: Un valor inválido de `VITE_DASHBOARD_REFRESH_MINUTES` (fuera de rango, con decimales, con texto, con signo o con solo espacios) DEBE impedir que el backoffice arranque y mostrar la pantalla de configuración inválida, que nombra la variable y la regla sin repetir el valor.
- **FR-030**: La variable DEBE documentarse en el modelo de configuración del proyecto y en el README, indicando su rango, su valor por defecto y que se fija al compilar (cambiarla exige volver a compilar y desplegar).
- **FR-031**: El Panel DEBE obtener los datos del servicio de la plataforma al que ya apunta la dirección configurada para suscripciones (`VITE_SUBSCRIPTIONS_API_URL`), sin una variable nueva; la credencial de la sesión DEBE enviarse solo a esa dirección y NUNCA DEBE mostrarse, registrarse ni guardarse. Esa dirección es obligatoria desde la feature 003: el Panel no añade reglas para un entorno sin ella.

**Accesibilidad**

- **FR-032**: Cada indicador DEBE tener un nombre accesible que asocie su etiqueta con su valor (incluido «No disponible»), y la lista de clínicas recientes DEBE poder recorrerse con lector de pantalla identificando el nombre, el estatus y la fecha de cada clínica.
- **FR-033**: Al entrar al Panel el foco DEBE ir a su encabezado principal, como en las demás páginas; las actualizaciones posteriores y la señal de actualización NO DEBEN mover el foco ni anunciarse.
- **FR-034**: El aviso de que no se pudieron actualizar los datos y el mensaje de error de la primera carga DEBEN anunciarse a los lectores de pantalla cuando aparecen, sin repetirse en cada ciclo mientras sigan visibles.

**Privacidad y documentación**

- **FR-035**: El Panel NO DEBE mostrar datos personales: solo los conteos y, de cada clínica reciente, su nombre, su estatus y su fecha de alta.
- **FR-036**: La documentación de la feature 001 DEBE registrar que la página principal pasó a llamarse «Panel» por esta feature.

### Key Entities *(include if feature involves data)*

- **Resumen de la plataforma**: lo que entrega el servicio del panel en cada consulta. Siete valores, siempre presentes: clínicas totales, clínicas activas, clínicas en periodo de prueba, doctores, pacientes, usuarios y clínicas recientes. Cada uno puede estar no disponible si su fuente falló; un 0 o una lista vacía significan que no hay datos.
- **Clínica reciente**: una de las clínicas dadas de alta más recientemente (hasta 10, de la más nueva a la más antigua). Tiene un identificador (no se muestra), un nombre, una fecha y hora de alta (en UTC) y un estatus.
- **Estatus de clínica**: identificador y nombre legible del estatus (por ejemplo, «Activa» o «En prueba»), definido por la plataforma.
- **Estado del Panel en la sesión**: los últimos datos correctos y la hora de su última actualización correcta. Vive en memoria mientras dura la sesión y se descarta al cerrarla.
- **Intervalo de actualización**: minutos entre consultas automáticas (1 a 60, 5 por defecto), fijado por entorno al compilar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de las pantallas verificadas, la navegación, el encabezado principal de la página raíz y el título de la pestaña dicen «Panel», y ninguno de ellos dice «Inicio».
- **SC-002**: Una persona con `dashboard:read` ve los seis indicadores y las clínicas recientes en menos de 3 segundos desde que abre el Panel por primera vez en la sesión, en el 95 % de las visitas con el servicio disponible.
- **SC-003**: En el 100 % de los casos probados sin `dashboard:read` (con otros permisos o sin ninguno), la persona ve el aviso que le corresponde y se hacen 0 consultas al servicio del panel.
- **SC-004**: Con el Panel visible, el número de consultas automáticas en una hora coincide con 60 dividido entre el intervalo configurado (redondeado hacia abajo), y con la pestaña oculta o fuera del Panel es 0.
- **SC-005**: En el 100 % de los regresos al Panel durante una sesión, la persona ve los datos anteriores con su hora y la señal de actualización, sin el indicador de carga de la primera visita, y, cuando llega la respuesta correcta, la hora de la última actualización cambia.
- **SC-006**: En el 100 % de los casos probados, un valor no disponible nunca se muestra como 0, y una actualización fallida nunca borra los datos que ya se mostraban.
- **SC-007**: Tras 10 entradas y salidas consecutivas y rápidas del Panel, nunca hay más de una consulta del Panel en curso a la vez.
- **SC-008**: En el 100 % de los valores inválidos probados para `VITE_DASHBOARD_REFRESH_MINUTES`, el backoffice no arranca y muestra la pantalla de configuración inválida con el nombre de la variable.
- **SC-009**: Tras cerrar sesión, 0 datos del Panel de la sesión anterior aparecen al iniciar una nueva, y 0 datos del Panel quedan en el almacenamiento del navegador en ningún momento.
- **SC-010**: El Panel no presenta violaciones en las verificaciones automáticas de accesibilidad en sus estados de carga, con datos, con valores no disponibles, sin permiso y con fallo; el 100 % de los avisos de fallo se anuncian a lectores de pantalla y ninguna actualización mueve el foco.

## Assumptions

- Requisito previo: la feature 006 debe estar integrada antes de implementar esta. Con ella, solo entran al backoffice quienes tienen al menos un role activo de tipo Sistema y solo cuentan los permisos de esos roles; los permisos llegan con la consulta de acceso de la propia persona al iniciar sesión y se vuelven a comprobar periódicamente (feature 001).
- El permiso `dashboard:read` se asigna o retira a los roles en la API de usuarios de MailySoft; hasta que se asigne, todas las personas verán el aviso de que no tienen permiso para ver los indicadores. El backoffice no compara nombres de role.
- Fuente de verdad del servicio del panel: el contrato de la spec `003-platform-dashboard` del repositorio `maily-system-api` (operación de consulta del resumen, siete campos que admiten «no disponible», hasta 10 clínicas recientes, cantidad por defecto del servicio de 5 si no se configura, errores 401, 403, 422, 503 y 500, y respuesta marcada como no almacenable en caché). Se documentará en `contracts/` durante la planeación. En la fase 1 el servicio devuelve datos ficticios y el contrato no cambia cuando existan las fuentes reales.
- El servicio del panel es el mismo que el de suscripciones (feature 003, ya integrada). El Panel reutiliza la conexión y la configuración que creó la 003: la dirección obligatoria y el intermediario de desarrollo. El servicio solo admite llamadas desde el navegador de los sitios de su lista configurada: cada entorno debe incluir el sitio del backoffice o usar un intermediario equivalente, como en la feature 003.
- Encabezado: la página muestra «Panel» como encabezado principal y el saludo debajo de él (el saludo deja de ser el encabezado principal); el foco al entrar va a ese encabezado.
- El enlace de la página "no encontrada" puede seguir diciendo «Ir al inicio»: es una expresión genérica, no el nombre de la página.
- Interpretación de "se reintenta en el siguiente ciclo automático": también una consulta fallida reinicia la cuenta del intervalo, de modo que un fallo no provoca consultas inmediatas en bucle; la regla de volver a la pestaña (FR-019) se mide siempre desde la última actualización correcta.
- `VITE_DASHBOARD_REFRESH_MINUTES` vacía (`VITE_DASHBOARD_REFRESH_MINUTES=`) se trata como no definida, igual que las demás variables opcionales del backoffice; un valor con solo espacios es inválido. Se acepta solo un entero escrito con dígitos, sin espacios, signos ni decimales.
- Formatos: los números siguen la convención del español de México (ver Clarifications y FR-004) y las fechas, el mismo formato de fecha y hora que el resto del backoffice, en la zona horaria del navegador.
- Fuera de alcance: cualquier escritura o acción desde el Panel; enlaces a clínicas (la sección Clínicas todavía no existe), filtros, gráficas y paginación; botones para actualizar o reintentar; cambios en `maily-system-api` o en la API de usuarios; un aviso de «datos de ejemplo»; un archivo de configuración en tiempo de ejecución; elegir desde el backoffice la cantidad de clínicas recientes.
- Gobernanza: la constitución 1.3.0 (2026-10-20) ya admite, en las pantallas de solo lectura con actualización periódica, el reintento automático del siguiente ciclo como la acción de reintentar de los principios IV y VI, define las condiciones de la actualización periódica (principio IV) e incluye el Panel en el alcance del producto. Esta spec define el intervalo y cuándo se consulta y cuándo no, como pide esa regla.
- Indicaciones del solicitante para el plan (restricciones de implementación, no requisitos de comportamiento): textos en el módulo único de mensajes; la página del Panel reemplaza el contenido de la página principal actual y conserva el saludo; cliente del servicio y esquema de validación de la respuesta que admita «no disponible» en los siete campos; consulta con la librería de estado de servidor del proyecto y reglas de FR-016 a FR-022 definidas de forma explícita, con un tiempo de vigencia de 30 s y el tiempo de retención por defecto; comprobar que el manejador global de rechazos por permiso de la aplicación encaja con FR-015; respetar el módulo de políticas, el registro de secciones, las guardas de capacidad y el manejo de errores existentes; entregar simulaciones de red y fábricas de prueba, pruebas unitarias y de integración (con y sin permiso, valores no disponibles, lista vacía, fallos con y sin datos previos, rechazo por permiso, entrar y volver al Panel, pestaña oculta y reinicio del intervalo) y una prueba de extremo a extremo.
