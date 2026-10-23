import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { ModulesFilters } from './ModulesFilters';

function renderFilters(overrides: Partial<React.ComponentProps<typeof ModulesFilters>> = {}) {
  const onTypeChange = vi.fn();
  const onStatusChange = vi.fn();
  const onSearchChange = vi.fn();
  render(
    <ModulesFilters
      type="all"
      status="active"
      search=""
      onTypeChange={onTypeChange}
      onStatusChange={onStatusChange}
      onSearchChange={onSearchChange}
      {...overrides}
    />,
  );
  return { onTypeChange, onStatusChange, onSearchChange };
}

describe('ModulesFilters', () => {
  it('shows Tipo with Todos selected by default', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'Todos', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sistema', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clínica', pressed: false })).toBeInTheDocument();
  });

  it('shows Estatus with Activos selected by default', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'Activos', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloqueados', pressed: false })).toBeInTheDocument();
  });

  it('calls onTypeChange when another type is chosen', async () => {
    const user = userEvent.setup();
    const { onTypeChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Sistema' }));

    expect(onTypeChange).toHaveBeenCalledWith('system');
  });

  it('calls onStatusChange when another status is chosen', async () => {
    const user = userEvent.setup();
    const { onStatusChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    expect(onStatusChange).toHaveBeenCalledWith('blocked');
  });

  it('has a Buscar field with its text', () => {
    renderFilters({ search: 'agenda' });

    expect(screen.getByRole('textbox', { name: 'Nombre o clave' })).toHaveValue('agenda');
  });

  it('calls onSearchChange when the search text changes', async () => {
    const user = userEvent.setup();
    const { onSearchChange } = renderFilters();

    await user.type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'a');

    expect(onSearchChange).toHaveBeenCalledWith('a');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ModulesFilters
        type="all"
        status="active"
        search=""
        onTypeChange={vi.fn()}
        onStatusChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
