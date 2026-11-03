# Research: Módulos y submódulos en árbol jerárquico

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-02

Cada decisión tiene la forma Decisión / Razón / Alternativas. Las preguntas abiertas del plan eran
cuatro: cómo se arma y se dibuja el árbol (D1 a D6), cómo se elige el padre en los formularios (D7 a
D10), qué hacer con los errores y con los bloqueos y eliminaciones (D11 a D13) y cómo se simula la API
nueva en las pruebas (D14 a D16). No quedó ningún `NEEDS CLARIFICATION`.

## Hallazgos de la lectura del código y del contrato

1. **La API ya está lista.** `mailySoft-usuarios` tiene el commit `2e17ecb` (versión 5.4.0, 91 de 91
   tareas, árbol de trabajo limpio). El contrato que importa está en su
   `specs/017-module-submodules/contracts/` (`openapi-changes.md`, `error-catalog.md`); su resumen para
   el Backoffice está en [contracts/modules-service-changes.md](contracts/modules-service-changes.md).
2. **`GET /modules` ya entrega todo lo necesario en una sola consulta**: módulos de primer nivel y
   submódulos juntos, cada uno con `parent_module` (`null` o `{ id, key, name }`), ordenados por
   `sort_order` y `name`. No hay que pedir los hijos de cada padre (`parent_module_id` y `top_level`
   existen, pero no hacen falta).
3. **Disponibilidad**: un submódulo cuyo padre está Bloqueado no aparece entre los Activos, y entre los
   Bloqueados solo si él mismo lo está. Por eso, en la vista «Bloqueados», un submódulo bloqueado puede
   tener un padre Activo que **no viene en esa respuesta**: de ahí la fila de contexto (D3).
4. **La lista no se pagina** y el contrato la acota en unos 200 módulos y submódulos activos juntos
   (la 013 asumía 100). El desvío de la constitución (principio IV) que la 013 ya justificó sigue
   valiendo (D17).
5. **`ModuleEditPanel.tsx` tiene 244 de 250 líneas permitidas** (constitución I). Cualquier campo nuevo
   obliga a extraer piezas (D10).
6. **Las otras pantallas no se enteran del campo nuevo**: `features/roles` (`modulesApi.ts`) y
   `features/subscriptions` (`clinicModulesApi.ts`) validan con `z.object` no estricto, que descarta
   los campos que no declara; siguen mostrando los módulos, submódulos incluidos, como una lista plana
   (FR-019) sin tocar una línea.
7. **MUI X Data Grid (community) no tiene datos en árbol** (es una función de pago, Pro) y la pantalla
   ya usa `Table` por esa razón y por su disposición en grupos (013, D7). Se mantiene `Table`.
8. **El icono de «expandir» ya existe**: `arrow-drop-down` (`ChevronDown`) en el registro único; un giro
   de 90° con `sx` indica «contraído». No se añade ningún icono.
9. **`React Compiler` está en uso** (comentarios del código lo citan): el código nuevo no usa
   `useMemo` ni `useCallback`; calcula en el render.

## D1. Dónde se arma el árbol: en el cliente, con una función pura sobre la consulta de siempre

**Decisión**: `policy/buildModuleTree.ts` recibe la lista ya cargada (`SystemModule[]`) más el filtro de
tipo y la búsqueda, y devuelve los grupos con sus nodos. No hay consultas nuevas, ni claves de
consulta nuevas (`moduleKeys` no cambia).

**Razón**: la consulta ya trae `parent_module` en cada módulo (hallazgo 2), el catálogo es chico y
acotado, y las reglas de qué se ve (búsqueda, contexto, orden) son lógica pura que se prueba sin
renderizar. Es el mismo patrón que `filterModules` (que esta función absorbe, D2).

**Alternativas**: pedir a la API los hijos de cada padre con `parent_module_id` — N+1 consultas y sin
ninguna ventaja; pedir solo `top_level=true` y luego los hijos — igual; usar un estado de servidor
distinto para el árbol — duplicaría datos remotos (constitución III).

## D2. El modelo de dominio gana `parentModule`, obligatorio y anulable; `filterModules` se absorbe

**Decisión**: `systemModuleSchema` declara `parent_module` como `{ id, key, name } | null`, **requerido**
(sin `.optional()`), y lo convierte a `parentModule: ParentModuleRef | null`. `filterModules.ts` y su
prueba desaparecen: su lógica (tipo y búsqueda) pasa a `buildModuleTree`, donde la búsqueda ya no
puede ser un filtro plano porque debe conservar a los padres.

