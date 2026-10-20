import { act, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';
import type { AppNotification } from '@/shared/ui/Notifications';
import { createWrapper } from '@/test/renderWithProviders';

import type { SubscriptionErrorOutcome } from '../api/subscriptionErrors';
import { useNotifySubscriptionError } from './useNotifySubscriptionError';

const text = messages.subscriptions.errors;

const refusal = (status: number, code: string) =>
  ApiError.fromResponse(status, { code, message: 'Un mensaje de la API' });

function setup(deliver?: (notification: AppNotification) => void) {
  const { wrapper } = createWrapper();
  return renderHook(() => useNotifySubscriptionError(deliver), { wrapper });
}

describe('useNotifySubscriptionError', () => {
  it('shows what the screen showed and is not true any more as a warning, and gives back the outcome', async () => {
    const { result } = setup();

    let outcome: SubscriptionErrorOutcome | undefined;
    act(() => {
      outcome = result.current(refusal(409, 'subscription_status_unchanged'), 'changeStatus');
    });

    expect(outcome).toEqual({ kind: 'statusUnchanged', message: text.statusUnchanged });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.statusUnchanged);
    expect(alert).toHaveClass('MuiAlert-colorWarning');
  });

  it('shows a failure that can be retried as an error', async () => {
    const { result } = setup();

    act(() => {
      result.current(ApiError.network(), 'delete');
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.retryable);
    expect(alert).toHaveClass('MuiAlert-colorError');
    expect(alert).not.toHaveTextContent('Un mensaje de la API');
  });

  it('shows nothing for a lack of permission, but still tells what it is', () => {
    const { result } = setup();

    let outcome: SubscriptionErrorOutcome | undefined;
    act(() => {
      outcome = result.current(refusal(403, 'permission_denied'), 'update');
    });

    expect(outcome).toMatchObject({ kind: 'forbidden' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hands the notification to the function it is given, to show it later', () => {
    const deliver = vi.fn<(notification: AppNotification) => void>();
    const { result } = setup(deliver);

    act(() => {
      result.current(refusal(409, 'subscription_has_clinics'), 'delete');
    });

    expect(deliver).toHaveBeenCalledExactlyOnceWith({
      severity: 'warning',
      message: text.hasClinics,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not hand anything for a lack of permission either', () => {
    const deliver = vi.fn<(notification: AppNotification) => void>();
    const { result } = setup(deliver);

    act(() => {
      result.current(refusal(403, 'permission_denied'), 'delete');
    });

    expect(deliver).not.toHaveBeenCalled();
  });
});
