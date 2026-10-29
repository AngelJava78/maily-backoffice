import { configure, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { createClinicModulesCatalogMock } from '@/test/handlers/subscriptionModulesCatalog';
import {
  createSubscriptionsCatalogMock,
  defaultCatalog,
  SUBSCRIPTIONS_API_BASE_URL,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { renderApp } from '@/test/renderApp';
import { server } from '@/test/server';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/subscriptions/components/SubscriptionsListPage'),
    import('@/features/subscriptions/components/SubscriptionDetailPage'),
    import('@/features/subscriptions/components/SubscriptionCreatePage'),
    import('@/features/subscriptions/components/SubscriptionEditPage'),
  ]);
}, 90_000);

const text = messages.subscriptions;
const TOKEN = `test-token:${ADMIN_SUB}`;

/** Every request that left the application, wherever it went, with its credential. */
const sent: { readonly url: string; readonly authorization: string | null }[] = [];
const record = ({ request }: { readonly request: Request }) => {
  sent.push({ url: request.url, authorization: request.headers.get('authorization') });
};

afterEach(() => {
  server.events.removeListener('request:start', record);
  sent.length = 0;
});

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });

describe('the subscriptions section: the credential (FR-022, SC-011)', { timeout: 60_000 }, () => {
  it('sends the token of the session to the subscriptions API only, and keeps it nowhere', async () => {
    // 021: so the modules section loads and «Guardar» is not left disabled.
    createClinicModulesCatalogMock();
    const directory = createUsersDirectoryMock();
    const catalog = createSubscriptionsCatalogMock({ directory, initial: defaultCatalog() });
    server.events.on('request:start', record);
    const { user, router } = renderApp({ url: '/subscriptions', sub: ADMIN_SUB, signedIn: true });

    // The list and a detail.
    await user.click(await screen.findByRole('link', { name: 'Solo' }));
    await screen.findByText('Para el médico que trabaja por su cuenta.');
    // An edition.
    await user.click(screen.getByRole('link', { name: text.actions.edit }));
    await waitFor(() => {
      expect(field(text.form.fields.name)).toHaveValue('Solo');
      // 021: «Guardar» stays disabled until the clinic modules catalog loads too (FR-010).
      expect(save()).not.toBeDisabled();
    });
    await user.type(field(text.form.fields.description), ' Con agenda.');
    await user.click(save());
    await screen.findByText(text.edit.saved);
    // A change of status.
    await user.click(
      await screen.findByRole('button', { name: new RegExp(text.actions.changeStatus) }),
    );
    await user.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: text.statusTargets.activate,
      }),
    );
    await screen.findByText(text.statusNotices.activated);
    // A deletion.
    await user.click(screen.getByRole('button', { name: text.actions.delete }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: text.dialogs.delete.confirm }));
    await screen.findByText(text.notices.deleted);
    // A creation.
    await user.click(await screen.findByRole('link', { name: text.list.createAction }));
    await screen.findByRole('heading', { level: 1, name: text.form.createTitle });
    await waitFor(() => {
      expect(save()).not.toBeDisabled();
    });
    await user.type(field(text.form.fields.name), 'Nueva');
    await user.type(field(text.form.fields.monthlyPrice), '10');
    await user.type(field(text.form.fields.annualPrice), '100');
    await user.type(field(text.form.fields.consultingRoomsLimit), '1');
    await user.type(field(text.form.fields.doctorsLimit), '1');
    await user.type(field(text.form.fields.assistantsLimit), '1');
    await user.type(field(text.form.fields.newPatientsPerYearLimit), '1');
    await user.click(save());
    await screen.findByText(text.notices.created);

    const methods = new Set(catalog.requests.map((request) => request.method));
    expect([...methods].sort()).toEqual(['DELETE', 'GET', 'PATCH', 'POST']);
    for (const request of catalog.requests) {
      expect(request.authorization).toBe(`Bearer ${TOKEN}`);
    }
    const toSubscriptions = sent.filter(({ url }) => url.startsWith(SUBSCRIPTIONS_API_BASE_URL));
    expect(toSubscriptions).toHaveLength(catalog.requestCount);
    // The token travels only to the two APIs of the platform.
    for (const { url, authorization } of sent) {
      if (authorization !== null) {
        expect(
          url.startsWith(`${SUBSCRIPTIONS_API_BASE_URL}/`) ||
            url.startsWith(`${USERS_API_BASE_URL}/`),
        ).toBe(true);
      }
    }

    const stored = [
      // Only read, to prove that the token was not kept there (constitution V).
      // eslint-disable-next-line no-restricted-globals
      ...Object.keys(localStorage).map((key) => localStorage.getItem(key) ?? ''),
      ...Object.keys(sessionStorage).map((key) => sessionStorage.getItem(key) ?? ''),
    ];
    expect(stored.some((value) => value.includes(TOKEN))).toBe(false);
    expect(window.location.href).not.toContain(TOKEN);
    expect(JSON.stringify(router.state.location)).not.toContain(TOKEN);
  });
});
