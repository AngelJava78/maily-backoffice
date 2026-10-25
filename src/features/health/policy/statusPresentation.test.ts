import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import {
  checkNameLabel,
  checkStatusLabel,
  componentStatusPresentation,
  describeComponentError,
  kindLabel,
  latencyLabel,
  overallStatusPresentation,
} from './statusPresentation';
import { COMPONENT_KINDS, COMPONENT_STATUSES } from './statusValues';

// The mappings of unknown values to `unknown` (toComponentStatus and the rest) live in
// statusValues.ts, with their own tests, so that the schemas do not depend on the texts.

describe('componentStatusPresentation', () => {
  it.each([
    ['up', 'Operativo', 'success', 'status-up'],
    ['degraded', 'Degradado', 'warning', 'status-degraded'],
    ['down', 'Caído', 'danger', 'status-down'],
    ['stopped', 'Detenida por horario', 'neutral', 'status-stopped'],
    ['unknown', 'Desconocido', 'neutral', 'status-unknown'],
  ] as const)('shows %s as «%s», in the %s tone, with %s', (status, label, tone, icon) => {
    expect(componentStatusPresentation(status)).toEqual({ label, tone, icon });
  });

  it('gives each status an icon of its own, so that no status is told by its color alone', () => {
    const icons = COMPONENT_STATUSES.map((status) => componentStatusPresentation(status).icon);

    expect(new Set(icons).size).toBe(COMPONENT_STATUSES.length);
  });
});

describe('overallStatusPresentation', () => {
  it.each([
    ['ok', 'Todo operativo', 'success', 'status-up'],
    ['degraded', 'Degradado', 'warning', 'status-degraded'],
    ['down', 'Con componentes caídos', 'danger', 'status-down'],
    ['unknown', 'Desconocido', 'neutral', 'status-unknown'],
  ] as const)('shows %s as «%s», in the %s tone, with %s', (status, label, tone, icon) => {
    expect(overallStatusPresentation(status)).toEqual({ label, tone, icon });
  });
});

describe('describeComponentError', () => {
  it.each([
    ['timeout', 'No respondió a tiempo.'],
    ['connection_error', 'No se pudo conectar.'],
    ['dns_error', 'No se encontró la dirección del servicio.'],
    ['host_not_allowed', 'Su dirección no está en la lista permitida; no se comprobó.'],
    ['unexpected_status', 'Respondió con un código inesperado.'],
    ['invalid_response', 'Su respuesta no cumple el contrato de salud.'],
    ['response_too_large', 'Su respuesta fue demasiado grande.'],
    ['not_ready', 'Está en línea, pero no está listo para atender.'],
    ['not_configured', 'Le falta configuración, por ejemplo la conexión a la base de datos.'],
    ['unexpected_error', 'Ocurrió un error inesperado al comprobarlo.'],
  ])('explains %s (FR-016)', (code, text) => {
    expect(describeComponentError(code)).toBe(text);
  });

  it.each(['quota_exceeded', '', 'unknownCode', 'TIMEOUT', 'toString'])(
    'gives the generic text for a code it does not know (%j)',
    (code) => {
      expect(describeComponentError(code)).toBe(messages.health.errors.unknownCode);
    },
  );
});

describe('checkNameLabel', () => {
  it('gives the name in Spanish of a check that the contract defines', () => {
    expect(checkNameLabel('database')).toBe('Base de datos');
  });

  it.each(['cache', 'queue', 'Database', 'toString'])(
    'gives any other name as it is (%j)',
    (name) => {
      expect(checkNameLabel(name)).toBe(name);
    },
  );
});

describe('checkStatusLabel', () => {
  it.each([
    ['ok', 'Correcto'],
    ['error', 'Con error'],
    ['unknown', 'Desconocido'],
  ] as const)('shows %s as «%s»', (status, label) => {
    expect(checkStatusLabel(status)).toBe(label);
  });
});

describe('kindLabel', () => {
  it('gives the text of each kind', () => {
    expect(COMPONENT_KINDS.map((kind) => kindLabel(kind))).toEqual([
      'Microservicio',
      'Base de datos',
      'Frontend',
      'Componente',
    ]);
  });
});

describe('latencyLabel', () => {
  it.each([
    [1284, '1,284 ms'],
    [12, '12 ms'],
    [0, '0 ms'],
    [null, 'No disponible'],
  ])('shows %j as «%s», with the numbers of Mexico (FR-012, FR-014)', (latency, text) => {
    expect(latencyLabel(latency)).toBe(text);
  });
});
