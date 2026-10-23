import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/messages/es';

import { RoleDetailActions } from './RoleDetailActions';

const text = messages.roles.detail;
const FULL_CAPABILITIES = { canCreate: true, canEdit: true, canDelete: true };

describe('RoleDetailActions', () => {
  it('shows "Guardar cambios", "Descartar cambios", "Duplicar" and "Eliminar role" when every capability is there', () => {
    render(
      <RoleDetailActions
        capabilities={FULL_CAPABILITIES}
        isDirty={false}
        savePending={false}
        duplicatePending={false}
        onDiscard={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: text.save })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.discard })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.duplicate })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.roles.delete.action })).toBeInTheDocument();
  });

  it('disables "Guardar cambios"/"Descartar cambios" without pending changes, and enables them with', () => {
    const { rerender } = render(
      <RoleDetailActions
        capabilities={FULL_CAPABILITIES}
        isDirty={false}
        savePending={false}
        duplicatePending={false}
        onDiscard={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeDisabled();

    rerender(
      <RoleDetailActions
        capabilities={FULL_CAPABILITIES}
        isDirty
        savePending={false}
        duplicatePending={false}
        onDiscard={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: text.save })).toBeEnabled();
    expect(screen.getByRole('button', { name: text.discard })).toBeEnabled();
  });

  it('offers neither "Duplicar" nor "Eliminar role" without canCreate/canDelete', () => {
    render(
      <RoleDetailActions
        capabilities={{ canCreate: false, canEdit: true, canDelete: false }}
        isDirty={false}
        savePending={false}
        duplicatePending={false}
        onDiscard={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: text.duplicate })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: messages.roles.delete.action }),
    ).not.toBeInTheDocument();
  });

  it('never enables "Guardar cambios" without canEdit, even with pending changes', () => {
    render(
      <RoleDetailActions
        capabilities={{ canCreate: false, canEdit: false, canDelete: false }}
        isDirty
        savePending={false}
        duplicatePending={false}
        onDiscard={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: text.save })).toBeDisabled();
  });
});