**Razón**: el contrato dice «obligatorio y anulable» y la constitución (II) pide que un desvío del
contrato sea un error explícito y no un fallo silencioso. El costo es un orden de despliegue (primero el
servicio, luego el Backoffice), ya anotado en el spec. Todos los datos de prueba del módulo deben
llevar `parent_module` (D15).

**Alternativas**: `parent_module` opcional con `null` por omisión — el Backoffice funcionaría contra la
5.3.0 sin avisar de que falta la jerarquía; se descarta porque esconde justo lo que esta feature
necesita. Mantener `filterModules` y filtrar encima — la búsqueda tendría que reinventar a los padres.

## D3. Modelo de filas: módulo, submódulo y fila de contexto

**Decisión**: el árbol se compone de nodos con tres clases de fila (detalle en
[data-model.md](data-model.md)):

- `module`: un módulo de primer nivel, con su cantidad de submódulos.
- `submodule`: un módulo con padre, a un nivel de sangría de su padre.
- `context`: la fila atenuada de un padre que no forma parte de la vista, con dos motivos:
  `otherView` (el padre no está en la respuesta: FR-009) y `search` (el padre está en la vista pero no
  coincide con la búsqueda y solo se muestra para ubicar a su submódulo que sí coincide: FR-008).
  Se arma con el `parent_module` del propio submódulo cuando el padre no está cargado, de modo que no
  hace falta ninguna consulta para dibujarla.

Los grupos por tipo se conservan (Sistema primero) y cada grupo cuenta, por separado, los módulos y
los submódulos reales; las filas de contexto no se cuentan (FR-007).

**Razón**: una sola representación para «mostrar el padre solo para ubicar» evita dos mecanismos
casi iguales. El submódulo y su padre son siempre del mismo tipo, así que filtrar por tipo nunca los
separa (spec, casos límite).

**Orden**: primer nivel y hermanos por `sortOrder` y luego por nombre (FR-005); una fila de contexto
`otherView` se ordena entre los de primer nivel por el menor `sortOrder` de sus submódulos a la vista,
porque la referencia al padre no trae su propio orden.

**Datos inesperados** (spec): un submódulo cuyo padre es a su vez submódulo se muestra bajo su padre
directo, a la profundidad que corresponda; el armado es recursivo y, si algún módulo no queda colocado
(un ciclo que el servicio no permite), se agrega al final como de primer nivel para no perderlo.

**Alternativas**: dos clases de fila de contexto distintas — el mismo dibujo con dos nombres; ordenar
la fila de contexto por nombre — el padre quedaría lejos de los de su orden natural sin razón.

## D4. Textos de los contadores y de los encabezados

**Decisión**: sin submódulos, el texto es el de hoy (con la concordancia corregida:
«1 módulo activo»); con submódulos: «12 módulos y 5 submódulos activos» / «… bloqueados». El
encabezado de un grupo: «Clínica, aplicación para clínicas · 9 módulos y 4 submódulos» (sin la
segunda parte si no hay submódulos). Los textos viven en `shared/messages/es.ts`.

**Razón**: cumple FR-007 sin alterar la pantalla de quien no tiene submódulos (SC-007). La concordancia
de «1 módulos» era un descuido existente; cambia una sola aserción de pruebas
(`blockModule.integration.test.tsx`, «1 módulos bloqueados»).

**Alternativas**: dejar «1 módulos» — se tocaría el mismo texto para añadir el plural de submódulos sin
arreglarlo; mostrar solo el total de entradas — no distinguiría módulos de submódulos (FR-007).

## D5. El árbol se dibuja en la `Table` de MUI con un botón de contraer, no como `treegrid`

**Decisión**: se mantiene `Table` (5 columnas, mismo encabezado). La celda «Módulo» lleva, de
izquierda a derecha, la sangría (un nivel por profundidad), el nombre con la marca «Base», la clave
y, si el módulo tiene submódulos, el control de contraer/expandir en su propia línea bajo la clave
(sin hueco que reservar para alinear los nombres; ajuste de la implementación, 2026-11-03). El
control es un `Button` nativo de MUI, pequeño y con icono, con:

- nombre accesible `«{n} submódulos de {Módulo}»` (contiene el texto visible «{n} submódulos», que
  acompaña al icono: WCAG 2.5.3) y `aria-expanded`;
- el icono `arrow-drop-down`, girado cuando está contraído.

Una fila de submódulo lleva un texto solo para lectores de pantalla «Submódulo de {Padre}» antes de su
nombre (FR-017). Contraer **no monta** las filas ocultas (se derivan al aplanar el árbol).

