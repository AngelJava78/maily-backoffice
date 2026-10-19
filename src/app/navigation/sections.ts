import { can, type PermissionResource } from '@/features/auth';
import type { messages } from '@/shared/messages/es';

/** A section of the backoffice, listed in the navigation when the person can read its resource. */
export interface SectionDefinition {
  readonly id: string;
  /** Root path of the section. */
  readonly path: string;
  /** Key of the text in `messages.nav.sections`. */
  readonly labelKey: keyof typeof messages.nav.sections;
  readonly resource: PermissionResource;
}

/**
 * The sections that exist. Each feature registers its own when it is implemented (FR-009), so this
 * is empty for now and tests inject example sections.
 */
export const sections: readonly SectionDefinition[] = [];

/** The sections whose resource the person can read, in the order of the registry. */
export function getVisibleSections(
  access: { readonly permissions: ReadonlySet<string> },
  registry: readonly SectionDefinition[],
): SectionDefinition[] {
  return registry.filter((section) => can(access, { resource: section.resource, action: 'read' }));
}
