# Quickstart: validar «Salud de servicios»

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24 | **Plan**: [plan.md](plan.md)

Guía para comprobar la feature de punta a punta cuando esté implementada: qué levantar, qué configurar y qué se espera en cada escenario. Los contratos están en [contracts/](contracts/) y los estados en [data-model.md](data-model.md); aquí solo se referencian. Casi todo se cubre con las pruebas automáticas (MSW); esta guía es para la validación manual, el ambiente real y lo que MSW no puede probar (CORS y CSP).

## 0. Antes de empezar

- **Presupuesto del paquete**: hasta la corrección de Roles y permisos (`d3ae7f8`, ya en `main`), `npm run size` fallaba con 361,5 KB gzip (research D20). Antes de implementar, mide la línea base en la rama al día con `main`:

  ```powershell
  npm ci
  npm run build
  npm run size
  ```

  Anota el total en [plan.md](plan.md#notas-de-implementación). Repite al terminar (V15).
- **Ambientes reales** (no hacen falta para las pruebas automáticas):
  - maily-system-api con la 005 (agregador, registro, estado público y CORS en sus rutas de salud), en `http://127.0.0.1:8010`;
  - mailySoft-usuarios con la 016 (contrato v1, CORS en sus rutas de salud y el módulo «Salud de servicios» con `health:read`, `health:write`, `health:update` y `health:delete`);
  - mailySoft-pacientes con la 008 (contrato v1 y `CORS_ALLOWED_ORIGINS`), solo para ver su fila de la comprobación directa.

## 1. Configuración local

| Dónde | Qué |
|---|---|
| mailySoft-usuarios | Asignar `health:*` al rol de sistema de la cuenta de prueba (Administrator los recibe por migración); `CORS_ALLOWED_ORIGINS=http://localhost:5173` si no se usa el intermediario |
| maily-system-api | `HEALTH_ALLOWED_HOSTS` con los hosts que se van a registrar (por ejemplo, `127.0.0.1,host.docker.internal`); `CORS_ALLOWED_ORIGINS=http://localhost:5173`; para V4, el horario `DATABASE_SCHEDULE_*` |
| mailySoft-pacientes | `CORS_ALLOWED_ORIGINS=http://localhost:5173` (o usar el intermediario `/proxy/patients`) |
| Backoffice (`.env.local`) | Lo de siempre más, si se quiere, `VITE_HEALTH_REFRESH_SECONDS=10` (ciclos rápidos para probar) y `VITE_HEALTH_DIRECT_SERVICES=[{"code":"mailysoft-pacientes","name":"mailySoft-pacientes","url":"http://127.0.0.1:<puerto>"}]`, o `"url":"/proxy/patients"` con `PATIENTS_API_PROXY_TARGET` |

- Escribe las variables en `.env.local` o en PowerShell, no en Git Bash: Bash convierte `/proxy/...` en una ruta de Windows (lección de la 007).
- Arranca con `npm run dev` (`http://localhost:5173`).

## 2. Comprobaciones automáticas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run size
```

Esperado: todo en verde, cobertura ≥ 80 % en las capas lógicas y `npm run size` sin pasarse del presupuesto vigente y sin los marcadores de `health` en la entrada.

## 3. Escenarios

| # | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | Acceso y navegación (US1-1, US1-2) | Entrar con `health:read`; luego quitarlo al rol y esperar la recomprobación (5 min o volver a la pestaña); probar también un `health:read` en un rol de Clínica | Con el permiso: «Salud de servicios» antes de Token, `/health` con su `h1`, su título de pestaña y el foco en el `h1`. Sin él: sin entrada, `/health` y `/health/components` llevan al Panel con el aviso y en la pestaña Red no hay ninguna consulta a `/api/v1/health` ni al registro |
| V2 | Registrar los componentes (US3-1 a US3-5) | Con `health:write`, `/health/components` vacío → «Nuevo componente» → Microservicio «MailySoft Usuarios», código `mailysoft-usuarios`, URL de usuarios; repetir con pacientes y con MailySoft como Frontend (`/healthz/`, sin ruta de información) | Listado vacío con la explicación de los integrados; rutas propuestas para el microservicio; advertencia del frontend; aviso de éxito y la fila en el listado; en «Salud de servicios», el componente aparece a más tardar en el primer ciclo tras vencer la caché del agregador (SC-002: < 1 min) |
| V3 | Todo operativo y detalle (US1-3, US1-5, US1-12, SC-001) | Abrir `/health` con todo en marcha; desplegar un detalle con el teclado. Con la pestaña Red, medir en al menos 20 primeras visitas de sesión (recargando) el tiempo desde que se abre la página hasta que se ven todos los componentes | «Todo operativo», «N de N operativos», cada componente con tipo, estado, latencia, última comprobación, versión, commit de 7 caracteres, fecha de build y entorno; el detalle con sus chequeos, `aria-expanded` cambia, y sigue abierto tras el siguiente ciclo. MailySoft dice «No disponible» en versión y commit. El 95 % de las visitas medidas, en menos de 5 s (SC-001) |
| V4 | Degradado, caído y base detenida (US1-4, US1-6) | Detener pacientes (caído) y la base de usuarios (degradado); después, con el horario configurado y fuera de la ventana, detener la base de system-api | Cada uno con su estado e icono y el estado general del agregador; con la base detenida: «Detenida por horario», el aviso y «Vuelve a estar disponible el … a las …» en la zona del navegador |
| V5 | Registro no disponible y valores desconocidos (US1-8, US1-9) | Con la base del registro detenida (registro ilegible); valores desconocidos solo con las pruebas automáticas | Aviso de que la lista puede estar incompleta, con los componentes recibidos |
| V6 | Actualización (US2) | Con `VITE_HEALTH_REFRESH_SECONDS=10` y la pestaña Red abierta: esperar un ciclo; ocultar la pestaña 30 s; volver antes y después del intervalo; pulsar «Actualizar» 10 veces con la red lenta (DevTools); ir a otra sección con una consulta en curso; dejar la página 15 min sin tocar nada | Un ciclo cada 10 s desde que terminó el anterior; ninguno con la pestaña oculta; al volver, consulta solo si venció el intervalo; nunca dos consultas en curso; al salir, la consulta aparece cancelada y al volver se ven los datos con «Actualizando…»; «Actualizado hace» avanza cada segundo; a los 15 min se cierra la sesión por inactividad (SC-004) |
| V7 | Fallos del agregador (US1-10, US1-11, FR-030) | Detener mailySoft-usuarios con datos en pantalla y sin datos (recargar); quitar `health:read` solo en usuarios y pulsar «Actualizar» antes de la recomprobación | Con datos: se conservan con su antigüedad y el aviso (con la causa del 503); sin datos: error con «Reintentar»; en los dos, «Estado de la plataforma» con datos. Con el 403: «No tienes permiso para ver la salud de los servicios.», sin el aviso global y sin más consultas |
| V8 | Rechazos del registro (US3-6 a US3-14) | Repetir un código; usar un host fuera de `HEALTH_ALLOWED_HOSTS`; escribir una URL con `?`; editar y deshabilitar; eliminar en una pestaña y editar en otra | «Ya existe un componente con este código.» junto al código; junto a la URL, que no se puede monitorear y que su dominio debe agregarse a la lista permitida; el formato esperado antes de enviar; «Deshabilitado» en el listado y fuera de la página tras el ciclo; «Este componente ya no existe.» y vuelta al listado. Nunca un mensaje del servicio |
| V9 | Versión del Backoffice (US4) | Compilar con y sin `APP_COMMIT_SHA` y `APP_BUILD_DATE` ([contracts/environment.md](contracts/environment.md)) y abrir `npm run preview` | Con ellas: versión de `package.json`, commit de 7 y fecha local; sin ellas, o con valores inválidos: «No disponible», y el build compila y arranca; el bloque se ve también con el agregador fallando |
| V10 | Estado público en la pantalla de fallo (US5) | Detener mailySoft-usuarios y entrar (o recargar): la comprobación del acceso falla. Variante: con la base de system-api detenida fuera de horario. Pulsar «Reintentar» con la red lenta | «No se pudo comprobar el acceso» igual que antes, más «Estado de la plataforma» con su estado general y sus componentes (y la base «Detenida por horario» con su línea en la variante) en ≤ 5 s (SC-013). Mientras se comprueba el acceso no hay consultas a `/health/status`; tras un «Reintentar» que falla, una más; ninguna sola en 10 min (SC-015). La consulta no lleva `Authorization` ni cookies |
| V11 | Comprobación directa (US6) | Detener maily-system-api con usuarios y pacientes en marcha; abrir `/health` y, en otra variante, entrar con usuarios también detenido. Quitar el origen del Backoffice de `CORS_ALLOWED_ORIGINS` de pacientes | En ≤ 10 s: «maily-system-api: No responde», «mailySoft-usuarios: Operativo», «mailySoft-pacientes: Operativo» y el texto «Sin información»; nada más marcado caído (SC-019, SC-020). Sin CORS, pacientes dice «No responde». Ninguna consulta lleva credencial; en el ciclo se repite con la pestaña visible y nunca se superpone; al volver maily-system-api, las secciones desaparecen |
| V12 | Configuración inválida (US2-12, US6-14) | Compilar con `VITE_HEALTH_REFRESH_SECONDS=5` y, aparte, con `VITE_HEALTH_DIRECT_SERVICES` inválida (no JSON, código repetido, `maily-system-api`, 21 elementos, `http` en producción) | Pantalla de configuración inválida que nombra la variable y su regla, sin el valor (SC-011, SC-023). Sin la variable o con `[]`, solo las dos filas fijas |
| V13 | CORS y CSP por ambiente (SC-024) | Sección 4 | Todas las rutas con `Access-Control-Allow-Origin` del Backoffice y todos los orígenes en `connect-src` |
| V14 | Accesibilidad (FR-049, SC-003, SC-016, SC-022) | Recorrer las dos pantallas con teclado y lector de pantalla, a 1024 y a 320 px y en los temas claro y oscuro | Todo operable con teclado; estados con icono y texto; contraste suficiente en los dos temas; sin desplazamiento horizontal; el fallo se anuncia primero y las secciones después, una vez; los ciclos automáticos no se anuncian |
| V15 | Tamaño final (SC-005) | `npm run build` y `npm run size` | El total dentro del presupuesto vigente; ni las pantallas ni la sección de la pantalla de fallo en la entrada (guardas de `health`) |
| V16 | Extremo a extremo | `npm run test:e2e` con las cuentas del entorno de pruebas y system-api 005 y usuarios 016 desplegados | `e2e/health.spec.ts` pasa; sin las variables `E2E_*`, se omite |

## 4. Verificación de CORS y CSP en cada ambiente (SC-024)

Hazla en desarrollo, pruebas y producción antes de dar el ambiente por listo, y cada vez que cambien dominios, `CORS_ALLOWED_ORIGINS`, la CSP o `VITE_HEALTH_DIRECT_SERVICES`.

1. **CORS**, con el script (research D19):

   ```powershell
   npm run check:health-cors -- --origin https://backoffice.example --status https://system-api.example https://system-api.example https://usuarios.example https://pacientes.example
   ```

   Comprueba `/health/live` y `/health/ready` de cada base y `/health/status` de la indicada con `--status`, y falla si alguna respuesta no trae `Access-Control-Allow-Origin` con ese origen. Sin el script, lo mismo con `curl`, una ruta a la vez:

   ```bash
   curl -s -o /dev/null -D - -H "Origin: https://backoffice.example" https://pacientes.example/health/live
   ```

   La cabecera `access-control-allow-origin: https://backoffice.example` debe aparecer (tampoco hace falta `access-control-allow-credentials`). Con un intermediario del mismo origen, comprueba en cambio que la ruta devuelve JSON y no la página del Backoffice.
2. **CSP**: lee la cabecera servida con `index.html` (`curl -s -D - -o /dev/null https://backoffice.example/`) y comprueba que `connect-src` incluye cada origen absoluto de `VITE_HEALTH_DIRECT_SERVICES`, además de Auth0 y las APIs.
3. **Ruta de la SPA**: recarga `https://backoffice.example/health` y `/health/components`: deben cargar el Backoffice, no una respuesta del servidor (research D19).
4. Anota el resultado y la fecha por ambiente en las notas de despliegue del README.