**Razón**: el contrato ARIA `treegrid` exige navegación con flechas, foco móvil y `aria-level` en cada
fila; es mucho más código y más riesgo que lo que pide el spec (FR-017 pide estado, cantidad, padre y
Enter/Espacio, no flechas). Un botón nativo cumple WCAG 2.1 AA, se prueba con Testing Library y axe, y
no necesita `aria-controls` (las filas ocultas no existen).

**Alternativas**: `treegrid` — descartado por lo anterior, con la nota de que sería la mejora si algún
día se quiere navegar con flechas; `RichTreeView` de `@mui/x-tree-view` (paquete aparte, nueva
dependencia estructural que exigiría Complexity Tracking, y sin columnas); `DataGrid` con datos en
árbol (Pro, hallazgo 7).

## D6. Contraer y expandir: estado de pantalla, y sin control durante una búsqueda

**Decisión**: los ids contraídos viven en un `useState<ReadonlySet<number>>` de `ModulesPage` (hook
`useCollapsedModules`, que ofrece `toggle` y `expand`), nunca en la dirección ni en el almacenamiento
(FR-004: al recargar, todo expandido). Mientras `search` no está vacío, el árbol se aplana ignorando el
conjunto y el control **no se renderiza**: en su lugar queda solo el texto «{n} submódulos»; al limpiar
la búsqueda el conjunto sigue como estaba.

**Razón**: el estado es de interfaz y local (constitución III). Durante una búsqueda todos los padres
con coincidencias deben verse expandidos (FR-004), así que un control que no puede hacer nada
confundiría. Se subió el estado a la página, y no a la tabla, porque tras guardar un cambio de padre la
página debe expandir al nuevo padre (FR-013): los paneles lo piden con `onParentAssigned(id)`.

**Alternativas**: guardar lo contraído en la URL — el spec dice explícitamente que no se conserva;
`sessionStorage` — tampoco; deshabilitar el control en la búsqueda — un botón deshabilitado sin
explicación es peor que no mostrarlo.

## D7. El padre se elige con un `TextField select`, con las opciones de la consulta de Activos

**Decisión**: el campo «Módulo padre» es un `TextField select` de MUI (como los demás campos, con el
mismo `helperText` y manejo de errores). Su primera opción es «Ninguno (módulo de primer nivel)»
(valor vacío). Las opciones salen de **la consulta de módulos Activos** (`useModulesCatalog(ACTIVE)`,
la misma que ya usa la pantalla) con la función pura `eligibleParents(modules, { typeId,
excludeModuleId })`: primer nivel, activos, del mismo tipo, no protegidos y distintos del propio
módulo (FR-010). Un hook `useParentModuleOptions` solo une ambas cosas, y el componente
`ModuleParentFieldWithOptions` las conecta con el campo.

**Ajuste de la implementación (2026-11-03)**: una consulta que ya está cargada se vuelve a pedir al
montar otro observador suyo si está vencida, y eso habría hecho que abrir un panel lanzara dos
peticiones (la 013, D10, pide ninguna). `useModulesCatalog` acepta por eso un `staleTime` opcional y
las opciones del padre usan 30 s: dentro de ese plazo abrir el formulario no pide nada.

**Razón**: un `select` nativo de MUI se opera con teclado y lector de pantalla sin trabajo extra, y las
opciones son pocas (los módulos de primer nivel de un tipo). Reutilizar la consulta de Activos no añade
tráfico cuando la pantalla ya está en «Activos» (misma clave de caché) y solo hace una consulta cuando
el formulario se abre desde «Bloqueados».

**Alternativas**: `Autocomplete` — una escritura incremental que no hace falta con tan pocas opciones;
una consulta propia con `top_level=true&type_id=…` — otra clave de caché que invalidar y que
sincronizar; derivar las opciones de la lista de la vista — en «Bloqueados» no vendrían los activos.

## D8. El valor del formulario es un texto; el cuerpo envía `null` para quitar el padre

**Decisión**: `moduleFormSchema` gana `parentModuleId: string` (vacío = ninguno), como `sortOrder`.
`toCreateModuleBody` agrega `parent_module_id` solo si hay uno; `toUpdateModuleBody` lo agrega solo si
cambió respecto de `initial.parentModule?.id`, y manda `null` cuando se quita (`UpdateModuleBody`
admite `number | null`). `toFormValues` y `initialModuleFormValues` se actualizan.

**Razón**: el patrón de `sortOrder` (texto en el formulario, número en el cuerpo) ya existe y evita
inventar otro. «Solo si cambió» mantiene el `PATCH` mínimo y evita que una edición cualquiera mande un
padre que el servicio revalidaría sin necesidad.

