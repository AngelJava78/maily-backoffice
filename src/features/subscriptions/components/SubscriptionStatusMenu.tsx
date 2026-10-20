import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useEffect, useId, useRef, useState } from 'react';

import { messages } from '@/shared/messages/es';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { afterDialogClosed, focusIfLost } from '@/shared/ui/focusIfLost';
import type { AppNotification } from '@/shared/ui/Notifications';
import { useDeferredNotice } from '@/shared/ui/useDeferredNotice';

import { useChangeSubscriptionStatus } from '../hooks/useChangeSubscriptionStatus';
import { useNotifySubscriptionError } from '../hooks/useNotifySubscriptionError';
import {
  getStatusTargets,
  needsStatusConfirmation,
  type ConfirmedStatusId,
} from '../policy/subscriptionActions';
import type { Subscription } from '../schemas/subscription';
import type { ChangeableStatusId } from '../schemas/subscriptionStatus';

const text = messages.subscriptions;

/** The verb of the menu, the dialog that asks first (if any) and the notice of each status. */
const TARGETS = {
  1: { verb: text.statusTargets.activate, dialog: null, notice: text.statusNotices.activated },
  2: {
    verb: text.statusTargets.inactivate,
    dialog: text.dialogs.inactivate,
    notice: text.statusNotices.inactivated,
  },
  3: {
    verb: text.statusTargets.block,
    dialog: text.dialogs.block,
    notice: text.statusNotices.blocked,
  },
} as const satisfies Record<ChangeableStatusId, unknown>;

/** The status being confirmed. `open` ends before the target does, to leave the dialog fading out. */
interface Confirmation {
  readonly target: ConfirmedStatusId;
  readonly open: boolean;
}

/**
 * «Cambiar estatus»: a menu with the statuses that the subscription does not have (decision 5 of
 * the spec). Inactivating and blocking ask first, naming the subscription and the new status;
 * activating is applied directly. While the menu or the dialog is on screen, or fading out, the rest
 * of the page is hidden from a screen reader, so the result is told once they have closed. The
 * button keeps its place before and after a change, and the focus goes back to it.
 */
export function SubscriptionStatusMenu({ subscription }: { readonly subscription: Subscription }) {
  const { defer, flush } = useDeferredNotice();
  const change = useChangeSubscriptionStatus(subscription.id);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // From the moment the menu opens until the last of the menu and the dialog has finished closing.
  const covered = useRef(false);
  const ids = { button: useId(), menu: useId() };

  /** Tells a notice now, or once nothing covers the page any more. */
  const tell = (notification: AppNotification) => {
    defer(notification);
    if (!covered.current) {
      flush();
    }
  };
  const notifyError = useNotifySubscriptionError(tell);

  const uncover = () => {
    covered.current = false;
    flush();
  };

  // A refusal can take the menu away with the page (a subscription that another person deleted
  // shows that it does not exist): what is told afterwards has nothing left to wait for.
  useEffect(
    () => () => {
      covered.current = false;
    },
    [],
  );

  const closeDialog = () => {
    setConfirmation((current) => (current === null ? null : { ...current, open: false }));
  };

  // `mutateAsync` and not `mutate`: its result is told even if the menu went away meanwhile.
  function apply(target: ChangeableStatusId) {
    void change
      .mutateAsync({ statusId: target })
      .then(
        () => {
          tell({ severity: 'success', message: TARGETS[target].notice });
        },
        (error: unknown) => {
          notifyError(error, 'changeStatus');
        },
      )
      .finally(closeDialog);
  }

  function choose(target: ChangeableStatusId) {
    setAnchor(null);
    if (needsStatusConfirmation(target)) {
      setConfirmation({ target, open: true });
    } else {
      apply(target);
    }
  }

  function confirm() {
    // A dialog that is fading out can still be clicked: what it asked was already sent.
    if (!confirmation?.open) {
      return;
    }
    apply(confirmation.target);
  }

  const dialog = confirmation === null ? null : TARGETS[confirmation.target].dialog;

  return (
    <>
      <Button
        ref={buttonRef}
        id={ids.button}
        variant="outlined"
        endIcon={<ArrowDropDownIcon />}
        aria-haspopup="menu"
        aria-controls={anchor === null ? undefined : ids.menu}
        aria-expanded={anchor === null ? undefined : 'true'}
        // While an activation is sent: the other changes wait in their dialog.
        loading={change.isPending && confirmation?.open !== true}
        onClick={(event) => {
          covered.current = true;
          setAnchor(event.currentTarget);
        }}
      >
        {text.actions.changeStatus}
      </Button>
      <Menu
        id={ids.menu}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
        slotProps={{
          list: { 'aria-labelledby': ids.button },
          transition: {
            // A dialog that was opened from the menu covers the page in its place.
            onExited: () => {
              if (confirmation?.open !== true) {
                uncover();
              }
            },
          },
        }}
      >
        {getStatusTargets(subscription.status.id).map((target) => (
          <MenuItem
            key={target}
            onClick={() => {
              choose(target);
            }}
          >
            {TARGETS[target].verb}
          </MenuItem>
        ))}
      </Menu>
      {confirmation !== null && dialog !== null && (
        <ConfirmDialog
          open={confirmation.open}
          title={dialog.title}
          message={dialog.body(subscription.name)}
          confirmLabel={dialog.confirm}
          tone={confirmation.target === 3 ? 'danger' : 'default'}
          pending={change.isPending}
          onConfirm={confirm}
          onCancel={closeDialog}
          onExited={() => {
            uncover();
            afterDialogClosed(() => {
              focusIfLost(buttonRef.current);
            });
          }}
        />
      )}
    </>
  );
}
