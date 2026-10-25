/**
 * Where each screen keeps the steps of its fallback chain (research D6 and D9): «Salud de
 * servicios» (`page`) and the access-check failure screen (`access`) never share a step.
 */
export type HealthScope = 'page' | 'access';

const all = ['health'] as const;

/**
 * The query keys of the feature (constitution III; data-model.md §8). Every key starts with
 * `['health']`, so forgetting the data of the feature is a single `removeQueries` of `all`.
 */
export const healthKeys = {
  all,
  /** The refresh cycle of «Salud de servicios»: it runs the aggregator and, if it fails, the chain. */
  cycle: () => [...all, 'cycle'] as const,
  /** The last outcome of the aggregator: its result, or that the service refused it with a 403. */
  result: () => [...all, 'result'] as const,
  /** The public status of the platform, in one screen. */
  platformStatus: (scope: HealthScope) => [...all, 'platform-status', scope] as const,
  /** The rows of the direct check, in one screen. */
  directCheck: (scope: HealthScope) => [...all, 'direct-check', scope] as const,
  /** One round of the chain of the access-check failure screen. */
  accessChain: (round: number) => [...all, 'access-chain', round] as const,
  /** The list of the registered components. */
  componentsList: () => [...all, 'components', 'list'] as const,
  /** One registered component. */
  componentDetail: (id: string) => [...all, 'components', 'detail', id] as const,
};
