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
    import('@/features/subscriptions/components/SubscriptionEditPage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
  ]);
}, 90_000);

const text = messages.subscriptions;

function start() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
  return { directory, catalog };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });
const grid = () => screen.getByRole('grid', { name: text.list.gridLabel });
const names = () =>
  within(grid())
    .getAllByRole('link')
    .map((link) => link.textContent);

/** Waits for the form of the edition, built with the subscription already loaded. */
async function formOf(value: string) {
  await waitFor(() => {
    expect(field(text.form.fields.name)).toHaveValue(value);
  });
}

describe(
  'the subscriptions section: modifying (feature 003, user story 3)',
  { timeout: 30_000 },
  () => {
    it('changes the price of Solo from its detail, and the list moves it (V13)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/5');
      await screen.findByText('Para el médico que trabaja por su cuenta.');

      await user.click(screen.getByRole('link', { name: text.actions.edit }));
      expect(
        await screen.findByRole('heading', { level: 1, name: text.edit.title }),
      ).toBeInTheDocument();
      expect(document.title).toBe(
        `${messages.titles.subscriptionEdit} — ${messages.common.appName}`,
      );
      await formOf('Solo');
      await user.clear(field(text.form.fields.monthlyPrice));
      await user.type(field(text.form.fields.monthlyPrice), '5000');
      await user.click(save());

      expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
      expect(await screen.findByText('$5,000.00/mes')).toBeInTheDocument();
      expect(catalog.requestsTo('PATCH', '/api/v1/subscriptions/5')[0]?.body).toEqual({
        monthly_price: '5000',
      });

      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      await screen.findByRole('link', { name: 'Solo' });
      expect(names()).toEqual([
        'Enterprise',
        'Básico',
        'Pro',
        'Premium',
        'Legacy full',
        'Suspendido',
        'Solo',
      ]);
    });

    it('changes the annual price, a limit and adds a module with a dependency, reflected in the detail (W11)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2/edit');
      await formOf('Pro');

      await user.clear(field(text.form.fields.annualPrice));
      await user.type(field(text.form.fields.annualPrice), '48000');
      const doctors = field(text.form.fields.doctorsLimit);
      await user.clear(doctors);
      await user.type(doctors, '5');
      await user.click(
        screen.getByRole('checkbox', {
          name: new RegExp(`^${messages.subscriptions.modules.catalog.reminders.name}`),
        }),
      );
      await user.click(save());

      expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
      expect(await screen.findByText('$48,000.00/año')).toBeInTheDocument();
      expect(catalog.state.find(2)).toMatchObject({
        annualPrice: '48000.00',
        doctorsLimit: 5,
        moduleKeys: ['patients', 'reminders', 'scheduling'],
      });
    });

    it('saves nothing when nothing changed, and says so with no PATCH in the Network tab (W12)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2/edit');
      await formOf('Pro');

      await user.click(save());

      expect(await screen.findByText(text.edit.noChanges)).toBeInTheDocument();
      expect(catalog.requestsTo('PATCH', '/api/v1/subscriptions/2')).toHaveLength(0);
    });

    it('keeps the change of another person to another datum (US3-7)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2/edit');
      await formOf('Pro');

      catalog.update(2, { monthly_price: '4800' });
      await user.type(field(text.form.fields.description), ' Con soporte.');
      await user.click(save());

      expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
      expect(catalog.state.find(2)).toMatchObject({
        monthlyPrice: '4800.00',
        description: 'Para clínicas en crecimiento. Con soporte.',
      });
      expect(await screen.findByText('$4,800.00/mes')).toBeInTheDocument();
    });

    it('says that it does not exist any more when another person deleted it, with the way to the list (US3-8)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2/edit');
      await formOf('Pro');

      catalog.remove(2);
      await user.type(field(text.form.fields.name), ' 2');
      await user.click(save());

      expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: text.detail.notFound.backToList }));
      expect(await screen.findByRole('link', { name: 'Básico' })).toBeInTheDocument();
    });

    it('keeps the session open and saves nothing when the permission is taken away with the form open (US3-9)', async () => {
      const { directory, catalog } = start();
      const { user, router } = open('/subscriptions/2/edit');
      await formOf('Pro');

      directory.revoke('Administrator', 'subscriptions:update');
      await user.type(field(text.form.fields.name), ' 2');
      await user.click(save());

      expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
      expect(catalog.state.find(2)?.name).toBe('Pro');
      expect(router.state.location.pathname).not.toBe('/access');
    });

    it('offers no edition to someone without subscriptions:update, and sends them back to the detail (US3-10)', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:update');
      const { unmount } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');
      expect(screen.queryByRole('link', { name: text.actions.edit })).not.toBeInTheDocument();
      unmount();

      const edit = open('/subscriptions/2/edit');

      expect(await screen.findByText(messages.forbidden.action)).toBeInTheDocument();
      await waitFor(() => {
        expect(edit.router.state.location.pathname).toBe('/subscriptions/2');
      });
    });

    it('says that the address does not exist for an id that is not one', async () => {
      start();
      open('/subscriptions/abc/edit');

      expect(
        await screen.findByRole('heading', { level: 1, name: messages.notFound.title }),
      ).toBeInTheDocument();
    });
  },
);
