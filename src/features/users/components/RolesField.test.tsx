import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { roleRecordDto } from '@/test/factories';

import { roleSchema, type Role } from '../schemas/role';
import { RolesField } from './RolesField';

const CATALOG: Role[] = [
  roleSchema.parse(roleRecordDto({ id: 1, name: 'Administrator' })),
  roleSchema.parse(roleRecordDto({ id: 4, name: 'Marketing' })),
  roleSchema.parse(roleRecordDto({ id: 6, name: 'Doctor' })),
];

interface HarnessProps {
  readonly roles?: readonly Role[];
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
  readonly error?: string;
  readonly initial?: number[];
  readonly onRetry?: () => void;
  readonly onValue?: (ids: number[]) => void;
}

function Harness({
  roles = CATALOG,
  loading = false,
  loadFailed = false,
  error,
  initial = [],
  onRetry = () => undefined,
  onValue = () => undefined,
}: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <RolesField
      roles={roles}
      loading={loading}
      loadFailed={loadFailed}
      onRetry={onRetry}
      value={value}
      onChange={(ids) => {
        setValue(ids);
        onValue(ids);
      }}
      error={error}
    />
  );
}

function setup(props: HarnessProps = {}) {
  const user = userEvent.setup();
  const view = render(<Harness {...props} />);
  return { ...view, user };
}

const combobox = () => screen.getByRole('combobox', { name: /roles/i });

describe('RolesField', () => {
  it('offers the roles of the catalog by name', async () => {
    const { user } = setup();

    await user.click(combobox());

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Administrator', 'Marketing', 'Doctor']);
  });

  it('chooses several roles, shows each as a chip and gives back their ids', async () => {
    const onValue = vi.fn<(ids: number[]) => void>();
    const { user } = setup({ onValue });
    await user.click(combobox());

    await user.click(screen.getByRole('option', { name: 'Marketing' }));
    await user.click(screen.getByRole('option', { name: 'Doctor' }));

    expect(onValue).toHaveBeenLastCalledWith([4, 6]);
    expect(screen.getByText('Marketing', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Doctor', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('removes a role when its chip is deleted', async () => {
    const onValue = vi.fn<(ids: number[]) => void>();
    const { user } = setup({ initial: [4, 6], onValue });
    const chip = screen.getByText('Marketing', { selector: '.MuiChip-label' }).closest('div');
    expect(chip).not.toBeNull();

    await user.click(within(chip ?? document.body).getByTestId('CancelIcon'));

    expect(onValue).toHaveBeenLastCalledWith([6]);
  });

  it('is operated with the keyboard alone', async () => {
    const onValue = vi.fn<(ids: number[]) => void>();
    const { user } = setup({ onValue });

    await user.tab();
    expect(combobox()).toHaveFocus();
    // The first arrow opens the list, the next ones move over the options.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(onValue).toHaveBeenLastCalledWith([4]);
    await user.keyboard('{Backspace}');
    expect(onValue).toHaveBeenLastCalledWith([]);
  });

  it('is disabled with an indicator while the catalog loads', () => {
    setup({ roles: [], loading: true });

    expect(combobox()).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('says that there are no roles to choose from', () => {
    setup({ roles: [] });

    expect(screen.getByText(messages.users.form.rolesEmpty)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the error of the catalog with a retry', async () => {
    const onRetry = vi.fn<() => void>();
    const { user } = setup({ roles: [], loadFailed: true, onRetry });

    expect(screen.getByText(messages.users.form.rolesLoadError.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('ties the validation error to the field', () => {
    setup({ error: messages.users.validation.rolesRequired });

    expect(combobox()).toBeInvalid();
    expect(combobox()).toHaveAccessibleDescription(messages.users.validation.rolesRequired);
  });

  it('has no accessibility violations: with the catalog, loading, empty and failing', async () => {
    for (const props of [
      {},
      { roles: [], loading: true },
      { roles: [] },
      { roles: [], loadFailed: true },
      { error: messages.users.validation.rolesRequired },
    ] satisfies HarnessProps[]) {
      const { container, unmount } = setup(props);
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
