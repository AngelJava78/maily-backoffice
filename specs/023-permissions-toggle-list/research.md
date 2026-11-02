# Research: Permisos de un role como lista con botones de alternancia

**Feature**: `023-permissions-toggle-list` | **Date**: 2026-11-01

El spec no dejó ningún `[NEEDS CLARIFICATION]`; esta investigación decide **cómo** se construye y
fija los datos que el código actual ya conocía. Todo lo afirmado sobre MUI se verificó leyendo el
código de `@mui/material` 9.5.0 instalado, no de memoria.

## Hallazgos que condicionan el diseño

1. **Hoy la matriz es una tabla** (`PermissionsMatrix` + `PermissionsMatrixRow`, MUI `Table` y
   `Checkbox`), usada solo por `RoleDetailPanel`. Las reglas (Ver, «Todo el módulo», contador) ya
   viven en funciones puras (`schemas/permissionMatrix.ts`) y en `useEditablePermissionMatrix`, sin
   ninguna referencia a la tabla: el cambio es solo de componentes de presentación.
2. **El texto de ayuda de la matriz no se ve**: `messages.roles.detail.matrixHelper` solo se usa como
   `aria-label` de la `Table`. El spec (FR-014) lo corrige.
3. **`ToggleButtonGroup` de MUI 9.5.0 usa tabindex móvil (roving)**: el grupo entra con una sola parada
   de Tab y las flechas mueven el foco entre sus botones (`isRovingTabIndex: true` en su contexto).
4. **El estado pulsado por defecto es un tinte de apenas `selectedOpacity` (~8 %) de `text.primary`**
   (`ToggleButton.js`, estilo `.Mui-selected`). Es la señal que se ve en la 2.ª captura del usuario y
   no basta, por sí sola, para distinguir con claridad «concedido» de «no concedido».
5. **`selected` se puede pasar botón a botón**: en `ToggleButton`, `inProps` gana a lo que reparte el
   grupo, y `aria-pressed` sale de `selected`. El grupo no necesita `value` ni `onChange`.

## Decisiones

### D1 — Qué cambia y qué no

- **Decisión**: se reemplazan los dos componentes de presentación y se tocan los textos; no cambia
  ninguna función pura, hook de datos, esquema, API ni ruta. `PermissionsMatrix` →
  `PermissionsList`; `PermissionsMatrixRow` → `PermissionsListItem` (se renombran junto con sus
  pruebas; el esquema `permissionMatrix.ts` y `useEditablePermissionMatrix` conservan su nombre
  porque lo que representan sigue siendo una matriz módulo × acción).
- **Razón**: los nombres «Matrix/Row/Table» pasarían a mentir; el resto de la cadena (reglas, guardado
  parcial, aviso de cambios sin guardar, FR-007/SC-003 del spec) queda intacta y ya probada.
- **Alternativas**: conservar los nombres antiguos (se descarta: confunde a quien lea el código);
  renombrar también el esquema y el hook (se descarta: churn sin valor, rompe la trazabilidad con
  014/015).

### D2 — El control: `ToggleButtonGroup` no excluyente con `selected` por botón

- **Decisión**: por módulo, un `ToggleButtonGroup` (`size="small"`, sin `exclusive`) con un
  `ToggleButton` por acción disponible. Cada botón recibe `selected={cell.granted}` y
  `onClick={() => onToggle(key, !cell.granted)}`; `disabled={pending}` va en el grupo. El orden es
  `ACTION_KEYS` (Ver, Crear, Modificar, Eliminar) y solo se pintan las acciones con celda (FR-002).
- **Razón**: es el mismo componente que ya usan `ModulesFilters`, `PriceCycleToggle` y
  `ComparisonTypeFilter` (FR-012, sin dependencias nuevas). Controlar `selected` por botón evita el
  patrón `value` + `onChange` del grupo, que entrega el arreglo completo y obligaría a comparar contra
  el anterior para saber qué botón se pulsó; aquí la regla de Ver provoca cascadas, y la pura
  `withPermissionToggled(row, key, checked)` ya recibe exactamente (acción, nuevo valor).
- **Alternativas**: `Switch` (descartado: el usuario pidió *toggle buttons* y la captura de referencia
  son botones segmentados); `Checkbox` con aspecto de botón (descartado: sigue exponiendo `checkbox`,
  no `aria-pressed`, y reimplementa lo que MUI ya da); `value`/`onChange` del grupo (descartado, ver
  arriba).

### D3 — «Todo el módulo» como `ToggleButton` suelto, fuera del grupo

- **Decisión**: un `ToggleButton` independiente, a la derecha del grupo, con `selected={allGranted}`
  (todas las acciones presentes concedidas, igual que `allGranted` hoy) y `onClick` →
  `onToggleAll(!allGranted)`. Se oculta si el módulo no tiene ninguna acción.
