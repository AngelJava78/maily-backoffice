# Guía de validación: Crear y editar un módulo en un modal

**Feature**: `017-modal-edit-dialogs` | **Fecha**: 2026-10-24 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Requisitos previos

| Requisito | Detalle |
|---|---|
| `mailySoft-usuarios` corriendo en local, o el simulador MSW | Mismo catálogo de módulos que ya usa la spec `013`; esta feature no cambia ningún endpoint ni dato. |
| Cuenta con `modules:write`/`modules:update`/`modules:delete` | Para ver "+ Nuevo módulo" y "Editar" (igual que hoy). |
| Dependencias | Ninguna nueva: `npm ci` basta (research.md, sin paquetes nuevos). |

## Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## Escenarios de validación

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| W1 | FR-001, SC-001 | Abrir `/modules`. Pulsar "Editar" en cualquier módulo. | Se abre un modal con el formulario de ese módulo; la tabla detrás sigue viéndose con todo el ancho de la pantalla (no reducida a una columna). |
| W2 | FR-003 | Abrir `/modules` sin pulsar nada. | No aparece ningún panel ni mensaje de "selecciona un módulo"; la tabla ya ocupa todo el ancho por sí sola. |
| W3 | FR-002 | Pulsar "+ Nuevo módulo". | Se abre el mismo tipo de modal, ahora con el formulario de alta. |
| W4 | FR-004 | Con el modal de edición de un módulo abierto, copiar la URL (`?edit=<id>`), abrirla en una pestaña nueva. | El modal de ese módulo se abre directamente al cargar la página, igual que hoy abre su panel. |
| W5 | FR-004 | Con un modal abierto, pulsar el botón Atrás del navegador. | El modal se cierra (la URL vuelve a no tener `edit`/`new`), igual que hoy cierra el panel. |
| W6 | FR-005 | Abrir "Editar" de un módulo, cambiar el nombre sin guardar, cerrarlo con la tecla Escape. | El cambio se pierde sin ninguna advertencia; al reabrir ese módulo se ve su valor guardado. |
| W7 | FR-006 | Dentro del modal de edición, bloquear el módulo, y por separado, intentar eliminarlo. | Mismo resultado y mismos mensajes que hoy: bloquear es inmediato; eliminar pide confirmación nombrando el módulo, superpuesta al modal. |
| W8 | FR-007 | Crear un módulo nuevo con datos válidos y guardar. | Sin cerrar el modal, pasa a mostrar la edición del módulo recién creado. |
| W9 | FR-008 | Abrir "Editar" de un módulo y luego cerrarlo (con "Descartar" o Escape). | Al cerrarse, el foco vuelve al botón "Editar" de ese módulo (visible con el teclado: `Tab` desde ahí avanza al siguiente control de esa fila, no se "pierde" en la página). |

## Lo que esta guía no cubre manualmente

Nada: a diferencia de otras specs de este proyecto, esta no depende del backend de ninguna forma
nueva (ni contratos, ni datos, ni reglas de negocio); todo lo descrito arriba es observable con
cualquier catálogo de módulos ya existente.
