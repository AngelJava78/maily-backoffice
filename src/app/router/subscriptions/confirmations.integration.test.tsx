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
  await import('@/features/subscriptions/components/SubscriptionDetailPage');
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
type Catalog = ReturnType<typeof start>['catalog'];

/** The changes of status and the deletions that the API received, whatever their result. */
const changesSent = (catalog: Catalog) =>
  catalog.requests.filter(
    (request) =>
      (request.method === 'PATCH' && request.path.endsWith('/status')) ||
      request.method === 'DELETE',
  );

async function chooseStatus(user: Rendered['user'], verb: string) {
  await user.click(
    await screen.findByRole('button', { name: new RegExp(text.actions.changeStatus) }),
  );
  await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: verb }));
}

async function cancelDialog(user: Rendered['user']) {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

describe(
  'the subscriptions section: confirmations (SC-003, FR-009, FR-017)',
  { timeout: 30_000 },
  () => {
    it.each([
      [text.statusTargets.inactivate, text.dialogs.inactivate],
      [text.statusTargets.block, text.dialogs.block],
    ])(
      'asks before «%s», naming the subscription, and sends nothing until it is confirmed',
      async (verb, dialogText) => {
        const { catalog } = start();
        const { user } = open('/subscriptions/2');
        await screen.findByText('Para clínicas en crecimiento.');

        await chooseStatus(user, verb);

        const dialog = await screen.findByRole('dialog', { name: dialogText.title });
        expect(dialog).toHaveTextContent(dialogText.body('Pro'));
        expect(changesSent(catalog)).toHaveLength(0);
        await cancelDialog(user);
        expect(changesSent(catalog)).toHaveLength(0);
        expect(catalog.state.find(2)?.statusId).toBe(1);
      },
    );

    it('asks before deleting, naming the subscription, and sends nothing until it is confirmed', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/2');
      await screen.findByText('Para clínicas en crecimiento.');

      await user.click(screen.getByRole('button', { name: text.actions.delete }));

      const dialog = await screen.findByRole('dialog', { name: text.dialogs.delete.title });
      expect(dialog).toHaveTextContent(text.dialogs.delete.body('Pro'));
      expect(changesSent(catalog)).toHaveLength(0);
      await cancelDialog(user);
      expect(changesSent(catalog)).toHaveLength(0);
      expect(catalog.state.find(2)).toBeDefined();
    });

    it('activates without asking: it is the only change that is applied directly', async () => {
      const { catalog } = start();
      const { user } = open('/subscriptions/7');
      await screen.findByText('$2,000.00/mes');

      await chooseStatus(user, text.statusTargets.activate);

      expect(await screen.findByText(text.statusNotices.activated)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(changesSent(catalog)).toHaveLength(1);
    });
  },
);
