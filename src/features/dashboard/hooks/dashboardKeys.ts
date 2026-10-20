/**
 * The TanStack Query keys of the Panel (constitution III): written here and nowhere else. The
 * summary is a single query; `all` takes it away when the person loses the permission (research D7).
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};
