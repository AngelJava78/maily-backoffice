export type ModulesTypeFilter = 'all' | 'system' | 'clinic';
export type ModulesStatusFilter = 'active' | 'blocked';

export type ModulesPanel =
  | { readonly kind: 'none' }
  | { readonly kind: 'edit'; readonly moduleId: number }
  | { readonly kind: 'create' };

/** The navigable state of the list (constitution III): filters, search and which panel is open. */
export interface ModulesLocation {
  readonly type: ModulesTypeFilter;
  readonly status: ModulesStatusFilter;
  readonly search: string;
  readonly panel: ModulesPanel;
}

function parsePanel(searchParams: URLSearchParams): ModulesPanel {
  const edit = searchParams.get('edit');
  if (edit !== null) {
    const moduleId = Number(edit);
    if (Number.isInteger(moduleId) && moduleId > 0) {
      return { kind: 'edit', moduleId };
    }
  }
  return searchParams.get('new') === '1' ? { kind: 'create' } : { kind: 'none' };
}

export function parseModulesSearchParams(searchParams: URLSearchParams): ModulesLocation {
  const typeId = searchParams.get('type_id');
  const type: ModulesTypeFilter = typeId === '1' ? 'system' : typeId === '2' ? 'clinic' : 'all';
  const status: ModulesStatusFilter = searchParams.get('status_id') === '2' ? 'blocked' : 'active';
  return { type, status, search: searchParams.get('q') ?? '', panel: parsePanel(searchParams) };
}

export function toModulesSearchParams(location: ModulesLocation): URLSearchParams {
  const params = new URLSearchParams();
  if (location.type === 'system') {
    params.set('type_id', '1');
  } else if (location.type === 'clinic') {
    params.set('type_id', '2');
  }
  if (location.status === 'blocked') {
    params.set('status_id', '2');
  }
  if (location.search !== '') {
    params.set('q', location.search);
  }
  if (location.panel.kind === 'edit') {
    params.set('edit', String(location.panel.moduleId));
  } else if (location.panel.kind === 'create') {
    params.set('new', '1');
  }
  return params;
}
