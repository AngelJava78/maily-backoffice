import Button from '@mui/material/Button';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import type { AppNotification } from '@/shared/ui/Notifications';
import { useDeferredNotice } from '@/shared/ui/useDeferredNotice';

import { describeMonitoredComponentError } from '../api/monitoredComponentErrors';
import { useDeleteMonitoredComponent } from '../hooks/useMonitoredComponentMutations';
import type { MonitoredComponent } from '../schemas/monitoredComponent';

const text = messages.health.registry;

/**
 * «Eliminar» (FR-040). It asks first, naming the component and saying that it stops being
 * monitored and leaves «Salud de servicios»; cancelling changes nothing and gives the focus back to
 * the button. On success the person goes back to the list, where it is gone, with a notice; a
 * component that another person deleted takes them there too (FR-039). A notice is told once the
 * dialog has closed, so a screen reader reads it.
 */
export function DeleteComponentAction({ component }: { readonly component: MonitoredComponent }) {
  const navigate = useNavigate();
  const { defer, flush } = useDeferredNotice();
  const remove = useDeleteMonitoredComponent(component.id);
  const [open, setOpen] = useState(false);
  // While the dialog is on screen, or fading out, the rest of the page is hidden from a screen reader.
  const covered = useRef(false);

  /** Tells a notice now, or once the dialog has closed. */
  const tell = (notification: AppNotification) => {
    defer(notification);
    if (!covered.current) {
      flush();
    }
  };

  // A deletion leaves the page: nothing is left to wait for.
  useEffect(
    () => () => {
      covered.current = false;
    },
    [],
  );

  function confirm() {
    // A dialog that is fading out can still be clicked: what it asked was already sent.
    if (!open) {
      return;
    }
    // `mutateAsync` and not `mutate`: its result is told even if the action went away meanwhile.
    void remove
      .mutateAsync()
      .then(
        () => {
          tell({ severity: 'success', message: text.notices.deleted });
          void navigate('/health/components');
        },
        (error: unknown) => {
          const outcome = describeMonitoredComponentError(error, 'delete');
          if (outcome.kind === 'notFound') {
            tell({ severity: 'warning', message: outcome.message });
            void navigate('/health/components');
          } else if (outcome.kind !== 'forbidden') {
            tell({ severity: 'error', message: outcome.message });
          }
        },
      )
      .finally(() => {
        setOpen(false);
      });
  }

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        startIcon={<Icon name="delete" decorative />}
        onClick={() => {
          covered.current = true;
          setOpen(true);
        }}
      >
        {text.delete}
      </Button>
      <ConfirmDialog
        open={open}
        title={text.deleteDialog.title(component.name)}
        message={text.deleteDialog.message}
        confirmLabel={text.deleteDialog.confirm}
        tone="danger"
        pending={remove.isPending}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
        }}
        onExited={() => {
          covered.current = false;
          flush();
        }}
      />
    </>
  );
}
