import { act, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { messages } from '@/shared/messages/es';
import { createWrapper } from '@/test/renderWithProviders';

import type { UserErrorOutcome } from '../api/userErrors';
import { useNotifyUserError } from './useNotifyUserError';

const refusal = (status: number, code: string) =>
  ApiError.fromResponse(status, { code, message: 'Un mensaje del servicio' });

function setup() {
  const { wrapper } = createWrapper();
  return renderHook(() => useNotifyUserError(), { wrapper });
}

describe('useNotifyUserError', () => {
  it('shows the failure as a notification and gives back what it is', async () => {
    const { result } = setup();

    let outcome: UserErrorOutcome | undefined;
    act(() => {
      outcome = result.current(refusal(409, 'user_blocked'), 'unassignRole');
    });

    expect(outcome).toEqual({
      kind: 'statusChanged',
      message: messages.users.errors.statusChanged,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.users.errors.statusChanged);
  });

  it('shows a failure of the network as an error that can be tried again', async () => {
    const { result } = setup();

    act(() => {
      result.current(ApiError.network(), 'block');
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.users.errors.retryable);
  });

  it('shows nothing for a lack of permission, but still tells what it is', () => {
    const { result } = setup();

    let outcome: UserErrorOutcome | undefined;
    act(() => {
      outcome = result.current(refusal(403, 'permission_denied'), 'delete');
    });

    expect(outcome).toMatchObject({ kind: 'forbidden' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
