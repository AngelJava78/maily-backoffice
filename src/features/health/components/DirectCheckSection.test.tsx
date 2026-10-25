import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { DirectCheckView } from '../hooks/useDirectCheckSection';
import type { DirectCheckRow } from '../policy/directCheckRules';
import { DirectCheckSection } from './DirectCheckSection';

const text = messages.health.direct;

const SYSTEM_API: DirectCheckRow = {
  code: 'maily-system-api',
  name: 'maily-system-api',
  status: 'unreachable',
  explanations: [],
};
const USERS: DirectCheckRow = {
  code: 'mailysoft-usuarios',
  name: 'mailySoft-usuarios',
  status: 'operational',
  explanations: [],
};
const PATIENTS: DirectCheckRow = {
  code: 'mailysoft-pacientes',
  name: 'mailySoft-pacientes',
  status: 'degraded',
  explanations: [text.explanations.database],
};

const ready = (rows: readonly DirectCheckRow[], isRefreshing = false): DirectCheckView => ({
  status: 'ready',
  rows,
  isRefreshing,
});

function renderSection(view: DirectCheckView, announceToken = 0) {
  return render(<DirectCheckSection view={view} announceToken={announceToken} />);
}

describe('DirectCheckSection', () => {
  it('shows nothing while its step does not exist', () => {
    const { container } = renderSection({ status: 'hidden' });

    expect(container).toBeEmptyDOMElement();
  });

  it('says the browser is checking, under its heading', async () => {
    const { container } = renderSection({ status: 'loading' });

    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
    expect(screen.getByText(text.loading)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the notice, every row with its status and the rest without information (FR-069, FR-070)', async () => {
    const { container } = renderSection(ready([SYSTEM_API, USERS, PATIENTS]));

    expect(screen.getByText(text.intro)).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'maily-system-apiNo responde',
      'mailySoft-usuariosOperativo',
      `mailySoft-pacientesDegradado${text.explanations.database}`,
    ]);
    expect(screen.getByText(text.others)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives each status an icon of its own', () => {
    renderSection(ready([SYSTEM_API, USERS, PATIENTS]));

    const icons = screen.getAllByRole('listitem').map(
      (row) =>
        within(row)
          .getByText(/Operativo|Degradado|No responde/)
          .closest('.MuiChip-root')
          ?.querySelector('svg')?.innerHTML,
    );
    expect(new Set(icons).size).toBe(3);
  });

  it('shows only the two fixed rows when no service is configured, accessibly', async () => {
    const { container } = renderSection(ready([SYSTEM_API, USERS]));

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is updating while a new round is on its way', () => {
    renderSection(ready([USERS], true));

    expect(screen.getByText(text.refreshing)).toBeInTheDocument();
  });

  it('announces itself once when its rows arrive, and again when the person asks (FR-075)', () => {
    const { rerender } = renderSection({ status: 'loading' });
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    rerender(<DirectCheckSection view={ready([USERS])} announceToken={0} />);
    const first = region.textContent;
    expect(first).toContain(text.title);

    rerender(<DirectCheckSection view={ready([USERS], true)} announceToken={0} />);
    rerender(<DirectCheckSection view={ready([USERS])} announceToken={0} />);
    expect(region.textContent).toBe(first);

    rerender(<DirectCheckSection view={ready([USERS])} announceToken={1} />);
    expect(region.textContent).not.toBe(first);
  });
});
