import { lazy } from 'react';

/**
 * The page that does not exist, loaded when it is first needed (constitution VIII). Every place that
 * shows it uses this one: if one imported the page statically, it would no longer be a separate chunk.
 */
export const NotFoundPage = lazy(() =>
  import('./NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
