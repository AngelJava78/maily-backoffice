import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import {
  createHealthMonitoringMock,
  type HealthMonitoringMock,
} from '@/test/handlers/healthMonitoring';
import { createWrapper } from '@/test/renderWithProviders';

import type { CreateComponentPayload } from '../schemas/componentForm';
import { healthKeys } from './healthKeys';
import { useComponentsLocation } from './useComponentsLocation';
import {
  useCreateMonitoredComponent,
  useDeleteMonitoredComponent,
  useUpdateMonitoredComponent,
} from './useMonitoredComponentMutations';
import { useMonitoredComponent, useMonitoredComponents } from './useMonitoredComponents';

const PATH = '/api/v1/monitored-components';

const USUARIOS: CreateComponentPayload = {
  code: 'mailysoft-usuarios',
  name: 'MailySoft Usuarios',
  kind: 'service',
  base_url: 'http://mailysoft-usuarios:8000',
  live_path: '/health/live',
  ready_path: '/health/ready',
  info_path: '/info',
  enabled: true,
  sort_order: 10,
};

afterEach(() => {
  vi.useRealTimers();
});

/** The query client of the application (its retries) and a component already registered. */
async function setup() {
  const health = createHealthMonitoringMock();
  const queryClient = createQueryClient();
  const { wrapper, router } = createWrapper({ queryClient, route: '/health/components' });
  const created = renderHook(() => useCreateMonitoredComponent(), { wrapper });
  const component = await act(() => created.result.current.mutateAsync(USUARIOS));
  return { health, queryClient, wrapper, router, component };
}

function requestsTo(health: HealthMonitoringMock, method: string, path: string | RegExp) {
  return health.requestsTo(method, path).length;
}

describe('the queries of the registry', () => {
  it('asks for the list once, and retries it twice on a failure of the service', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(503);
    vi.useFakeTimers();
    const { wrapper } = createWrapper({ queryClient: createQueryClient() });
    const { result } = renderHook(() => useMonitoredComponents(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    await vi.waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(requestsTo(health, 'GET', PATH)).toBe(3);
  });

  it('gives the detail of a component, asked once', async () => {
    const { health, wrapper, component } = await setup();
    const { result } = renderHook(() => useMonitoredComponent(component.id), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(component);
    });
    expect(requestsTo(health, 'GET', `${PATH}/${component.id}`)).toBe(0);
  });
});

describe('the changes of the registry (data-model §8)', () => {
  it('asks for the list again after a creation, and keeps the detail it got', async () => {
    const health = createHealthMonitoringMock();
    const queryClient = createQueryClient();
    const { wrapper } = createWrapper({ queryClient });
    // One tree for both hooks: the trees of a wrapper share its router.
    const { result } = renderHook(
      () => ({ list: useMonitoredComponents(), create: useCreateMonitoredComponent() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.data).toEqual([]);
    });

    const component = await act(() => result.current.create.mutateAsync(USUARIOS));

    expect(requestsTo(health, 'POST', PATH)).toBe(1);
    expect(queryClient.getQueryData(healthKeys.componentDetail(component.id))).toEqual(component);
    await waitFor(() => {
      expect(result.current.list.data).toEqual([component]);
    });
  });

  it('keeps the detail with what the service confirmed after an edition, and asks for the list again', async () => {
    const { health, queryClient, wrapper, component } = await setup();
    const { result } = renderHook(
      () => ({
        list: useMonitoredComponents(),
        update: useUpdateMonitoredComponent(component.id),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    await act(() => result.current.update.mutateAsync({ name: 'Usuarios' }));

    expect(queryClient.getQueryData(healthKeys.componentDetail(component.id))).toMatchObject({
      name: 'Usuarios',
    });
    await waitFor(() => {
      expect(result.current.list.data?.[0]?.name).toBe('Usuarios');
    });
    expect(requestsTo(health, 'GET', PATH)).toBe(2);
  });

  it('forgets the detail after a deletion, and asks for the list again', async () => {
    const { queryClient, wrapper, component } = await setup();
    const { result } = renderHook(
      () => ({
        list: useMonitoredComponents(),
        remove: useDeleteMonitoredComponent(component.id),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.data).toHaveLength(1);
    });

    await act(() => result.current.remove.mutateAsync());

    expect(queryClient.getQueryData(healthKeys.componentDetail(component.id))).toBeUndefined();
    await waitFor(() => {
      expect(result.current.list.data).toEqual([]);
    });
  });

  it('forgets the detail of a component that another person deleted (404)', async () => {
    const { health, queryClient, wrapper, component } = await setup();
    health.removeBehindTheScenes(component.id);
    const { result } = renderHook(() => useUpdateMonitoredComponent(component.id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Usuarios' }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(healthKeys.componentDetail(component.id))).toBeUndefined();
  });

  it('never retries a change on its own', async () => {
    const { health, wrapper, component } = await setup();
    health.failAll(500);
    const { result } = renderHook(() => useDeleteMonitoredComponent(component.id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    expect(requestsTo(health, 'DELETE', `${PATH}/${component.id}`)).toBe(1);
  });
});

describe('useComponentsLocation', () => {
  it('reads the page and its size from the address and writes them back', () => {
    createHealthMonitoringMock();
    const { wrapper, router } = createWrapper({ route: '/health/components?page=2&pageSize=25' });
    const { result } = renderHook(() => useComponentsLocation(), { wrapper });

    expect(result.current.location).toEqual({ page: 2, pageSize: 25 });

    act(() => {
      result.current.setPage(3);
    });
    expect(router.state.location.search).toBe('?page=3&pageSize=25');

    act(() => {
      result.current.setPageSize(50);
    });
    expect(router.state.location.search).toBe('?pageSize=50');
  });

  it('replaces an address with values that are not valid by its normal form', async () => {
    const { wrapper, router } = createWrapper({ route: '/health/components?page=cero&pageSize=7' });
    renderHook(() => useComponentsLocation(), { wrapper });

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
