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

type Rendered = ReturnType<typeof open>;

const fields = () => screen.getByText(text.detail.fields.status, { selector: 'dt' });
const statusShown = () => fields().nextElementSibling?.textContent;

async function choose(user: Rendered['user'], verb: string) {
  await user.click(
    await screen.findByRole('button', { name: new RegExp(text.actions.changeStatus) }),
  );
  await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: verb }));
}

async function confirm(user: Rendered['user'], label: string) {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: label }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

describe(
  'the subscriptions section: changing the status (feature 003, user story 4)',
  { timeout: 40_000 },
  () => {
    it('inactivates Pro, blocks it and activates it again; the list keeps it in the same place, ordered by price, not status (V17, V18; 020 supersedes the old grouping)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');

      await choose(user, text.statusTargets.inactivate);
      await confirm(user, text.dialogs.inactivate.confirm);
      expect(await screen.findByText(text.statusNotices.inactivated)).toBeInTheDocument();
      await waitFor(() => {
        expect(statusShown()).toBe(text.status.inactive);
      });

      await choose(user, text.statusTargets.block);
      await confirm(user, text.dialogs.block.confirm);
      expect(await screen.findByText(text.statusNotices.blocked)).toBeInTheDocument();
      await waitFor(() => {
        expect(statusShown()).toBe(text.status.blocked);
      });

      await user.click(screen.getByRole('link', { name: text.detail.backToList }));
      const grid = await screen.findByRole('grid', { name: text.list.gridLabel });
      await within(grid).findByRole('link', { name: 'Pro' });
      // Ascending by monthly price (020, FR-006): Pro's price never changed, so blocking it does
      // not move it — there is no status group left to move it out of.
      expect(
        within(grid)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Enterprise', 'Legacy full', 'Solo', 'Básico', 'Suspendido', 'Pro', 'Premium']);

      await user.click(within(grid).getByRole('link', { name: 'Pro' }));
      await screen.findByText('Para clínicas en crecimiento.');
      await choose(user, text.statusTargets.activate);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await screen.findByText(text.statusNotices.activated)).toBeInTheDocument();
      expect(catalog.state.find(2)?.statusId).toBe(1);
    });

    it('inactivates Básico although it has clinics (US4-6)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/1');
      await screen.findByText('$1,500.00/mes');

      await choose(user, text.statusTargets.inactivate);
      await confirm(user, text.dialogs.inactivate.confirm);

      expect(await screen.findByText(text.statusNotices.inactivated)).toBeInTheDocument();
      expect(catalog.state.find(1)).toMatchObject({ statusId: 2, clinicsCount: 2 });
    });

    it('warns and shows the status it has when another person already gave it that status (US4-7)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/3');
      await screen.findByText('Para redes de clínicas.');

      catalog.setStatus(3, 2);
      await choose(user, text.statusTargets.inactivate);
      await confirm(user, text.dialogs.inactivate.confirm);

      expect(await screen.findByText(text.errors.statusUnchanged)).toBeInTheDocument();
      await waitFor(() => {
        expect(statusShown()).toBe(text.status.inactive);
      });
    });

    it('says that it does not exist any more when another person deleted it (US4-8)', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/3');
      await screen.findByText('Para redes de clínicas.');

      catalog.remove(3);
      await choose(user, text.statusTargets.block);
      await confirm(user, text.dialogs.block.confirm);

      expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
      expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    });

    it('offers no change of status to someone without subscriptions:update (US4-10)', async () => {
      const { directory } = start();
      directory.revoke('Administrator', 'subscriptions:update');
      open('/subscriptions/2');

      await screen.findByText('Para clínicas en crecimiento.');
      expect(
        screen.queryByRole('button', { name: new RegExp(text.actions.changeStatus) }),
      ).not.toBeInTheDocument();
    });
  },
);
