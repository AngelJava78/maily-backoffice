import { screen, waitFor } from '@testing-library/react';
import { useLocation, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import {
  catalogSubscription,
  createSubscriptionsCatalogMock,
} from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';

import { subscriptionKeys } from '../hooks/subscriptionKeys';
import { SubscriptionEditPage } from './SubscriptionEditPage';

const text = messages.subscriptions;

function DetailProbe() {
  const { subscriptionId } = useParams();
  const location = useLocation();
  return <p>{`Detalle ${subscriptionId ?? ''}: ${JSON.stringify(location.state ?? null)}`}</p>;
}

function start() {
  const catalog = createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
  catalog.addStatus(5, 'En revisión');
  catalog.setStatus(4, 5);
  return catalog;
}

function renderEdit(subscriptionId = 2, state?: unknown) {
  const pathname = `/subscriptions/${subscriptionId}/edit`;
  return renderWithProviders(
    [
      {
        path: '/subscriptions/:subscriptionId/edit',
        element: <SubscriptionEditPage subscriptionId={subscriptionId} />,
      },
      { path: '/subscriptions/:subscriptionId', element: <DetailProbe /> },
      { path: '/subscriptions', element: <p>Listado</p> },
    ],
    { auth0: ADMIN_AUTH0, initialEntries: [state === undefined ? pathname : { pathname, state }] },
  );
}

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const name = () => field(text.form.fields.name);
const description = () => field(text.form.fields.description);
const price = () => field(text.form.fields.monthlyPrice);
const clinicsLimit = () => field(text.form.fields.clinicsLimit);
const element = (n: number) => field(text.form.otherFeatureLabel(n));
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });
const PATCHES = '/api/v1/subscriptions/2';

/** Waits for the form, which is built once the subscription arrived. */
async function formReady() {
  await waitFor(() => {
    expect(name()).toHaveValue('Pro');
  });
}

