import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  createSubscriptionsCatalogMock,
  defaultCatalog,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/subscriptions/components/SubscriptionsListPage'),
    import('@/features/subscriptions/components/SubscriptionCreatePage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
  ]);
}, 90_000);

const text = messages.subscriptions;
const PATH = '/api/v1/subscriptions';

function start(initial = defaultCatalog()) {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial });
  return { directory, catalog };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });
const grid = () => screen.getByRole('grid', { name: text.list.gridLabel });

/** The four clinic limits, which are always required (FR-010). */
async function fillRequiredLimits(user: ReturnType<typeof open>['user']) {
  await user.type(field(text.form.fields.consultingRoomsLimit), '2');
  await user.type(field(text.form.fields.doctorsLimit), '3');
  await user.type(field(text.form.fields.assistantsLimit), '2');
  await user.type(field(text.form.fields.newPatientsPerYearLimit), '15000');
}

describe(
  'the subscriptions section: creating (feature 003, user story 2)',
  { timeout: 30_000 },
  () => {
    it('offers «Nueva suscripción» next to the title, which opens the empty form (V9)', async () => {
      start();
      const { user, router } = open('/subscriptions?page=1&page_size=25');
      await screen.findByRole('link', { name: 'Pro' });

      await user.click(screen.getByRole('link', { name: text.list.createAction }));

      expect(
        await screen.findByRole('heading', { level: 1, name: text.form.createTitle }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/subscriptions/new');
      expect(document.title).toBe(
        `${messages.titles.subscriptionCreate} — ${messages.common.appName}`,
      );
    });

    it('offers it in the empty state too', async () => {
      start({ subscriptions: [] });
      open('/subscriptions');

      expect(await screen.findByText(text.list.empty)).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: text.list.createAction })).toHaveLength(2);
    });

    it('creates a subscription, opens its detail and shows it in its place in the list (US2-2, US2-3)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/new');
      await screen.findByRole('heading', { level: 1, name: text.form.createTitle });

      await user.type(field(text.form.fields.name), 'Clínica Plus');
      await user.type(field(text.form.fields.monthlyPrice), '1000');
      await user.type(field(text.form.fields.annualPrice), '10000');
      await fillRequiredLimits(user);
      const add = screen.getByRole('button', { name: text.form.addOtherFeature });
      for (const value of ['Hasta 3 consultorios', 'Agenda', 'Recordatorios']) {
        await user.click(add);
        await user.keyboard(value);
      }
      await user.click(screen.getByRole('button', { name: text.form.removeOtherFeature(2) }));
      await user.click(save());

      expect(
        await screen.findByRole('heading', { level: 1, name: text.detail.title }),
      ).toBeInTheDocument();
      expect(await screen.findByText(text.notices.created)).toBeInTheDocument();
      expect(screen.getByText('$1,000.00/mes')).toBeInTheDocument();
      expect(screen.getByText(messages.subscriptions.status.active)).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
        expect.arrayContaining(['Hasta 3 consultorios', 'Recordatorios']),
      );

      // Only what can be written travels: no id, status, clinics nor dates (FR-021).
      expect(Object.keys(catalog.requestsTo('POST', PATH)[0]?.body ?? {}).sort()).toEqual([
        'annual_price',
        'assistants_limit',
        'consulting_rooms_limit',
        'doctors_limit',
        'module_keys',
        'monthly_price',
        'name',
        'new_patients_per_year_limit',
        'other_features',
        'self_service',
        'subscription_type_id',
        'trial_days',
      ]);
      // Never touched the type control: created as Individual, the default (Clarifications, X2).
      expect(catalog.requestsTo('POST', PATH)[0]?.body).toMatchObject({ subscription_type_id: 1 });

      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      await screen.findByRole('link', { name: 'Clínica Plus' });
      expect(
        within(grid())
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual([
        'Enterprise',
        'Clínica Plus',
        'Básico',
        'Pro',
        'Premium',
        'Legacy full',
        'Solo',
        'Suspendido',
      ]);
    });

    it('creates it with the subscription type last chosen on the control (US1-2, US1-4, X3)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/new');
      await screen.findByRole('heading', { level: 1, name: text.form.createTitle });

      await user.type(field(text.form.fields.name), 'Clínica Empresarial');
      await user.type(field(text.form.fields.monthlyPrice), '1000');
      await user.type(field(text.form.fields.annualPrice), '10000');
      await fillRequiredLimits(user);
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${text.types.catalog[2].name}`) }),
      );
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${text.types.catalog[1].name}`) }),
      );
      await user.click(save());

      await screen.findByRole('heading', { level: 1, name: text.detail.title });
      expect(catalog.requestsTo('POST', PATH)[0]?.body).toMatchObject({ subscription_type_id: 1 });
    });

    it('refuses « pro », which is the name of Pro with other spaces and upper case, next to the name (US2-6)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/new');
      await screen.findByRole('heading', { level: 1, name: text.form.createTitle });

      await user.type(field(text.form.fields.name), ' pro ');
      await user.type(field(text.form.fields.monthlyPrice), '100');
      await user.type(field(text.form.fields.annualPrice), '1000');
      await fillRequiredLimits(user);
      await user.click(save());

      await waitFor(() => {
        expect(field(text.form.fields.name)).toHaveAccessibleDescription(text.errors.nameInUse);
      });
      expect(catalog.state.list()).toHaveLength(7);
    });

    it('offers no creation to someone without subscriptions:write, and sends them back to the list (US2-10)', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:write');
      const { router } = open('/subscriptions/new');

      expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/subscriptions');
      });
      await screen.findByRole('link', { name: 'Pro' });
      expect(screen.queryByRole('link', { name: text.list.createAction })).not.toBeInTheDocument();
    });
  },
);
