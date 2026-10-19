import { MutationObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/ApiError';
import { MUTATION_RETRY, retryDelay, shouldRetryQuery } from '@/shared/api/retry';

import { createQueryClient } from './createQueryClient';

function forbidden(): ApiError {
  return ApiError.fromResponse(403, { code: 'forbidden', message: 'Sin permiso' });
}

describe('createQueryClient', () => {
  it('configures the retry policy and the freshness of the queries', () => {
    const { queries, mutations } = createQueryClient({}).getDefaultOptions();

    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(queries?.retryDelay).toBe(retryDelay);
    expect(queries?.staleTime).toBe(30_000);
    expect(mutations?.retry).toBe(MUTATION_RETRY);
    expect(mutations?.retry).toBe(false);
  });

  it('does not wait for the connection to come back: without it a call fails and the person sees it', () => {
    // `navigator.onLine` is unreliable, and a query or mutation that waits for it would stay on
    // "loading" or "saving" for ever instead of showing the error (constitution IV and VI).
    const { queries, mutations } = createQueryClient({}).getDefaultOptions();

    expect(queries?.networkMode).toBe('always');
    expect(mutations?.networkMode).toBe('always');
  });

  it('tells about a 403 from a query without ending anything', async () => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const queryClient = createQueryClient({ onForbidden });
    const error = forbidden();

    await expect(
      queryClient.query({ queryKey: ['things'], queryFn: () => Promise.reject(error) }),
    ).rejects.toBe(error);

    expect(onForbidden).toHaveBeenCalledOnce();
    expect(onForbidden).toHaveBeenCalledWith(error);
  });

  it('tells about a 403 from a mutation', async () => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const queryClient = createQueryClient({ onForbidden });
    const error = forbidden();
    const mutation = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(error),
    });

    await expect(mutation.mutate()).rejects.toBe(error);

    expect(onForbidden).toHaveBeenCalledOnce();
    expect(onForbidden).toHaveBeenCalledWith(error);
  });

  it.each([
    ['a 404', ApiError.fromResponse(404, { code: 'not_found', message: 'No existe' })],
    ['a 401', ApiError.fromResponse(401, { code: 'token_expired', message: 'Vencido' })],
    ['a 500', ApiError.fromResponse(500, undefined)],
    ['a timeout', ApiError.timeout()],
    ['an error that is not an ApiError', new Error('boom')],
  ])('does not report %s as forbidden', async (_label, error) => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const queryClient = createQueryClient({ onForbidden });
    const mutation = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(error),
    });

    await expect(
      queryClient.query({
        queryKey: ['things'],
        queryFn: () => Promise.reject(error),
        retry: false,
      }),
    ).rejects.toBe(error);
    await expect(mutation.mutate()).rejects.toBe(error);

    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('works without a forbidden callback', async () => {
    const queryClient = createQueryClient({});

    await expect(
      queryClient.query({
        queryKey: ['things'],
        queryFn: () => Promise.reject(forbidden()),
        retry: false,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