- **Razón**: es otra clase de control (actúa sobre los demás); dentro del grupo entraría en el tabindex
  móvil y se leería como una acción más. Fuera del grupo tiene su propia parada de Tab, lo que
  además lo hace fácil de encontrar con teclado.
- **Alternativa**: quinto botón dentro del grupo (descartado: mezcla semánticas y el contador «X de Y»
  no debe contarlo, FR-004).

### D4 — Señal de «pulsado» sin depender del color: marca de verificación con hueco reservado

- **Decisión**: cada botón de la lista lleva una marca (`<Icon name="included" size="sm" decorative />`,
  la `Check` que el registro de iconos ya tiene) delante de la etiqueta, visible solo si está pulsado;
  en el estado sin pulsar el hueco se conserva (`visibility: hidden`) para que el botón no cambie de
  ancho y no desplace a sus vecinos al alternar. La marca es decorativa: el estado lo comunica
  `aria-pressed`. Un botón deshabilitado (sin permiso de edición o guardando) conserva su marca, de modo
  que «concedido» no se confunde con «no concedido» (FR-008).
- **Razón**: la constitución exige WCAG 2.1 AA (VI): 1.4.1 (no usar solo color) y 1.4.11 (contraste del
  indicador de estado). El tinte de ~8 % del hallazgo 4 no lo cumple con holgura; una marca sí. Cambia
  solo el estado pulsado, no la forma ni el tamaño (FR-012, SC-007 ya corregidos para decirlo).
- **Alternativas**: relleno sólido `primary` al pulsar (descartado: se aleja más de la apariencia de
  los filtros de la captura y compite con el botón «Nuevo role»); marca que aparece/desaparece sin
  reservar hueco (descartado: salto de ancho al pulsar, y la cascada de Ver mueve botones bajo el
  cursor); un icono distinto para cada estado (descartado: ruido ×N módulos).

### D5 — Estructura semántica: `List` de MUI, subencabezados por tipo y ayuda visible

- **Decisión**: `<List aria-label={label}>` con un `ListItem` por módulo; cuando hay más de un tipo de
  módulo (regla heredada de 015, `groupedByType`) un `ListSubheader` (`disableSticky`) con
  `moduleGroupHeader(tipo)` antes del primer módulo de cada tipo. El texto de ayuda se muestra a la
  vista encima de la lista (`Typography` secundario) y la lista lo referencia con `aria-describedby`
  (`useId`). `PermissionsList` recibe una prop `label` (el título «Permisos de X por módulo y
  acción») en lugar de conocer al role.
- **Razón**: es lo que el usuario pidió («en forma de lista») y la semántica nativa (`ul`/`li`) le da al
  lector de pantalla «lista de N elementos» sin ARIA a medida. La ayuda visible explica la regla de Ver
  que hoy solo se descubre por el efecto. Pasar `label` mantiene `PermissionsList` sin dependencia del
  role y deja a `RoleDetailPanel` en su tamaño actual (D9).
- **Alternativas**: tabla con botones (descartado: el usuario pidió lista); `dl`/`dt`/`dd` (descartado:
  los botones no son una definición); ayuda solo como `aria-label` (descartado: invisible, y un nombre
  accesible largo es mala práctica en una lista).

### D6 — Disposición: una línea por módulo que se reacomoda

- **Decisión**: cada `ListItem` es un contenedor flex con `flex-wrap`: nombre del módulo (ocupa el
  espacio sobrante, con ancho mínimo para que los botones de distintas filas arranquen alineados en
  escritorio), el grupo de acciones y, al final, «Todo el módulo» empujado a la derecha. En anchos
  pequeños el nombre queda en su propia línea y los botones debajo, sin desplazamiento horizontal
  (FR-013). Los módulos con menos acciones no dejan huecos (FR-002). Desaparece la lógica de
  «columna presente si algún módulo la tiene» (`columns` de la tabla): ya no hay columnas.
- **Razón**: un solo contenedor flex responde a FR-013 sin media queries a medida y elimina la prop
  `columns` y su cálculo.
- **Corrección tras medir en Chromium (implementación)**: a 320/375 px el grupo de cuatro botones con
  su marca medía 344 px y desbordaba la página. La disposición final: el grupo y «Todo el módulo»
  viajan en un contenedor propio (`flex-wrap`, `gap`) con `justify-content: space-between` en el
  elemento, de modo que si no caben junto al nombre bajan **todos** a la segunda línea, alineados a la
  izquierda (antes «Todo» caía solo en algunas filas); y bajo `sm` los botones usan relleno de 6 px,
  fuente de 12 px y una marca de 12 px, además de quitar el relleno lateral del elemento y del
  encabezado de grupo. Desde `sm` conservan el tamaño `small` de MUI. Resultado medido: sin
  desbordamiento de 320 a 1440 px, claro y oscuro.
- **Alternativas**: rejilla de cinco columnas fijas (descartado: dejaría huecos y botones vacíos
  contra FR-002); desbordamiento horizontal (descartado: FR-013).

### D7 — Textos (`shared/messages/es.ts`)

