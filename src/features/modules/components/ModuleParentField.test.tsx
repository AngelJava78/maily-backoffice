import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { initialModuleFormValues, type ModuleFormValues } from '../schemas/moduleForm';
import { ModuleParentField } from './ModuleParentField';

const OPTIONS = [
  { id: 2, key: 'inventory', name: 'Inventario' },
  { id: 6, key: 'patients', name: 'Pacientes' },
];

type FieldProps = Partial<Omit<ComponentProps<typeof ModuleParentField>, 'control'>>;

/** The field inside a real form, with its value written out to be read. */
function Harness({ initial = '', ...props }: FieldProps & { readonly initial?: string }) {
  const { control } = useForm<ModuleFormValues>({
    defaultValues: { ...initialModuleFormValues, parentModuleId: initial },
  });
  return (
    <>
      <ModuleParentField
        control={control}
        options={OPTIONS}
        status="ready"
        currentParent={null}
        {...props}
      />
      <output data-testid="value">{useWatch({ control, name: 'parentModuleId' })}</output>
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'Módulo padre' });

describe('ModuleParentField', () => {
  it('is labelled "Módulo padre" and starts with "Ninguno (módulo de primer nivel)"', () => {
    render(<Harness />);

    expect(field()).toHaveTextContent('Ninguno (módulo de primer nivel)');
    expect(
      screen.getByText('Opcional. Un submódulo es del mismo tipo que su módulo padre.'),
    ).toBeVisible();
  });

  it('offers "Ninguno" first and then the modules it is given, in order', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Ninguno (módulo de primer nivel)',
      'Inventario',
      'Pacientes',
    ]);
  });

  it('writes the id of the module chosen, as text, and "" for "Ninguno"', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.click(screen.getByRole('option', { name: 'Pacientes' }));
    expect(screen.getByTestId('value')).toHaveTextContent('6');

    await user.click(field());
    await user.click(screen.getByRole('option', { name: 'Ninguno (módulo de primer nivel)' }));
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });

  it('can be operated with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    field().focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  it('shows the current parent as a value even when it is not among the options (a Blocked one)', () => {
    render(<Harness initial="9" currentParent={{ id: 9, key: 'reports', name: 'Reportes' }} />);

    expect(field()).toHaveTextContent('Reportes');
  });

  it('is disabled, with the reason, when it is locked', () => {
    render(
      <Harness lockedReason="Este módulo tiene submódulos, así que no puede tener un módulo padre." />,
    );

    expect(field()).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Este módulo tiene submódulos, así que no puede tener un módulo padre.'),
    ).toBeVisible();
  });

  it('is disabled while its options load, and when they could not be loaded, each with its text', () => {
    const { unmount } = render(<Harness status="loading" />);
    expect(field()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Cargando módulos…')).toBeVisible();
    unmount();

    render(<Harness status="error" />);
    expect(field()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('No se pudieron cargar los módulos padre.')).toBeVisible();
  });

  it('shows the refusal of the service below the field, and marks it invalid', () => {
    render(<Harness error="Ese módulo ya es un submódulo y no puede ser padre." />);

    expect(screen.getByText('Ese módulo ya es un submódulo y no puede ser padre.')).toBeVisible();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Harness />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
