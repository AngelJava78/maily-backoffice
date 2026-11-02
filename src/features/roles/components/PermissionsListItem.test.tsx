import List from '@mui/material/List';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Module } from '../schemas/module';
import {
  withAllPermissionsToggled,
  withPermissionToggled,
  type ActionKey,
  type PermissionMatrixRow as Row,
} from '../schemas/permissionMatrix';
import { PermissionsListItem } from './PermissionsListItem';

const MODULE: Module = {
  id: 5,
  key: 'patients',
  name: 'Pacientes',
  sortOrder: 50,
  type: { id: 2, name: 'Clínica' },
};

function fullRow(
  granted: Partial<Record<'read' | 'write' | 'update' | 'delete', boolean>> = {},
): Row {
  return {
    module: MODULE,
    cells: {
      read: { permissionId: 1, granted: granted.read ?? false },
      write: { permissionId: 2, granted: granted.write ?? false },
      update: { permissionId: 3, granted: granted.update ?? false },
      delete: { permissionId: 4, granted: granted.delete ?? false },
    },
  };
}

function renderItem(row: Row, pending = false) {
  return render(
    <List>
      <PermissionsListItem row={row} pending={pending} onToggle={vi.fn()} onToggleAll={vi.fn()} />
    </List>,
  );
}

