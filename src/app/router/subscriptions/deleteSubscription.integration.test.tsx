import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import {
  createSubscriptionsCatalogMock,
  defaultCatalog,
  makeSubscriptions,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/subscriptions/components/SubscriptionsListPage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
    import('@/features/subscriptions/components/SubscriptionCreatePage'),
  ]);
}, 90_000);

const text = messages.subscriptions;

/** The default catalog and 12 more active plans: 19 subscriptions, two pages of 10. */
function start() {
  const directory = createUsersDirectoryMock();
  const catalog = createSubscriptionsCatalogMock({
    directory,
    initial: { subscriptions: [...defaultCatalog().subscriptions, ...makeSubscriptions(12)] },
  });
  return { directory, catalog };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

type Rendered = ReturnType<typeof open>;

const deleteButton = () => screen.getByRole('button', { name: text.actions.delete });

async function confirmDeletion(user: Rendered['user']) {
  await user.click(await screen.findByRole('button', { name: text.actions.delete }));
  const dialog = await screen.findByRole('dialog', { name: text.dialogs.delete.title });
  await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));
}

describe(
  'the subscriptions section: deleting (feature 003, user story 5)',
  { timeout: 30_000 },
  () => {
    it('deletes Pro from page 2 and goes back to page 2, without it and with one less (V21)', async () => {
      const { catalog } = start();
      const { user, router } = open('/subscriptions?page=2');
      await user.click(await screen.findByRole('link', { name: 'Pro' }));
      await screen.findByText('Para clínicas en crecimiento.');

      await confirmDeletion(user);

      expect(await screen.findByText(text.notices.deleted)).toBeInTheDocument();
      expect(await screen.findByText('11–18 de 18')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/subscriptions');
      expect(router.state.location.search).toBe('?page=2');
      expect(screen.queryByRole('link', { name: 'Pro' })).not.toBeInTheDocument();
      expect(catalog.state.find(2)).toBeUndefined();
    });

    it.each([
      [1, 'Tiene 2 clínicas asignadas'],
      [3, 'Tiene 1 clínica asignada'],
    ])('says why the subscription %i cannot be deleted (US5-4)', async (id, reason) => {
      start();
      open(`/subscriptions/${id}`);

      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(deleteButton()).toBeDisabled();
    });

    it('offers to delete when the clinics are not known, and says why the platform refused (US5-5, US5-7)', async () => {
      const { catalog } = start();
      catalog.clinics.unavailable();
      const { user } = open('/subscriptions/4');
      expect(await screen.findByText(text.clinics.notAvailable)).toBeInTheDocument();
      expect(deleteButton()).toBeEnabled();

      await confirmDeletion(user);

      expect(await screen.findByText(text.errors.clinicsUnavailable)).toBeInTheDocument();
      expect(catalog.state.find(4)).toBeDefined();
    });

    it('refuses when another person assigned clinics meanwhile, and the detail shows them (US5-6)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');

      catalog.setClinics(2, 1);
      await confirmDeletion(user);

      expect(await screen.findByText(text.errors.hasClinics)).toBeInTheDocument();
      expect(await screen.findByText('Tiene 1 clínica asignada')).toBeInTheDocument();
      await waitFor(() => {
        expect(deleteButton()).toBeDisabled();
      });
    });

    it('says that it does not exist any more when another person deleted it (US5-8)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');

      catalog.remove(2);
      await confirmDeletion(user);

      expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    });

    it('lets a new subscription use the name of a deleted one (US5-10)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');
      await confirmDeletion(user);
      await screen.findByText(text.notices.deleted);

      await user.click(await screen.findByRole('link', { name: text.list.createAction }));
      await screen.findByRole('heading', { level: 1, name: text.form.createTitle });
      const field = (label: string) =>
        screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
      await user.type(field(text.form.fields.name), 'Pro');
      await user.type(field(text.form.fields.monthlyPrice), '4500');
      await user.type(field(text.form.fields.annualPrice), '45000');
      await user.type(field(text.form.fields.consultingRoomsLimit), '2');
      await user.type(field(text.form.fields.doctorsLimit), '3');
      await user.type(field(text.form.fields.assistantsLimit), '2');
      await user.type(field(text.form.fields.newPatientsPerYearLimit), '15000');
      await user.click(
        screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) }),
      );

      expect(await screen.findByText(text.notices.created)).toBeInTheDocument();
      expect(catalog.state.list().filter(({ name }) => name === 'Pro')).toHaveLength(1);
    });

    it('offers no deletion to someone without subscriptions:delete (US5-11)', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:delete');
      open('/subscriptions/2');

      await screen.findByText('Para clínicas en crecimiento.');
      expect(screen.queryByRole('button', { name: text.actions.delete })).not.toBeInTheDocument();
    });
  },
);
