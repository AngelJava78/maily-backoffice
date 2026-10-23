import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

const text = messages.roles.delete;

interface DeleteRoleDialogProps {
  readonly open: boolean;
  readonly roleName: string;
  /** The deletion is running: nothing can be clicked and the dialog cannot be dismissed. */
  readonly pending?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Called once the dialog has finished closing, which is when a notice can be announced. */
  readonly onExited?: () => void;
}

/**
 * "Eliminar role" (Historia 3, FR-015): names the role and warns that deleting cannot be undone,
 * same as the mockup. Deleting is allowed even if the role is assigned to people or clinics (edge
 * case of spec.md): this dialog does not check that, it only asks for the explicit confirmation.
 */
export function DeleteRoleDialog({
  open,
  roleName,
  pending = false,
  onConfirm,
  onCancel,
  onExited,
}: DeleteRoleDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={text.confirmTitle(roleName)}
      message={text.confirmBody}
      confirmLabel={text.confirm}
      cancelLabel={text.cancel}
      tone="danger"
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onExited={onExited}
    />
  );
}