/** A stateful harness: applies the same pure rules `RoleDetailPanel` uses, and reports every toggle. */
function Harness({
  initial,
  onToggle = vi.fn(),
  onToggleAll = vi.fn(),
}: {
  readonly initial: Row;
  readonly onToggle?: (actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll?: (checked: boolean) => void;
}) {
  const [row, setRow] = useState(initial);
  return (
    <List>
      <PermissionsListItem
        row={row}
        pending={false}
        onToggle={(actionKey, checked) => {
          onToggle(actionKey, checked);
          setRow(withPermissionToggled(row, actionKey, checked));
        }}
        onToggleAll={(checked) => {
          onToggleAll(checked);
          setRow(withAllPermissionsToggled(row, checked));
        }}
      />
    </List>
  );
}

function buttonNames(): (string | null)[] {
  return screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
}

/** The decorative check mark inside a button: its slot is kept even while the button is not pressed. */
function markOf(button: HTMLElement): Element {
  const mark = button.querySelector('svg');
  if (mark === null) {
    throw new Error(`Expected a check mark inside "${button.getAttribute('aria-label')}"`);
  }
  return mark;
}

describe('PermissionsListItem', () => {
  it('is a list item that shows the module name', () => {
    renderItem(fullRow());

    expect(screen.getByRole('listitem')).toHaveTextContent('Pacientes');
  });

  it('paints one button per action the module has, in the order Ver, Crear, Modificar, Eliminar, then "Todo el módulo"', () => {
    renderItem(fullRow());

    expect(buttonNames()).toEqual([
      'Ver de Pacientes',
      'Crear de Pacientes',
      'Modificar de Pacientes',
      'Eliminar de Pacientes',
      'Todo el módulo de Pacientes',
    ]);
  });

  it('only paints a button for the actions the module actually has, no empty or inactive ones for the rest', () => {
    const readOnly: Row = { module: MODULE, cells: { read: { permissionId: 1, granted: true } } };
    const readAndUpdate: Row = {
      module: MODULE,
      cells: {
        read: { permissionId: 1, granted: false },
        update: { permissionId: 3, granted: false },
      },
    };

    const { unmount } = renderItem(readOnly);
    expect(buttonNames()).toEqual(['Ver de Pacientes', 'Todo el módulo de Pacientes']);
    unmount();

    renderItem(readAndUpdate);
    expect(buttonNames()).toEqual([
      'Ver de Pacientes',
      'Modificar de Pacientes',
      'Todo el módulo de Pacientes',
    ]);
  });

  it('shows each action label as the visible text of its button', () => {
    renderItem(fullRow());

    expect(screen.getByRole('button', { name: 'Ver de Pacientes' })).toHaveTextContent('Ver');
    expect(screen.getByRole('button', { name: 'Eliminar de Pacientes' })).toHaveTextContent(
      'Eliminar',
    );
  });

  it('presses a button exactly when its action is granted', () => {
    renderItem(fullRow({ read: true, update: true }));

    expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Modificar de Pacientes', pressed: true }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Crear de Pacientes', pressed: false }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Eliminar de Pacientes', pressed: false }),
    ).toBeVisible();
  });

  it('shows a decorative check mark only on pressed buttons, keeping its slot on the others', () => {
    renderItem(fullRow({ read: true }));

    const pressed = screen.getByRole('button', { name: 'Ver de Pacientes' });
    const unpressed = screen.getByRole('button', { name: 'Crear de Pacientes' });

    expect(markOf(pressed)).toHaveAttribute('aria-hidden', 'true');
    expect(markOf(pressed)).toBeVisible();
    // The slot is there (so the button does not change width when it is pressed), just not seen.
    expect(markOf(unpressed)).toHaveAttribute('aria-hidden', 'true');
    expect(markOf(unpressed)).not.toBeVisible();
  });

  it('shows only the name, with no buttons, for a module that has no action at all', () => {
    renderItem({ module: MODULE, cells: {} });

    expect(screen.getByRole('listitem')).toHaveTextContent('Pacientes');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('disables every button while pending, yet keeps the pressed ones pressed and marked (FR-008)', () => {
    renderItem(fullRow({ read: true, write: true }), true);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    const pressed = screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true });
    expect(markOf(pressed)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Modificar de Pacientes', pressed: false }),
    ).toBeDisabled();
  });

  describe('toggling (US2)', () => {
    it('pressing Crear with Ver not pressed presses both (FR-005)', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow()} />);

      await user.click(screen.getByRole('button', { name: 'Crear de Pacientes' }));

      expect(
        screen.getByRole('button', { name: 'Crear de Pacientes', pressed: true }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();
    });

    it('unpressing Ver unpresses the rest of the module', async () => {
      const user = userEvent.setup();
      render(
        <Harness initial={fullRow({ read: true, write: true, update: true, delete: true })} />,
      );

      await user.click(screen.getByRole('button', { name: 'Ver de Pacientes' }));

      for (const name of [
        'Ver de Pacientes',
        'Crear de Pacientes',
        'Modificar de Pacientes',
        'Eliminar de Pacientes',
      ]) {
        expect(screen.getByRole('button', { name, pressed: false })).toBeVisible();
      }
    });

    it('unpressing Crear only unpresses Crear', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow({ read: true, write: true, update: true })} />);

      await user.click(screen.getByRole('button', { name: 'Crear de Pacientes' }));

      expect(
        screen.getByRole('button', { name: 'Crear de Pacientes', pressed: false }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Modificar de Pacientes', pressed: true }),
      ).toBeVisible();
    });

    it('reports the new value of the action, once per click', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(<Harness initial={fullRow({ read: true })} onToggle={onToggle} />);

      await user.click(screen.getByRole('button', { name: 'Modificar de Pacientes' }));
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenLastCalledWith('update', true);

      await user.click(screen.getByRole('button', { name: 'Modificar de Pacientes' }));
      expect(onToggle).toHaveBeenCalledTimes(2);
      expect(onToggle).toHaveBeenLastCalledWith('update', false);
    });

    it('reports nothing while pending', () => {
      const onToggle = vi.fn();
      render(
        <List>
          <PermissionsListItem row={fullRow()} pending onToggle={onToggle} onToggleAll={vi.fn()} />
        </List>,
      );

      // `fireEvent`, not `user-event`: that one refuses to press an element with `pointer-events: none`.
      fireEvent.click(screen.getByRole('button', { name: 'Ver de Pacientes' }));

      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('"Todo el módulo" (US3)', () => {
    const ALL = 'Todo el módulo de Pacientes';

    it('is not part of the group of actions, and has no pressed state of its own to start with', () => {
      renderItem(fullRow({ read: true }));

      expect(within(screen.getByRole('group')).queryByRole('button', { name: ALL })).toBeNull();
      expect(screen.getByRole('button', { name: ALL, pressed: false })).toBeVisible();
    });

    it('pressing it with some action not pressed presses every action the module has, and no more', async () => {
      const user = userEvent.setup();
      const row: Row = {
        module: MODULE,
        cells: {
          read: { permissionId: 1, granted: false },
          update: { permissionId: 3, granted: false },
        },
      };
      render(<Harness initial={row} />);

      await user.click(screen.getByRole('button', { name: ALL }));

      expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Modificar de Pacientes', pressed: true }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: ALL, pressed: true })).toBeVisible();
      // An action the module does not have does not appear just because "Todo" was pressed.
      expect(screen.queryByRole('button', { name: 'Crear de Pacientes' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Eliminar de Pacientes' }),
      ).not.toBeInTheDocument();
    });

    it('pressing it with every action pressed unpresses them all', async () => {
      const user = userEvent.setup();
      render(
        <Harness initial={fullRow({ read: true, write: true, update: true, delete: true })} />,
      );

      await user.click(screen.getByRole('button', { name: ALL, pressed: true }));

      for (const name of [
        'Ver de Pacientes',
        'Crear de Pacientes',
        'Modificar de Pacientes',
        'Eliminar de Pacientes',
        ALL,
      ]) {
        expect(screen.getByRole('button', { name, pressed: false })).toBeVisible();
      }
    });

    it('looks not pressed while only some actions are, and presses itself with the last missing one', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow({ read: true, write: true, update: true })} />);

      expect(screen.getByRole('button', { name: ALL, pressed: false })).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Eliminar de Pacientes' }));

      expect(screen.getByRole('button', { name: ALL, pressed: true })).toBeVisible();
    });

    it('reports the value asked for: true to grant them all, false to revoke them', async () => {
      const onToggleAll = vi.fn();
      const user = userEvent.setup();
      render(<Harness initial={fullRow({ read: true })} onToggleAll={onToggleAll} />);

      await user.click(screen.getByRole('button', { name: ALL }));
      expect(onToggleAll).toHaveBeenLastCalledWith(true);

      await user.click(screen.getByRole('button', { name: ALL }));
      expect(onToggleAll).toHaveBeenLastCalledWith(false);
      expect(onToggleAll).toHaveBeenCalledTimes(2);
    });

    it('is not offered for a module with no action at all', () => {
      renderItem({ module: MODULE, cells: {} });

      expect(screen.queryByRole('button', { name: ALL })).not.toBeInTheDocument();
    });

    it('is disabled while pending, and keeps its check mark if every action is granted', () => {
      renderItem(fullRow({ read: true, write: true, update: true, delete: true }), true);

      const all = screen.getByRole('button', { name: ALL, pressed: true });
      expect(all).toBeDisabled();
      expect(markOf(all)).toBeVisible();
    });
  });

  describe('keyboard and accessible names (US4)', () => {
    it('enters the group of actions with one Tab and moves between its buttons with the arrows', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow()} />);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Ver de Pacientes' })).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: 'Crear de Pacientes' })).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('button', { name: 'Ver de Pacientes' })).toHaveFocus();
    });

    it('leaves the group with a single Tab: "Todo el módulo" is a stop of its own', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow()} />);

      await user.tab();
      await user.tab();

      expect(screen.getByRole('button', { name: 'Todo el módulo de Pacientes' })).toHaveFocus();
    });

    it('toggles the focused button with Space or Enter', async () => {
      const user = userEvent.setup();
      render(<Harness initial={fullRow()} />);

      await user.tab();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');

      expect(
        screen.getByRole('button', { name: 'Crear de Pacientes', pressed: true }),
      ).toBeVisible();
      // The Ver rule applied: Crear brought Ver with it.
      expect(screen.getByRole('button', { name: 'Ver de Pacientes', pressed: true })).toBeVisible();

      await user.keyboard(' ');

      expect(
        screen.getByRole('button', { name: 'Crear de Pacientes', pressed: false }),
      ).toBeVisible();
    });

    it('names every button "{Acción} de {Módulo}", which contains its visible text (FR-011)', () => {
      renderItem(fullRow());

      for (const button of screen.getAllByRole('button')) {
        const visible = button.textContent.trim();
        expect(visible).not.toBe('');
        expect(button).toHaveAccessibleName(expect.stringContaining(visible));
        expect(button).toHaveAccessibleName(expect.stringMatching(/ de Pacientes$/));
      }
    });
  });
});