- **Decisión**: `roles.detail.columns` pasa a `roles.detail.actions` (`read/write/update/delete/
  allModule`; se retira `module`, que solo usaba la cabecera de la tabla); `matrixHelper` se
  reformula sin «marca» ni casillas («Activa lo que puede hacer en cada módulo. Para crear, modificar
  o eliminar también necesita Ver.»); `matrixError` y `form.copyFromHelper` dicen «lista» en lugar de
  «tabla» (FR-014). Las etiquetas Ver/Crear/Modificar/Eliminar/Todo el módulo no cambian.
- **Razón**: los textos van centralizados (constitución VI) y solo estos dos componentes usan
  `detail.columns`; el renombre es seguro y evita una clave que mienta. `matrixTitle` y
  `moduleGroupHeader` no cambian.
- **No se toca**: `modules.validation.createUpdateDeleteRequireRead` («marca también Ver»), que es de la
  feature de Módulos (fuera de alcance, FR-015).

### D8 — Reglas, guardado y estado de edición: sin cambios

- **Decisión**: `withPermissionToggled`, `withAllPermissionsToggled`, `countGranted`/`countTotal`,
  `useEditablePermissionMatrix` (sobrescrituras pendientes, `diff`, `reset`), `useSaveRoleDetail`, el
  aviso de cambios sin guardar y el guardado parcial no se modifican ni se vuelven a probar más allá
  de su prueba actual.
- **Razón**: FR-005, FR-007 y SC-003 piden *el mismo resultado*; la forma más segura de garantizarlo
  es no tocar esa lógica. La interfaz de los dos componentes nuevos conserva las firmas
  (`onToggle(moduleId, actionKey, checked)`, `onToggleAll(moduleId, checked)`).

### D9 — Límite de 250 líneas

- **Decisión**: `RoleDetailPanel.tsx` tiene 243 líneas; el cambio ahí es renombrar el componente y
  añadir la prop `label` (≈ +1 línea). La ayuda visible vive dentro de `PermissionsList`, no en el
  panel. Si el panel superase 250, se extrae el bloque «título + lista» a un componente pequeño.
- **Razón**: constitución I (> 250 líneas se divide o se justifica).

### D10 — Pruebas: migración, no reescritura

- **Decisión**: las consultas pasan de `getByRole('checkbox', { name })` + `toBeChecked()` a
  `getByRole('button', { name, pressed })` / `toHaveAttribute('aria-pressed', …)`; los nombres
  accesibles (`Ver de Pacientes`, `Todo el módulo de Pacientes`) se conservan a propósito para que el
  cambio de las aserciones sea mecánico. Archivos afectados (todos comprobados con búsqueda):
  - Unitarias de componentes: `PermissionsMatrix.test.tsx` → `PermissionsList.test.tsx` (se pierden los
    casos de «cabeceras de columna»; se añaden los de lista, encabezados de grupo, módulo sin
    acciones, marca visible/oculta), `PermissionsMatrixRow.test.tsx` → `PermissionsListItem.test.tsx`,
    `RoleDetailPanel.test.tsx` (7 consultas).
  - Pantalla: `RolesPage.test.tsx` (la prueba de teclado: con tabindex móvil se entra al grupo con Tab;
    se busca el primer elemento con `aria-pressed` y Espacio lo alterna; axe se mantiene).
  - Integración: `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` (19) y
    `duplicateRole.integration.test.tsx` (1).
  - E2E: `e2e/roles.spec.ts` (`getByRole('button', { name: 'Ver de Roles', pressed })`).
  - Sin cambios: pruebas de `permissionMatrix.ts` y `useEditablePermissionMatrix` (D8).
- **Riesgo comprobado**: ninguna prueba actual consulta botones por nombre parcial «Ver/Crear/
  Modificar/Eliminar/Todo», así que los botones nuevos no producen coincidencias múltiples en ellas.
- **Cobertura**: no baja; la capa que exige el 80 % (`api`, `schemas`, `policy`, `hooks`) no cambia.

### D11 — Verificación visual

- **Decisión**: las pruebas automatizadas no miden la disposición ni la apariencia; FR-012, FR-013 y
  SC-001/SC-007 se verifican a mano en `quickstart.md` (escritorio y 320 px, claro y oscuro) y SC-006
  con axe en `RolesPage.test.tsx`.
- **Razón**: en jsdom no hay layout; forzar aserciones de estilo sería frágil y no probaría lo que el
  spec pide.

## Sin investigación pendiente

- **Dependencias nuevas**: ninguna (`ToggleButton`/`ToggleButtonGroup` ya se usan en tres features).
- **Contratos con el backend**: ninguno nuevo ni modificado (los de `014-roles-permisos` y
  `015-clinic-roles-system-modules` siguen vigentes).
- **Seguridad y autorización**: sin cambios; `capabilities.canEdit` sigue decidiendo si los botones son
  operables, y la API sigue imponiendo la autorización real.
