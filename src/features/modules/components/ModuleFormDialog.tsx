import Dialog from '@mui/material/Dialog';
import type { ReactNode } from 'react';

interface ModuleFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The `id` its content's own `DialogTitle` uses, so the dialog names itself accessibly. */
  readonly titleId: string;
  readonly children: ReactNode;
}

/**
 * The shell of "Nuevo módulo"/"Editar módulo" (spec 017): only opens, closes and names itself —
 * the content (`ModuleCreatePanel`/`ModuleEditPanel`) brings its own `DialogTitle`/`DialogContent`/
 * `DialogActions`. One instance, reused for both, so moving from creating to editing the module
 * just created (FR-007) is a content swap inside the same dialog, not a close-then-reopen.
 */
export function ModuleFormDialog({ open, onClose, titleId, children }: ModuleFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      {children}
    </Dialog>
  );
}
