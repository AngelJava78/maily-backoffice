import { can, type SectionResource } from '@/features/auth';
import type { messages } from '@/shared/messages/es';
import type { IconName } from '@/shared/ui/iconRegistry';

/** A section of the backoffice, listed in the navigation when the person can read its resource. */
export interface SectionDefinition {
  readonly id: string;
  /** Root path of the section. */
  readonly path: string;
  /** Key of the text in `messages.nav.sections`. */
  readonly labelKey: keyof typeof messages.nav.sections;
  readonly resource: SectionResource;
  /** Icon shown next to the label in the navigation (FR-013), always decorative. */
  readonly icon: IconName;
}

/**
 * The sections that exist. Each feature registers its own when it is implemented (FR-009); tests
 * inject example sections of their own.
 */
export const sections: readonly SectionDefinition[] = [
  // Roles y permisos (feature 013), first in the registry: the menu order the feature asks for
  // (FR-002) is Panel, Módulos, Roles y Permisos, Usuarios, Suscripciones, Clínicas, Token: with
  // Módulos and Clínicas not registered yet, this leaves Panel, Roles y permisos, Usuarios,
  // Suscripciones, Token. Insert the future Módulos section before this one, not after.
  { id: 'roles', path: '/roles', labelKey: 'roles', resource: 'roles', icon: 'roles' },
  { id: 'users', path: '/users', labelKey: 'users', resource: 'users', icon: 'users' },
  // The subscriptions section of feature 003: listed for whoever has `subscriptions:read`.
  {
    id: 'subscriptions',
    path: '/subscriptions',
    labelKey: 'subscriptions',
    resource: 'subscriptions',
    icon: 'subscriptions',
  },
  // The Token tool of feature 005 (specs/005-postman-token-tool/contracts/app-routes.md): listed
  // for whoever has `token:read`, and for nobody else.
  {
    id: 'token',
    path: '/tools/postman-token',
    labelKey: 'token',
    resource: 'token',
    icon: 'token',
  },
];

/** The sections whose resource the person can read, in the order of the registry. */
export function getVisibleSections(
  access: { readonly permissions: ReadonlySet<string> },
  registry: readonly SectionDefinition[],
): SectionDefinition[] {
  return registry.filter((section) => can(access, { resource: section.resource, action: 'read' }));
}