**Alternativas**: `number | null` en el formulario — un `select` de MUI trabaja con texto y habría que
convertir en cada cambio.

## D9. Cambiar el tipo en el alta limpia el padre; el campo se bloquea en la edición cuando corresponde

**Decisión**:
- **Alta** (FR-011): al cambiar el tipo, si hay un padre elegido se limpia siempre (todos los padres
  ofrecidos eran del tipo anterior y ya no sirven) y las opciones se recalculan con el tipo nuevo.
- **Edición** (FR-012): el campo se deshabilita, con una explicación en el `helperText`, cuando el
  módulo **tiene submódulos a la vista** (los de la lista cargada cuyo `parentModule.id` es el suyo) o
  **es uno de los cuatro módulos base**. Si el módulo ya tiene padre y ese padre no figura entre las
  opciones (por ejemplo, está Bloqueado), se agrega como opción actual para que se vea (spec,
  escenario 9). Si tiene submódulos que no se ven, el servicio rechaza el cambio y el mensaje aparece
  en el mismo campo (D11).

**Razón**: son las reglas del servicio, adelantadas a la interfaz solo para evitar el error cuando se
pueden saber; la API sigue siendo la autoridad (constitución IV). El servicio no puede guardar un
módulo base como submódulo ni con submódulos como submódulo.

## D10. Cómo no pasar de 250 líneas

**Decisión**:
- `ModuleEditPanel.tsx` (244) extrae su bloque de clave y tipo fijos a `ModuleFixedInfo.tsx`
  (≈ 25 líneas) y gana el campo y dos props (`submoduleCount`, `onParentAssigned`).
- `ModuleCreatePanel.tsx` (208) gana el campo y el reinicio del padre al cambiar el tipo (≈ 15
  líneas).
- El campo vive en un componente propio, `ModuleParentField.tsx`, compartido por alta y edición.
- `ModulesTable.tsx` (143) se divide en `ModulesTable` (tabla y grupos), `ModuleTreeRows` (filas) y
  `ModuleNameCell` (sangría, control y nombre), cada una por debajo de ~120 líneas.
- `ModulesPage.tsx` (172) solo suma el armado del árbol y el hook de contraer.

**Razón**: constitución I (≤ 250 líneas, responsabilidades únicas). El padre no es un campo de texto
más: vive en su propio componente. `ModuleFormFields` solo ganó una ranura opcional, `afterOrder`, para
colocarlo entre «Orden» y las acciones, como pide el contrato de interfaz (§5); su contrato
(nombre, descripción, orden y acciones) es el de siempre. Además, para que `ModuleEditPanel` quedara
por debajo de las 250 líneas, `PendingUncheck` pasó a ser un simple estado y el campo se montó con
`ModuleParentFieldWithOptions` (que también calcula por qué puede estar bloqueado).

## D11. Errores del servicio con un mensaje en el campo del padre

**Decisión**: `describeModuleError` (capa `api`) gana el campo `parentModuleId` en `ModuleFormField` y
estos casos (la tabla completa está en [contracts/modules-service-changes.md](contracts/modules-service-changes.md)):

| Código | Operación | Resultado |
|---|---|---|
| `module_parent_not_found` (404) | `create`, `update` | `field` en el padre: «El módulo padre ya no existe. Elige otro.» |
| `module_parent_is_submodule`, `module_parent_type_mismatch`, `module_parent_self_reference` (409) | `create`, `update` | `field` en el padre, un texto propio cada uno |
| `module_protected` (409) | `create`, `update` | `field` en el padre: los módulos base no son padres ni submódulos (con `block` y `delete` sigue igual) |
| `module_has_submodules` (409) | `update` | `field` en el padre: tiene submódulos y no puede ser submódulo |
| `module_has_submodules` (409) | `delete` | mensaje general (el de FR-016) |
| `validation_error` con `parent_module_id` | `create`, `update` | `field` en el padre |

El código del servicio decide, nunca su `message` (no se muestra texto crudo del servidor, FR-014).
`applyModuleRefusal` ordena el campo nuevo entre los de la pantalla. Tras cualquier rechazo del
guardado, las consultas del catálogo se invalidan (D13).

**Razón**: constitución IV (409/422: mensaje de negocio o error por campo; sin mensajes crudos) y
constitución III (los errores por campo van a su campo).

## D12. Bloqueo y eliminación de un módulo con submódulos

