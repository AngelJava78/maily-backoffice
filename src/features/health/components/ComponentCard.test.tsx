import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import {
  healthCheckDto,
  healthComponentDto,
  healthResultDto,
  type HealthComponentDto,
} from '@/test/factories';

import { healthResultSchema, type HealthComponent } from '../schemas/healthResult';
import { ComponentCard } from './ComponentCard';

const { fields, details } = messages.health;
const NOT_AVAILABLE = messages.health.notAvailable;

/** A component as the page gets it: the DTO of the aggregator with these changes, parsed. */
function componentOf(overrides: Partial<HealthComponentDto> = {}): HealthComponent {
  const dto = healthResultDto({ components: [healthComponentDto(overrides)] });
  const [component] = healthResultSchema.parse(dto).components;
  if (component === undefined) {
    throw new Error('Expected a component');
  }
  return component;
}

/** The card in its list, with its detail folded and unfolded as the page does it. */
function Harness({ component }: { readonly component: HealthComponent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ul>
      <ComponentCard
        component={component}
        expanded={expanded}
        onToggle={() => {
          setExpanded((current) => !current);
        }}
      />
    </ul>
  );
}

function renderCard(overrides: Partial<HealthComponentDto> = {}) {
  const user = userEvent.setup();
  const view = render(<Harness component={componentOf(overrides)} />);
  return { user, ...view };
}

/** The value next to a label of the description list. */
function valueOf(label: string): HTMLElement {
  const value = screen.getByText(label, { selector: 'dt' }).nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`Expected a value for ${label}`);
  }
  return value;
}

function toggleOf(name = 'MailySoft System API'): HTMLElement {
  return screen.getByRole('button', { name: details.toggleLabel(name) });
}

/** The region of the detail, which the toggle controls. */
function regionOf(toggle: HTMLElement): HTMLElement {
  const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  if (region === null) {
    throw new Error('Expected the region of the detail');
  }
  return region;
}

describe('ComponentCard', () => {
  it('shows its name as a heading, its kind and its status in text', () => {
    renderCard();

    expect(screen.getByRole('heading', { level: 3, name: 'MailySoft System API' })).toBeVisible();
    expect(valueOf(fields.kind)).toHaveTextContent('Microservicio');
    expect(valueOf(fields.status)).toHaveTextContent('Operativo');
  });

  it.each([
    [1284, '1,284 ms'],
    [0, '0 ms'],
    [null, NOT_AVAILABLE],
  ])('shows a latency of %j as «%s»', (latency, text) => {
    renderCard({ latency_ms: latency });

    expect(valueOf(fields.latency)).toHaveTextContent(text);
  });

  it('shows the last check with its seconds, and the build data (FR-012)', () => {
    renderCard({ checked_at: '2026-10-24T16:00:05Z' });

    expect(valueOf(fields.checkedAt)).toHaveTextContent(
      formatDateTime('2026-10-24T16:00:05Z', { seconds: true }),
    );
    expect(valueOf(fields.version)).toHaveTextContent('2.1.0');
    expect(valueOf(fields.commit)).toHaveTextContent(/^9fceb02$/);
    expect(valueOf(fields.buildDate)).toHaveTextContent(formatDateTime('2026-10-24T15:30:00Z'));
    expect(valueOf(fields.environment)).toHaveTextContent('production');
  });

  it('shows a commit shorter than seven characters complete', () => {
    renderCard({ commit: 'abc12' });

    expect(valueOf(fields.commit)).toHaveTextContent(/^abc12$/);
  });

  it('says «No disponible» for every datum the component does not know, never «unknown» (FR-014)', () => {
    const { container } = renderCard({
      latency_ms: null,
      checked_at: null,
      version: 'unknown',
      commit: null,
      build_date: 'ayer',
      environment: '   ',
    });

    for (const label of [
      fields.latency,
      fields.checkedAt,
      fields.version,
      fields.commit,
      fields.buildDate,
      fields.environment,
    ]) {
      expect(valueOf(label)).toHaveTextContent(NOT_AVAILABLE);
    }
    expect(container).not.toHaveTextContent(/unknown/i);
  });

  it('starts with its detail folded, and unfolds and folds it with the mouse (FR-015)', async () => {
    const { user } = renderCard();
    const toggle = toggleOf();

    expect(toggle).toHaveTextContent(details.toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(regionOf(toggle)).not.toBeVisible();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const region = regionOf(toggle);
    await waitFor(() => {
      expect(region).toBeVisible();
    });
    const check = within(region).getByRole('listitem');
    expect(check).toHaveTextContent('Base de datos');
    expect(check).toHaveTextContent('Correcto');
    expect(check).toHaveTextContent('12 ms');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => {
      expect(region).not.toBeVisible();
    });
  });

  it('unfolds and folds its detail with Enter and with Space', async () => {
    const { user } = renderCard();
    const toggle = toggleOf();

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('explains the error of the component and shows each check with its status', async () => {
    const { user } = renderCard({
      status: 'degraded',
      error: 'not_ready',
      checks: [
        healthCheckDto({ status: 'error', latency_ms: 3001, error: 'timeout' }),
        healthCheckDto({ name: 'cache', status: 'maintenance', latency_ms: null }),
      ],
    });

    await user.click(toggleOf());

    const region = regionOf(toggleOf());
    expect(region).toHaveTextContent('Está en línea, pero no está listo para atender.');
    const [database, cache] = within(region).getAllByRole('listitem');
    expect(database).toHaveTextContent('Base de datos');
    expect(database).toHaveTextContent('Con error');
    expect(database).toHaveTextContent('3,001 ms');
    expect(cache).toHaveTextContent('cache');
    expect(cache).toHaveTextContent('Desconocido');
    expect(cache).toHaveTextContent(NOT_AVAILABLE);
  });

  it('says so when it has neither checks nor error', async () => {
    const { user } = renderCard({ checks: [], error: null });

    await user.click(toggleOf());

    expect(regionOf(toggleOf())).toHaveTextContent(details.none);
  });

  it('wraps a long name instead of overflowing', () => {
    const name = 'Servicio'.repeat(25);
    renderCard({ name });

    expect(getComputedStyle(screen.getByRole('heading', { level: 3, name })).overflowWrap).toBe(
      'anywhere',
    );
  });

  it('has no accessibility violations, folded and unfolded', async () => {
    const { user, container } = renderCard({ error: 'timeout' });

    expect(await axe(container)).toHaveNoViolations();

    await user.click(toggleOf());

    expect(await axe(container)).toHaveNoViolations();
  });
});
