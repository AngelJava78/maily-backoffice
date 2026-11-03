import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import { UsersFilters } from './UsersFilters';

const text = messages.users.filters;

function renderFilters(overrides: Partial<React.ComponentProps<typeof UsersFilters>> = {}) {
  const onTypeChange = vi.fn();
  const onStatusChange = vi.fn();
  const result = render(
    <UsersFilters
      type="all"
      status="active"
      onTypeChange={onTypeChange}
      onStatusChange={onStatusChange}
      {...overrides}
    />,
  );
  return { ...result, onTypeChange, onStatusChange };
}

// The same groups, labels and behaviour as the filters of Módulos and Roles (FR-015, research D9).
describe('UsersFilters', () => {
  it('shows the Tipo group, named and in order, with the type it receives pressed (FR-001)', () => {
    renderFilters({ type: 'system' });

    const group = screen.getByRole('group', { name: text.typeLabel });
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Todos', 'Sistema', 'Clínica']);
    expect(within(group).getByRole('button', { name: 'Sistema', pressed: true })).toBeVisible();
    expect(within(group).getByRole('button', { name: 'Todos', pressed: false })).toBeVisible();
  });

  it('shows the Estatus group, named and in order, with the status it receives pressed (FR-002)', () => {
    renderFilters({ status: 'blocked' });

    const group = screen.getByRole('group', { name: text.statusLabel });
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Activos', 'Bloqueados']);
    expect(within(group).getByRole('button', { name: 'Bloqueados', pressed: true })).toBeVisible();
  });

  it('shows the label of each group above it (FR-015)', () => {
    renderFilters();

    expect(screen.getByText(text.typeLabel)).toBeVisible();
    expect(screen.getByText(text.statusLabel)).toBeVisible();
  });

  it('calls onTypeChange and onStatusChange with the option chosen', async () => {
    const user = userEvent.setup();
    const { onTypeChange, onStatusChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Clínica' }));
    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    expect(onTypeChange).toHaveBeenCalledWith('clinic');
    expect(onStatusChange).toHaveBeenCalledWith('blocked');
  });

  it('pressing the pressed button again does not empty the group (FR-003)', async () => {
    const user = userEvent.setup();
    const { onTypeChange, onStatusChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.click(screen.getByRole('button', { name: 'Activos' }));

    expect(onTypeChange).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('can be used with the keyboard alone: Tab into the group, arrows, Space (FR-016, US4-1)', async () => {
    const user = userEvent.setup();
    const { onTypeChange } = renderFilters();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveFocus();
    await user.keyboard(' ');

    expect(onTypeChange).toHaveBeenCalledWith('system');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFilters();

    expect(await axe(container)).toHaveNoViolations();
  });
});