// Several tests set every field of the form: the same margin already given to its integration
// sibling (editSubscription.integration.test.tsx) and to SubscriptionCreatePage's.
describe('SubscriptionEditPage', { timeout: 30_000 }, () => {
  it('shows its title from the first render, and that it is loading', async () => {
    const catalog = start();
    const release = catalog.defer();
    renderEdit();

    expect(screen.getByRole('heading', { level: 1, name: text.edit.title })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: messages.common.loading })).toBeInTheDocument();
    release();
    await formReady();
  });

  it('opens with the current values, other features in their order and the price as it is', async () => {
    start();
    renderEdit();
    await formReady();

    expect(description()).toHaveValue('Para clínicas en crecimiento.');
    expect(price()).toHaveValue('4500.00');
    expect(element(1)).toHaveValue('Hasta 5 consultorios');
    expect(element(2)).toHaveValue('Usuarios ilimitados');
    expect(element(3)).toHaveValue('Todo lo clínico');
    expect(screen.queryByLabelText(/estatus/i)).not.toBeInTheDocument();
  });

  it('shows the subscription type fixed and disabled, marked on its own current type', async () => {
    start();
    renderEdit();
    await formReady();

    const typeSwitch = screen.getByRole('switch', {
      name: new RegExp(`^${text.types.catalog[1].name}`),
    });
    expect(typeSwitch).toBeDisabled();
    expect(typeSwitch).not.toBeChecked();
    expect(screen.getByText(text.form.subscriptionTypeImmutableHelper)).toBeInTheDocument();
  });

  it('shows the clinics limit fixed and disabled at 1 for an Individual subscription', async () => {
    start();
    renderEdit();
    await formReady();

    expect(clinicsLimit()).toHaveValue('1');
    expect(clinicsLimit()).toBeDisabled();
  });

  it('opens with the annual price, trial days, autoconsumo, modules and limits already set', async () => {
    start();
    renderEdit();
    await formReady();

    expect(field(text.form.fields.annualPrice)).toHaveValue('1000.00');
    expect(field(text.form.fields.trialDays)).toHaveValue('0');
    expect(
      screen.getByRole('switch', { name: new RegExp(`^${text.form.fields.selfService}`) }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: new RegExp(`^${messages.subscriptions.modules.catalog.patients.name}`),
      }),
    ).toBeChecked();
    expect(field(text.form.fields.consultingRoomsLimit)).toHaveValue('1');
    expect(field(text.form.fields.doctorsLimit)).toHaveValue('1');
  });

  it.each([
    [7, 'Suspendido'],
    [4, 'Enterprise'],
  ])('edits a subscription in any status that is vigente (%i, %s)', async (id, current) => {
    start();
    renderEdit(id);

    await waitFor(() => {
      expect(name()).toHaveValue(current);
    });
  });

  describe('sending only what changed (FR-012)', () => {
    it('sends only the price when only the price changed', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.clear(price());
      await user.type(price(), '5000');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES).map((request) => request.body)).toEqual([
        { monthly_price: '5000' },
      ]);
    });

    it('never sends the subscription type, even though it marks the current one on a disabled control', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.clear(price());
      await user.type(price(), '5000');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).not.toHaveProperty(
        'subscription_type_id',
      );
    });

    it('never sends the clinics limit of an Individual subscription, even disabled at 1', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.clear(price());
      await user.type(price(), '5000');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).not.toHaveProperty('clinics_limit');
    });

    it('sends the name when only its upper case changed', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.clear(name());
      await user.type(name(), 'PRO');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).toEqual({ name: 'PRO' });
    });

    it('sends null when the description was emptied, and the whole list when an element was removed', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.clear(description());
      await user.click(screen.getByRole('button', { name: text.form.removeOtherFeature(2) }));
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).toEqual({
        description: null,
        other_features: ['Hasta 5 consultorios', 'Todo lo clínico'],
      });
    });

    it('sends only the limit that changed', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      const doctors = field(text.form.fields.doctorsLimit);
      await user.clear(doctors);
      await user.type(doctors, '5');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).toEqual({ doctors_limit: 5 });
    });

    it('sends the complete module set when a module with a dependency was added', async () => {
      const catalog = start();
      const { user } = renderEdit();
      await formReady();

      await user.click(
        screen.getByRole('checkbox', {
          name: new RegExp(`^${messages.subscriptions.modules.catalog.reminders.name}`),
        }),
      );
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).toEqual({
        module_keys: ['patients', 'reminders', 'scheduling'],
      });
    });

    it('sends nothing when nothing changed, and goes back to the detail saying so', async () => {
      const catalog = start();
      const { user, router } = renderEdit();
      await formReady();

      expect(save()).toBeEnabled();
      await user.type(price(), '{Backspace}{Backspace}{Backspace}');
      await user.click(save());

      await screen.findByText(/^Detalle 2:/);
      expect(router.state.historyAction).toBe('REPLACE');
      const notice = await screen.findByText(text.edit.noChanges);
      expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorInfo');
      expect(catalog.requestsTo('PATCH', PATCHES)).toHaveLength(0);
    });
  });

  it('goes to the detail with the list it came from, replacing the form, and says that it was saved', async () => {
    start();
    const { user, router } = renderEdit(2, { listSearch: '?page=2' });
    await formReady();

    await user.clear(name());
    await user.type(name(), 'Pro Plus');
    await user.click(save());

    expect(await screen.findByText('Detalle 2: {"listSearch":"?page=2"}')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByText(text.edit.saved)).toBeInTheDocument();
  });

  it('goes back to the detail without sending anything when it is cancelled', async () => {
    const catalog = start();
    const { user } = renderEdit(2, { listSearch: '?page=2' });
    await formReady();
    await user.type(name(), ' cambiado');

    await user.click(screen.getByRole('link', { name: messages.common.cancel }));

    expect(await screen.findByText('Detalle 2: {"listSearch":"?page=2"}')).toBeInTheDocument();
    expect(catalog.requestsTo('PATCH', PATCHES)).toHaveLength(0);
  });

  it('says that the subscription was not found when it does not exist', async () => {
    start();
    renderEdit(99);

    expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.detail.notFound.backToList })).toHaveAttribute(
      'href',
      '/subscriptions',
    );
  });

  it('warns when it was deleted meanwhile, and shows that it does not exist (US3-8)', async () => {
    const catalog = start();
    const { user } = renderEdit();
    await formReady();
    catalog.remove(2);

    await user.clear(name());
    await user.type(name(), 'Otro');
    await user.click(save());

    const notice = await screen.findByText(text.errors.notFound);
    expect(notice.closest('.MuiAlert-root')).toHaveClass('MuiAlert-colorWarning');
    expect(await screen.findByText(text.detail.notFound.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.detail.notFound.backToList })).toBeInTheDocument();
  });

  it('shows a name in use next to the name', async () => {
    start();
    const { user } = renderEdit();
    await formReady();

    await user.clear(name());
    await user.type(name(), 'premium');
    await user.click(save());

    await waitFor(() => {
      expect(name()).toHaveAccessibleDescription(text.errors.nameInUse);
    });
  });

  it('shows the error with a way to retry and a way back when it cannot load', async () => {
    const catalog = start();
    catalog.failNext({ method: 'GET', path: PATCHES, status: 500, code: 'internal_error' });
    const { user } = renderEdit();

    expect(await screen.findByText(text.detail.loadError.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.detail.backToList })).toHaveAttribute(
      'href',
      '/subscriptions',
    );
    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    await formReady();
  });

  it('does not overwrite what was typed when the subscription is loaded again', async () => {
    const catalog = start();
    const { user, queryClient } = renderEdit();
    await formReady();
    await user.clear(name());
    await user.type(name(), 'Escrito');

    catalog.update(2, { name: 'Cambiado por otra persona' });
    await queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(2), exact: true });

    await waitFor(() => {
      expect(queryClient.getQueryData(subscriptionKeys.detail(2))).toMatchObject({
        name: 'Cambiado por otra persona',
      });
    });
    expect(name()).toHaveValue('Escrito');
  });

  it('does not send back a datum that another person changed while the form was open (US3-7)', async () => {
    const catalog = start();
    const { user, queryClient } = renderEdit();
    await formReady();

    catalog.update(2, { monthly_price: '4800' });
    await queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(2), exact: true });
    await waitFor(() => {
      expect(queryClient.getQueryData(subscriptionKeys.detail(2))).toMatchObject({
        monthlyPrice: '4800.00',
      });
    });
    await user.type(description(), ' Con soporte.');
    await user.click(save());

    await screen.findByText(/^Detalle 2:/);
    expect(catalog.requestsTo('PATCH', PATCHES)[0]?.body).toEqual({
      description: 'Para clínicas en crecimiento. Con soporte.',
    });
    expect(catalog.state.find(2)?.monthlyPrice).toBe('4800.00');
  });

  describe('editing an Empresarial subscription', () => {
    function startEnterprise() {
      const catalog = start();
      catalog.addSubscription(
        catalogSubscription({
          id: 30,
          name: 'Empresarial',
          subscriptionTypeId: 2,
          clinicsLimit: 20,
        }),
      );
      return catalog;
    }
    const ENTERPRISE_PATCHES = '/api/v1/subscriptions/30';

    async function enterpriseFormReady() {
      await waitFor(() => {
        expect(name()).toHaveValue('Empresarial');
      });
    }

    it('shows the clinics limit enabled, with its current value', async () => {
      startEnterprise();
      renderEdit(30);
      await enterpriseFormReady();

      expect(clinicsLimit()).toHaveValue('20');
      expect(clinicsLimit()).not.toBeDisabled();
    });

    it('sends the clinics limit when it changes, within 1 to 100', async () => {
      const catalog = startEnterprise();
      const { user } = renderEdit(30);
      await enterpriseFormReady();

      await user.clear(clinicsLimit());
      await user.type(clinicsLimit(), '50');
      await user.click(save());

      await screen.findByText(/^Detalle 30:/);
      expect(catalog.requestsTo('PATCH', ENTERPRISE_PATCHES)[0]?.body).toEqual({
        clinics_limit: 50,
      });
    });
  });

  it('has no accessibility violations', async () => {
    start();
    const { container } = renderEdit();
    await formReady();

    expect(await axe(container)).toHaveNoViolations();
  });
});
