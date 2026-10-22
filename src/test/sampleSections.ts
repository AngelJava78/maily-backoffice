import type { SectionDefinition } from '@/app/navigation/sections';

/**
 * The three sections of the backoffice as the features 002 to 004 will register them. The real
 * registry is empty until they exist, so tests inject these.
 */
export const sampleSections: readonly SectionDefinition[] = [
  { id: 'users', path: '/users', labelKey: 'users', resource: 'users', icon: 'users' },
  {
    id: 'subscriptions',
    path: '/subscriptions',
    labelKey: 'subscriptions',
    resource: 'subscriptions',
    icon: 'subscriptions',
  },
  { id: 'clinics', path: '/clinics', labelKey: 'clinics', resource: 'tenants', icon: 'clinics' },
];
