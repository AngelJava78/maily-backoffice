import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Module } from '../schemas/module';
import {
  ACTION_KEYS,
  withAllPermissionsToggled,
  withPermissionToggled,
  type PermissionMatrixRow as Row,
} from '../schemas/permissionMatrix';
import { PermissionsMatrixRow } from './PermissionsMatrixRow';

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

/** A stateful harness: applies the same pure rules `RoleDetailPanel` will use. */
function Harness({
  initial,
  pending = false,
}: {
  readonly initial: Row;
  readonly pending?: boolean;
}) {
  const [row, setRow] = useState(initial);
  return (
    <Table>
      <TableBody>
        <PermissionsMatrixRow
          row={row}
          columns={ACTION_KEYS}
          pending={pending}
          onToggle={(actionKey, checked) => {
            setRow(withPermissionToggled(row, actionKey, checked));
          }}
          onToggleAll={(checked) => {
            setRow(withAllPermissionsToggled(row, checked));
          }}
        />
      </TableBody>
    </Table>
  );
}

describe('PermissionsMatrixRow', () => {
  it('shows the module name as the row header', () => {
    render(
      <Table>
        <TableBody>
          <PermissionsMatrixRow
            row={fullRow()}
            columns={ACTION_KEYS}
            pending={false}
            onToggle={vi.fn()}
            onToggleAll={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole('rowheader', { name: 'Pacientes' })).toBeInTheDocument();
  });

  it('only paints a checkbox for the actions the module actually has, even if the table has more columns', () => {
    const row: Row = { module: MODULE, cells: { read: { permissionId: 1, granted: true } } };
    render(
      <Table>
        <TableBody>
          <PermissionsMatrixRow
            row={row}
            columns={ACTION_KEYS}
            pending={false}
            onToggle={vi.fn()}
            onToggleAll={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(2); // Ver + "Todo el módulo"
  });

  it('checking Crear also checks Ver', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullRow()} />);

    await user.click(screen.getByRole('checkbox', { name: /Crear/ }));

    expect(screen.getByRole('checkbox', { name: /Crear/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Ver/ })).toBeChecked();
  });

  it('unchecking Ver unchecks the rest of the row', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullRow({ read: true, write: true, update: true, delete: true })} />);

    await user.click(screen.getByRole('checkbox', { name: /^Ver/ }));

    for (const label of [/^Ver/, /Crear/, /Modificar/, /Eliminar/]) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked();
    }
  });

  it('"Todo el módulo" checks or unchecks every present cell at once', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullRow()} />);

    await user.click(screen.getByRole('checkbox', { name: /Todo el módulo/ }));
    for (const label of [/^Ver/, /Crear/, /Modificar/, /Eliminar/]) {
      expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
    }

    await user.click(screen.getByRole('checkbox', { name: /Todo el módulo/ }));
    for (const label of [/^Ver/, /Crear/, /Modificar/, /Eliminar/]) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked();
    }
  });

  it('disables every checkbox while pending', () => {
    render(
      <Table>
        <TableBody>
          <PermissionsMatrixRow
            row={fullRow()}
            columns={ACTION_KEYS}
            pending
            onToggle={vi.fn()}
            onToggleAll={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });
});
