import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import type { AppNotification } from '@/shared/ui/Notifications';
import { useDeferredNotice } from '@/shared/ui/useDeferredNotice';

import { useDeleteSubscription } from '../hooks/useDeleteSubscription';
import { useNotifySubscriptionError } from '../hooks/useNotifySubscriptionError';
import { getDeleteAvailability } from '../policy/subscriptionActions';
import type { Subscription } from '../schemas/subscription';
import { parseSubscriptionDetailState } from '../schemas/subscriptionDetailState';

const text = messages.subscriptions;

/**
 * «Eliminar» (decision 6 of the spec). With clinics the action is disabled and says why, in a text
 * that is seen and read with the button; when the number is not known, it is offered and the
 * platform decides. It asks first, naming the subscription and saying that it cannot be undone. On
 * success the person goes back to the list it came from, at the same page; a refusal is told once
 * the dialog has closed, and the detail shows the subscription as it is now.
 */
export function DeleteSubscriptionAction({
  subscription,
}: {
  readonly subscription: Subscription;
}) {
  const navigate = useNavigate();
  const { listSearch } = parseSubscriptionDetailState(useLocation().state);
  const { defer, flush } = useDeferredNotice();
  const remove = useDeleteSubscription(subscription.id);
  const [open, setOpen] = useState(false);
  // While the dialog is on screen, or fading out, the rest of the page is hidden from a screen reader.
  const covered = useRef(false);
  const reasonId = useId();
  const availability = getDeleteAvailability(subscription.clinicsCount);

  /** Tells a notice now, or once the dialog has closed. */
  const tell = (notification: AppNotification) => {
    defer(notification);
    if (!covered.current) {
      flush();
    }
  };
  const notifyError = useNotifySubscriptionError(tell);

  // A refusal can take the action away with the page (a subscription that another person deleted
  // shows that it does not exist), and a deletion leaves the page: nothing is left to wait for.
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
          // The detail is forgotten once the list is on screen, so it does not ask for it again.
          void Promise.resolve(navigate(`/subscriptions${listSearch ?? ''}`)).then(remove.forget);
        },
        (error: unknown) => {
          notifyError(error, 'delete');
        },
      )
      .finally(() => {
        setOpen(false);
      });
  }

  return (
    <>
      <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          disabled={availability.kind === 'blocked'}
          aria-describedby={availability.kind === 'blocked' ? reasonId : undefined}
          onClick={() => {
            covered.current = true;
            setOpen(true);
          }}
        >
          {text.actions.delete}
        </Button>
        {availability.kind === 'blocked' && (
          <Typography id={reasonId} variant="body2" color="text.secondary">
            {text.deleteBlocked(availability.clinics)}
          </Typography>
        )}
      </Stack>
      <ConfirmDialog
        open={open}
        title={text.dialogs.delete.title}
        message={text.dialogs.delete.body(subscription.name)}
        confirmLabel={text.dialogs.delete.confirm}
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
