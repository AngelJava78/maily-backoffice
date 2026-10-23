import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { messages } from '@/shared/messages/es';

import type { RoleCapabilities } from '../policy/roleCapabilities';

const text = messages.roles.detail;

interface RoleDetailActionsProps {
  readonly capabilities: RoleCapabilities;
  readonly isDirty: boolean;
  readonly savePending: boolean;
  readonly duplicatePending: boolean;
  readonly onDiscard: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

/** "Guardar cambios"/"Descartar cambios"/"Duplicar"/"Eliminar role", each gated by its own
 * capability (research: "Nuevo role" and "Duplicar" both need `canCreate`). */
export function RoleDetailActions({
  capabilities,
  isDirty,
  savePending,
  duplicatePending,
  onDiscard,
  onDuplicate,
  onDelete,
}: RoleDetailActionsProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <Button
        type="submit"
        variant="contained"
        disabled={!isDirty || !capabilities.canEdit}
        loading={savePending}
      >
        {text.save}
      </Button>
      <Button onClick={onDiscard} disabled={!isDirty || savePending || !capabilities.canEdit}>
        {text.discard}
      </Button>
      {capabilities.canCreate && (
        <Button disabled={duplicatePending} loading={duplicatePending} onClick={onDuplicate}>
          {text.duplicate}
        </Button>
      )}
      {capabilities.canDelete && (
        <Button color="error" disabled={savePending} onClick={onDelete}>
          {messages.roles.delete.action}
        </Button>
      )}
    </Stack>
  );
}
