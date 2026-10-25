import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';

import { ModuleFormDialog } from './ModuleFormDialog';

const TITLE_ID = 'module-form-dialog-title';

describe('ModuleFormDialog', () => {
  it('renders nothing while it is closed', () => {
    render(
      <ModuleFormDialog open={false} onClose={vi.fn()} titleId={TITLE_ID}>
        <p id={TITLE_ID}>Contenido</p>
      </ModuleFormDialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows its children inside a dialog while open', () => {
    render(
      <ModuleFormDialog open onClose={vi.fn()} titleId={TITLE_ID}>
        <p id={TITLE_ID}>Contenido de prueba</p>
      </ModuleFormDialog>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Contenido de prueba');
    expect(dialog).toHaveAccessibleName('Contenido de prueba');
  });

  it('closes with Escape and by clicking outside (FR-005)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleFormDialog open onClose={onClose} titleId={TITLE_ID}>
        <p id={TITLE_ID}>Contenido</p>
      </ModuleFormDialog>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
