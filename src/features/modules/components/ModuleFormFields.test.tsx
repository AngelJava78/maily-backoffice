import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

import type { ModuleActionKey } from '../schemas/moduleActionCatalog';
import { initialModuleFormValues, type ModuleFormValues } from '../schemas/moduleForm';
import { ModuleFormFields } from './ModuleFormFields';

function Harness({
  moduleKey = 'appointments',
  orderHelp = 'Opcional. Si lo dejas vacío, queda al final (160).',
  actions = initialModuleFormValues.actions,
  onActionToggle = vi.fn(),
  withError = false,
}: {
  readonly moduleKey?: string;
  readonly orderHelp?: string;
  readonly actions?: ReadonlySet<ModuleActionKey>;
  readonly onActionToggle?: (action: ModuleActionKey, checked: boolean) => void;
  readonly withError?: boolean;
}) {
  const { register, formState, setError } = useForm<ModuleFormValues>({
    defaultValues: initialModuleFormValues,
  });
  useEffect(() => {
    if (withError) {
      setError('name', { type: 'server', message: 'Escribe el nombre del módulo.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withError]);
  return (
    <ModuleFormFields
      register={register}
      errors={formState.errors}
      moduleKey={moduleKey}
      orderHelp={orderHelp}
      actions={actions}
      onActionToggle={onActionToggle}
    />
  );
}

describe('ModuleFormFields', () => {
  it('shows Nombre, Descripción and Orden with their help text', () => {
    render(<Harness />);

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toBeInTheDocument();
    expect(screen.getByText('Opcional. Hasta 500 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Orden' })).toBeInTheDocument();
    expect(screen.getByText('Opcional. Si lo dejas vacío, queda al final (160).')).toBeInTheDocument();
  });

  it('shows whatever Orden help text the caller gives (alta and edición mean different things by empty)', () => {
    render(<Harness orderHelp="Opcional. Si lo dejas vacío, queda como estaba." />);

    expect(screen.getByText('Opcional. Si lo dejas vacío, queda como estaba.')).toBeInTheDocument();
  });

  it('shows the four actions, each with its permission name under the moduleKey given', () => {
    render(<Harness moduleKey="appointments" />);

    expect(screen.getByRole('checkbox', { name: /Ver/ })).toBeInTheDocument();
    expect(screen.getByText('appointments:read')).toBeInTheDocument();
    expect(screen.getByText('appointments:write')).toBeInTheDocument();
    expect(screen.getByText('appointments:update')).toBeInTheDocument();
    expect(screen.getByText('appointments:delete')).toBeInTheDocument();
  });

  it('is a fieldset with a legend for the actions group', () => {
    render(<Harness />);

    const group = screen.getByRole('group', { name: 'Acciones del módulo' });
    expect(group.tagName).toBe('FIELDSET');
  });

  it('shows "Ver" checked and disabled from being unchecked when it is in `actions`', () => {
    render(<Harness actions={new Set(['read', 'write'])} />);

    const read = screen.getByRole('checkbox', { name: /Ver/ });
    expect(read).toBeChecked();
    expect(read).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Crear/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Modificar/ })).not.toBeChecked();
  });

  it('calls onActionToggle when another action is checked or unchecked', async () => {
    const user = userEvent.setup();
    const onActionToggle = vi.fn();
    render(<Harness actions={new Set(['read', 'write'])} onActionToggle={onActionToggle} />);

    await user.click(screen.getByRole('checkbox', { name: /Crear/ }));
    expect(onActionToggle).toHaveBeenCalledWith('write', false);

    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    expect(onActionToggle).toHaveBeenCalledWith('update', true);
  });

  it('does not render Clave nor Tipo: the caller owns those (create shows editable cards, edit shows fixed info)', () => {
    render(<Harness />);

    expect(screen.queryByRole('textbox', { name: 'Clave' })).not.toBeInTheDocument();
    expect(screen.queryByText('La clave y el tipo no cambian nunca.')).not.toBeInTheDocument();
  });

  it('associates a field error with its input', () => {
    render(<Harness withError />);

    const field = screen.getByRole('textbox', { name: 'Nombre' });
    expect(field).toHaveAccessibleDescription('Escribe el nombre del módulo.');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Harness actions={new Set(['read', 'write'])} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
