import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import type { Role } from '../schemas/role';
import { CopyPermissionsFromField } from './CopyPermissionsFromField';

const text = messages.roles.form;

function role(overrides: Partial<Role>): Role {
  return {
    id: 0,
    name: '',
    description: null,
    createdAt: '2026-10-15T05:57:30.521Z',
    status: { id: 1, name: 'Activo' },
    type: { id: 1, name: 'Sistema' },
    ...overrides,
  };
}

const ALL_ROLES = [
  role({ id: 1, name: 'Administrator', type: { id: 1, name: 'Sistema' } }),
  role({ id: 2, name: 'Developer', type: { id: 1, name: 'Sistema' } }),
  role({ id: 6, name: 'Owner', type: { id: 2, name: 'Clínica' } }),
];

function Harness({ initialTypeId = 1 }: { readonly initialTypeId?: 1 | 2 }) {
  const [typeId, setTypeId] = useState<1 | 2>(initialTypeId);
  const [value, setValue] = useState<number | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTypeId(typeId === 1 ? 2 : 1);
        }}
      >
        toggle type
      </button>
      <CopyPermissionsFromField
        typeId={typeId}
        roles={ALL_ROLES}
        value={value}
        onChange={setValue}
      />
    </>
  );
}

describe('CopyPermissionsFromField', () => {
  it('starts with nothing selected', () => {
    render(<Harness />);

    expect(screen.getByLabelText(text.copyFrom)).toHaveValue('');
  });

  it('only offers roles of the chosen type', async () => {
    const user = userEvent.setup();
    render(<Harness initialTypeId={1} />);

    await user.click(screen.getByLabelText(text.copyFrom));

    expect(screen.getByRole('option', { name: 'Administrator' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Developer' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
  });

  it('switches its options when the form type changes (US2-3, FR-006)', async () => {
    const user = userEvent.setup();
    render(<Harness initialTypeId={1} />);

    await user.click(screen.getByText('toggle type'));
    await user.click(screen.getByLabelText(text.copyFrom));

    expect(screen.getByRole('option', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Administrator' })).not.toBeInTheDocument();
  });

  it('reports the chosen role id, and clears it with onChange(null)', async () => {
    const onChange = vi.fn<(roleId: number | null) => void>();
    const user = userEvent.setup();
    render(
      <CopyPermissionsFromField typeId={1} roles={ALL_ROLES} value={null} onChange={onChange} />,
    );

    await user.click(screen.getByLabelText(text.copyFrom));
    await user.click(screen.getByRole('option', { name: 'Developer' }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows nothing selected when the stored id no longer matches an offered role', () => {
    render(<CopyPermissionsFromField typeId={2} roles={ALL_ROLES} value={1} onChange={vi.fn()} />);

    expect(screen.getByLabelText(text.copyFrom)).toHaveValue('');
  });
});