**Decisión**: `ModuleDangerZone` recibe `submoduleCount` (los submódulos a la vista, calculados por
`submoduleCountOf` sobre la lista cargada). Con un módulo Activo y `submoduleCount > 0`, el texto de
ayuda del bloqueo dice cuántos submódulos quedarán sin disponibilidad (FR-015); con
`submoduleCount > 0`, en lugar del botón «Eliminar módulo» aparece un texto que explica que primero
hay que eliminar sus submódulos o cambiarlos de padre (FR-016). Si el servicio rechaza igual la
eliminación (submódulos que no se ven), se muestra ese mismo texto.

**Razón**: son avisos, no reglas nuevas. Bloquear sigue sin confirmación (spec 013: reversible).
El conteo es «a la vista» porque la interfaz solo conoce lo que cargó; el servicio cubre el resto.

**Alternativas**: pedir el conteo exacto al servicio con una consulta aparte — otra llamada solo para
un texto, y el servicio ya protege la operación.

## D13. Las mutaciones invalidan el catálogo también al fallar

**Decisión**: `useUpdateModule`, `useCreateModule` y `useDeleteModule` pasan de `onSuccess` a
`onSettled` para invalidar `moduleKeys.all` (como ya hace `useChangeModuleStatus`). Un `PATCH` que
falla porque otra persona eliminó al padre refresca la lista y el mensaje explica por qué (spec,
«Cambios simultáneos»).

**Razón**: la constitución III pide invalidar explícitamente tras una mutación; con la jerarquía, un
rechazo suele significar que los datos de la pantalla ya están viejos. El costo es una consulta de más
tras un error.

## D14. El simulador de la API (MSW) aplica las reglas de la 5.4.0

**Decisión**: `src/test/handlers/modulesCatalog/model.ts` gana `parentModuleId` en `CatalogModule` y
aplica las reglas del contrato: `parent_module` en la respuesta, creación y modificación con padre (404 y
los 409 en el orden de precedencia del catálogo de errores), eliminación con submódulos, y lista con la
regla de disponibilidad (un submódulo con padre no Activo no sale entre los Activos; entre los
Bloqueados solo si él mismo lo está). La validación del campo (`parent_module_id` no entero) vive en
`validation.ts`. La semilla (`seed.ts`, los 23 módulos del mockup) **no cambia**: las pruebas arman su
jerarquía con `catalogModule({ parentModuleId })`.

**Razón**: constitución VII (las APIs se simulan a nivel de red con MSW, con las reglas del contrato) y
no tocar la semilla evita reescribir los conteos de las pruebas existentes («23 módulos activos»).

## D15. Datos de prueba y compatibilidad de las pruebas existentes

**Decisión**: la fábrica de DTO de módulo de `src/test/factories.ts` y `toModuleDto` del simulador
añaden `parent_module: null` por omisión; `systemModule.test.ts` cubre el campo nuevo, con `null`, con
un padre, y la falta del campo como error. Las pruebas de `roles` y `subscriptions` no necesitan
cambios (hallazgo 6). La única aserción que cambia por texto es la de «1 módulos bloqueados» (D4).

**Razón**: SC-007 pide que todo lo de primer nivel siga dando el mismo resultado; con `null` por
omisión, las pruebas existentes lo comprueban sin tocarse.

## D16. Pruebas y simulador de extremo a extremo

**Decisión**: tres capas, como en el resto del proyecto.

- **Lógica pura** (cobertura del 80 %): `buildModuleTree`, `moduleHierarchy` (`eligibleParents`,
  `submoduleCountOf`), `systemModule`, `moduleForm`, `moduleErrors`.
- **Componentes e integración** (con el simulador): la tabla en árbol (agrupación, contraer, contexto,
  búsqueda, nombres accesibles, axe), el campo del padre, el alta con padre, el cambio y el quitado de
  padre, los errores por campo, el bloqueo y la eliminación con submódulos.
- **E2E** (`e2e/modules.spec.ts`): un escenario de crear un submódulo y verlo anidado, que, como los
  demás, exige un entorno Auth0 de pruebas y no se ejecuta aquí.

## D17. Constitución: sin desvíos nuevos

**Decisión**: no hay violaciones nuevas que registrar. Se hereda la justificación de la 013 sobre la
ausencia de paginación en el servidor para este catálogo (contrato: «sin paginación», ahora con un
máximo esperado de 200). Tampoco hay dependencias nuevas.

**Observación (no bloquea esta feature)**: el alcance del producto de la constitución (sección
«Alcance») todavía dice que el catálogo de módulos «no se crea ni edita desde el Backoffice», cuando la
feature 013 ya lo administra. Es una frase desactualizada que conviene enmendar en un cambio
aparte (la enmienda de la 025 sobre las pestañas de Roles es otra edición de ese mismo documento).
