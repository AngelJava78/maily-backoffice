import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useHttpClients } from '@/shared/api/httpClientsContext';

import { directCheckTargets } from '../api/directCheckApi';
import type { DirectCheckRow } from '../policy/directCheckRules';
import type { HealthScope } from './healthKeys';
import { directCheckQuery } from './healthQueries';

/** What the section «Comprobación directa» draws (data-model §11). */
export type DirectCheckView =
  | { readonly status: 'hidden' }
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly rows: readonly DirectCheckRow[];
      /** A new round is on its way while the rows are on screen. */
      readonly isRefreshing: boolean;
    };

type StepQuery = Pick<UseQueryResult<DirectCheckRow[], unknown>, 'data' | 'isFetching'>;

/**
 * The step of the direct check reduced to what is drawn (research D11): a pure function. It never
 * fails, because each failure is the status of its row.
 */
export function toDirectCheckView(query: StepQuery): DirectCheckView {
  if (query.data !== undefined) {
    return { status: 'ready', rows: query.data, isRefreshing: query.isFetching };
  }
  return query.isFetching ? { status: 'loading' } : { status: 'hidden' };
}

/** Watches the step of the direct check of a screen with its same options; its chain runs it. */
export function useDirectCheckSection(scope: HealthScope): DirectCheckView {
  const targets = directCheckTargets(useHttpClients());
  return toDirectCheckView(useQuery({ ...directCheckQuery(targets, scope), enabled: false }));
}
