import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useNotify } from '@/shared/ui/Notifications';

import { describeModuleError } from '../api/moduleErrors';
import { useChangeModuleStatus } from '../hooks/useChangeModuleStatus';
import { useDeleteModule } from '../hooks/useDeleteModule';
import { MODULE_STATUS } from '../schemas/moduleActionCatalog';
import { isProtectedModule, type SystemModule } from '../schemas/systemModule';
import type { ModuleCapabilities } from '..';

const text = messages.modules;

interface ModuleDangerZoneProps {
  readonly module: SystemModule;
  readonly capabilities: ModuleCapabilities;
  /** The module was deleted (US5): the caller closes this panel, since there is nothing left to edit. */
  readonly onDeleted: () => void;
}

/**
 * The "Bloquear o eliminar" section of `ModuleEditPanel` (US4, US5). Bloquear/Desbloquear take
 * effect at once (spec.md: reversible and frequent enough to need no confirmation of their own);
 * Eliminar does confirm, naming the module (constitution VI, irreversible). Hidden entirely for a
 * protected module, where an explanation replaces every action.
 */
export function ModuleDangerZone({ module, capabilities, onDeleted }: ModuleDangerZoneProps) {
  const notify = useNotify();
  const changeStatus = useChangeModuleStatus();
  const deleteModuleMutation = useDeleteModule();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!capabilities.canBlock && !capabilities.canUnblock && !capabilities.canDelete) {
    return null;
  }

  // Prefers what the service just confirmed over the prop (constitution IV: no optimistic update),
  // so the button flips right after a success without waiting for the catalog to be asked again.
  const statusId = changeStatus.data?.statusId ?? module.statusId;

  function toggleStatus(): void {
    const action = statusId === MODULE_STATUS.ACTIVE ? 'block' : 'unblock';
    changeStatus.mutate(
      { moduleId: module.id, action },
      {
        onSuccess: () => {
          notify({
            severity: 'success',
            message: action === 'block' ? text.notices.blocked : text.notices.unblocked,
          });
        },
        onError: (error) => {
          notify({ severity: 'error', message: describeModuleError(error, action).message });
        },
      },
    );
  }

  function confirmDelete(): void {
    deleteModuleMutation.mutate(module.id, {
      onSuccess: () => {
        setConfirmingDelete(false);
        notify({ severity: 'success', message: text.blockSection.deleted });
        onDeleted();
      },
      onError: (error) => {
        setConfirmingDelete(false);
        notify({ severity: 'error', message: describeModuleError(error, 'delete').message });
      },
    });
  }

  return (
    <Stack component="section" spacing={1} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" component="p">
        {text.blockSection.help}
      </Typography>
      {isProtectedModule(module.key) ? (
        <Alert severity="info">{text.blockSection.protectedNotice}</Alert>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {(capabilities.canBlock || capabilities.canUnblock) && (
            <Button
              variant="outlined"
              color={statusId === MODULE_STATUS.ACTIVE ? 'warning' : 'success'}
              loading={changeStatus.isPending}
              onClick={toggleStatus}
            >
              {statusId === MODULE_STATUS.ACTIVE
                ? text.blockSection.block
                : text.blockSection.unblock}
            </Button>
          )}
          {capabilities.canDelete && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setConfirmingDelete(true);
              }}
            >
              {text.blockSection.delete}
            </Button>
          )}
        </Stack>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title={text.blockSection.delete}
        message={text.blockSection.deleteConfirm(module.name)}
        confirmLabel={text.blockSection.deleteConfirmButton}
        pending={deleteModuleMutation.isPending}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </Stack>
  );
}
