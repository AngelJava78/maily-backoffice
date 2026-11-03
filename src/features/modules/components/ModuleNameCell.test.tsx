import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';
import { ModuleNameCell } from './ModuleNameCell';

function module(overrides: Partial<SystemModule> = {}): SystemModule {
  return {
    id: 1,
    key: 'patients',
    name: 'Pacientes',
    description: null,
    sortOrder: 10,
    createdAt: '2026-10-22T00:00:00Z',
    statusId: 1,
    typeId: MODULE_TYPE.CLINIC,
    activePermissionsCount: 0,
    parentModule: null,
    actions: new Set(),
    permissionIdByAction: new Map(),
    ...overrides,
  };
}

function renderCell(overrides: Partial<ComponentProps<typeof ModuleNameCell>> = {}) {
  const onToggle = vi.fn();
  render(
    <ModuleNameCell
      module={module()}
      depth={0}
      childCount={0}
      expanded
      searching={false}
      onToggle={onToggle}
      {...overrides}
    />,
  );
  return onToggle;
}

describe('ModuleNameCell', () => {
  it('shows the name and the key', () => {
    renderCell();

    expect(screen.getByText('Pacientes')).toBeVisible();
    expect(screen.getByText('patients')).toBeVisible();
  });

  it('marks a base module', () => {
    renderCell({ module: module({ key: 'users', name: 'Usuarios' }) });

    expect(screen.getByText('Base')).toBeVisible();
  });

  it('has no control to collapse for a module without submodules', () => {
    renderCell({ childCount: 0 });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names the control with the count and the module, and tells whether it is expanded', () => {
    renderCell({ childCount: 3, expanded: true });

    const control = screen.getByRole('button', { name: '3 submódulos de Pacientes' });
    expect(control).toHaveAttribute('aria-expanded', 'true');
    // WCAG 2.5.3: the accessible name contains the text that is seen.
    expect(control).toHaveTextContent('3 submódulos');
  });

  it('reports a collapsed module as not expanded', () => {
    renderCell({ childCount: 3, expanded: false });

    expect(screen.getByRole('button', { name: '3 submódulos de Pacientes' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('uses the singular for a single submodule', () => {
    renderCell({ childCount: 1 });

    expect(screen.getByRole('button', { name: '1 submódulo de Pacientes' })).toHaveTextContent(
      '1 submódulo',
    );
  });

  it('toggles once with Enter and with Space, and with a click', async () => {
    const user = userEvent.setup();
    const onToggle = renderCell({ childCount: 2 });
    const control = screen.getByRole('button', { name: '2 submódulos de Pacientes' });

    await user.click(control);
    control.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('shows only the count, with no control, while a search is active', () => {
    renderCell({ childCount: 3, searching: true });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('3 submódulos')).toBeVisible();
  });

  it('tells a screen reader whose submodule it is, before its name', () => {
    renderCell({
      module: module({ id: 2, key: 'prescriptions', name: 'Recetas' }),
      depth: 1,
      parent: { id: 1, key: 'patients', name: 'Pacientes' },
    });

    const hint = screen.getByText('Submódulo de Pacientes');
    const name = screen.getByText('Recetas');
    // The hint is the first thing inside the name: it is read before it.
    expect(name.firstElementChild).toBe(hint);
  });

  it('says nothing about a parent for a top-level module', () => {
    renderCell();

    expect(screen.queryByText(/Submódulo de/)).not.toBeInTheDocument();
  });
});
