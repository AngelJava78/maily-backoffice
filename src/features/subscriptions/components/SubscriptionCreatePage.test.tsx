import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useLocation, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { createSubscriptionsCatalogMock } from '@/test/handlers/subscriptionsCatalog';
import { ADMIN_AUTH0, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { errorBody, subscriptionsUrl } from '@/test/subscriptionsClient';

import { SubscriptionCreatePage } from './SubscriptionCreatePage';

const text = messages.subscriptions;
const PATH = '/api/v1/subscriptions';

function DetailProbe() {
  const { subscriptionId } = useParams();
  const location = useLocation();
  return <p>{`Detalle ${subscriptionId ?? ''}: ${JSON.stringify(location.state)}`}</p>;
}

function ListProbe() {
  const location = useLocation();
  return <p>{`Listado ${location.search}`}</p>;
}

function start() {
  return createSubscriptionsCatalogMock({ directory: createUsersDirectoryMock() });
}

function renderCreate(state?: unknown) {
  return renderWithProviders(
    [
      { path: '/subscriptions/new', element: <SubscriptionCreatePage /> },
      { path: '/subscriptions/:subscriptionId', element: <DetailProbe /> },
      { path: '/subscriptions', element: <ListProbe /> },
    ],
    {
      auth0: ADMIN_AUTH0,
      initialEntries: [
        state === undefined ? '/subscriptions/new' : { pathname: '/subscriptions/new', state },
      ],
    },
  );
}

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const name = () => field(text.form.fields.name);
const description = () => field(text.form.fields.description);
const price = () => field(text.form.fields.monthlyPrice);
const annualPrice = () => field(text.form.fields.annualPrice);
const consultingRoomsLimit = () => field(text.form.fields.consultingRoomsLimit);
const doctorsLimit = () => field(text.form.fields.doctorsLimit);
const assistantsLimit = () => field(text.form.fields.assistantsLimit);
const newPatientsPerYearLimit = () => field(text.form.fields.newPatientsPerYearLimit);
const save = () => screen.getByRole('button', { name: new RegExp(`^${messages.common.save}`) });
const cancel = () => screen.getByRole('link', { name: messages.common.cancel });

async function fillIn(
  user: ReturnType<typeof renderCreate>['user'],
  overrides: { name?: string; price?: string; annualPrice?: string } = {},
) {
  await user.type(name(), overrides.name ?? 'Clínica Plus');
  await user.type(description(), 'Para clínicas medianas.');
  await user.type(price(), overrides.price ?? '3200.50');
  await user.type(annualPrice(), overrides.annualPrice ?? '32000.50');
  await user.type(consultingRoomsLimit(), '3');
  await user.type(doctorsLimit(), '4');
  await user.type(assistantsLimit(), '2');
  await user.type(newPatientsPerYearLimit(), '8000');
}

// Several tests fill every field of the form (fillIn, above): the same margin already given to
// its integration sibling (createSubscription.integration.test.tsx) and to usersList's.
describe('SubscriptionCreatePage', { timeout: 30_000 }, () => {
  it('has its title and the empty form, without a status', () => {
    start();
    renderCreate();

    expect(
      screen.getByRole('heading', { level: 1, name: text.form.createTitle }),
    ).toBeInTheDocument();
    expect(name()).toHaveValue('');
    expect(price()).toHaveValue('');
    expect(screen.queryByLabelText(/estatus/i)).not.toBeInTheDocument();
  });

  it('shows the preview panel next to the form, updated live (FR-014)', async () => {
    start();
    const { user } = renderCreate();

    expect(screen.getByText(messages.subscriptions.preview.title)).toBeInTheDocument();
    expect(screen.getByText(messages.subscriptions.preview.namePlaceholder)).toBeInTheDocument();

    await user.type(name(), 'Clínica Plus');

    expect(screen.getAllByText('Clínica Plus').length).toBeGreaterThan(0);
  });

  describe('validating what is typed', () => {
    it('tells what is missing next to each field, with the focus on the first one, and sends nothing', async () => {
      const catalog = start();
      const { user } = renderCreate();

      await user.click(save());

      expect(name()).toHaveAccessibleDescription(text.validation.nameRequired);
      expect(price()).toHaveAccessibleDescription(text.validation.priceRequired);
      expect(name()).toHaveFocus();
      expect(catalog.requestsTo('POST', PATH)).toHaveLength(0);
    });

    it.each(['4,500', '$4500', '12.345', '-1'])(
      'refuses the price %j and sends nothing (clarification 8)',
      async (typed) => {
        const catalog = start();
        const { user } = renderCreate();
        await fillIn(user, { price: typed });

        await user.click(save());

        expect(price()).toHaveAccessibleDescription(text.validation.priceInvalid);
        expect(catalog.requestsTo('POST', PATH)).toHaveLength(0);
      },
    );
  });

  describe('creating the subscription', () => {
    it('creates it with three elements, one edited and one removed, and opens its detail (US2-2, US2-3)', async () => {
      const catalog = start();
      const { user, router } = renderCreate();
      await fillIn(user);
      const add = screen.getByRole('button', { name: text.form.addOtherFeature });
      for (const value of ['Hasta 3 consultorios', 'Agenda', 'Recordatorios']) {
        await user.click(add);
        await user.keyboard(value);
      }
      await user.clear(field(text.form.otherFeatureLabel(2)));
      await user.type(field(text.form.otherFeatureLabel(2)), 'Agenda y pacientes');
      await user.click(screen.getByRole('button', { name: text.form.removeOtherFeature(3) }));

      await user.click(save());

      expect(await screen.findByText(/^Detalle 8:/)).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/subscriptions/8');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(await screen.findByText(text.notices.created)).toBeInTheDocument();
      expect(catalog.requestsTo('POST', PATH)[0]?.body).toEqual({
        name: 'Clínica Plus',
        description: 'Para clínicas medianas.',
        monthly_price: '3200.50',
        annual_price: '32000.50',
        trial_days: 0,
        self_service: false,
        module_keys: ['patients'],
        other_features: ['Hasta 3 consultorios', 'Agenda y pacientes'],
        consulting_rooms_limit: 3,
        doctors_limit: 4,
        assistants_limit: 2,
        new_patients_per_year_limit: 8000,
      });
      expect(catalog.state.find(8)).toMatchObject({ statusId: 1, clinicsCount: 0 });
    });

    it('creates it with autoconsumo, trial days and modules with a dependency (US2-4, W9)', async () => {
      const catalog = start();
      const { user } = renderCreate();
      await fillIn(user);
      await user.click(
        screen.getByRole('switch', {
          name: new RegExp(`^${text.form.fields.selfService}`),
        }),
      );
      const trialDaysField = field(text.form.fields.trialDays);
      await user.clear(trialDaysField);
      await user.type(trialDaysField, '14');
      // Marking Recordatorios (a dependent) also marks its prerequisite, Agenda y citas.
      await user.click(
        screen.getByRole('checkbox', {
          name: new RegExp(`^${messages.subscriptions.modules.catalog.reminders.name}`),
        }),
      );

      await user.click(save());

      await screen.findByText(/^Detalle 8:/);
      const body = catalog.requestsTo('POST', PATH)[0]?.body;
      expect(body).toMatchObject({
        trial_days: 14,
        self_service: true,
        module_keys: ['patients', 'reminders', 'scheduling'],
      });
    });

    it('carries the search of the list it came from, to the detail and in «Cancelar»', async () => {
      start();
      const { user } = renderCreate({ listSearch: '?page=2&page_size=25' });
      expect(cancel()).toHaveAttribute('href', '/subscriptions?page=2&page_size=25');

      await fillIn(user);
      await user.click(save());

      expect(
        await screen.findByText('Detalle 8: {"listSearch":"?page=2&page_size=25"}'),
      ).toBeInTheDocument();
    });

    it('creates one subscription when «Guardar» is pressed several times in a row (FR-007)', async () => {
      const catalog = start();
      const { user } = renderCreate();
      await fillIn(user);

      fireEvent.click(save());
      fireEvent.click(save());
      fireEvent.click(save());

      await screen.findByText(/^Detalle 8:/);
      expect(catalog.requestsTo('POST', PATH)).toHaveLength(1);
    });

    it('cannot be cancelled while it is saving', async () => {
      const catalog = start();
      const { user } = renderCreate();
      await fillIn(user);
      const release = catalog.defer();

      await user.click(save());

      await waitFor(() => {
        expect(cancel()).toHaveAttribute('aria-disabled', 'true');
      });
      release();
      await screen.findByText(/^Detalle 8:/);
    });

    it('creates nothing when it is cancelled, and goes back to the list', async () => {
      const catalog = start();
      const { user } = renderCreate({ listSearch: '?page=2' });
      await fillIn(user);

      await user.click(cancel());

      expect(await screen.findByText('Listado ?page=2')).toBeInTheDocument();
      expect(catalog.requestsTo('POST', PATH)).toHaveLength(0);
    });
  });

  describe('when the API refuses', () => {
    it('shows a name in use next to the name, without the text of the API (US2-6)', async () => {
      start();
      const { user } = renderCreate();
      await fillIn(user, { name: ' pro ' });

      await user.click(save());

      await waitFor(() => {
        expect(name()).toHaveAccessibleDescription(text.errors.nameInUse);
      });
      expect(name()).toHaveFocus();
      expect(
        screen.queryByText(/Ya existe una suscripción con el nombre «/),
      ).not.toBeInTheDocument();
    });

    it('shows a refusal of other features above the list, with an own text', async () => {
      start();
      // The form never sends what the API would refuse here: the refusal is answered by hand.
      server.use(
        http.post(subscriptionsUrl(PATH), () =>
          HttpResponse.json(
            errorBody('validation_error', [
              { field: 'other_features', message: 'Un texto de la API' },
            ]),
            { status: 422 },
          ),
        ),
      );
      const { user } = renderCreate();
      await fillIn(user);
      await user.click(screen.getByRole('button', { name: text.form.addOtherFeature }));
      await user.keyboard('Agenda');

      await user.click(save());

      const error = await screen.findByText(text.errors.fields.otherFeatures);
      expect(
        error.compareDocumentPosition(field(text.form.otherFeatureLabel(1))) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.queryByText('Un texto de la API')).not.toBeInTheDocument();
    });

    it('shows a refusal of the modules next to the modules section, with an own text (research D10)', async () => {
      start();
      server.use(
        http.post(subscriptionsUrl(PATH), () =>
          HttpResponse.json(errorBody('subscription_module_prerequisite_missing'), {
            status: 409,
          }),
        ),
      );
      const { user } = renderCreate();
      await fillIn(user);

      await user.click(save());

      expect(await screen.findByText(text.errors.fields.moduleKeys)).toBeInTheDocument();
      // The rest of what was typed is kept.
      expect(name()).toHaveValue('Clínica Plus');
    });

    it('shows a refusal of a field the form does not have as a general error, with the focus', async () => {
      const catalog = start();
      const { user } = renderCreate();
      await fillIn(user);
      catalog.failNext({ method: 'POST', path: PATH, status: 422, code: 'validation_error' });

      await user.click(save());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text.errors.formInvalid);
      expect(alert).toHaveFocus();
    });

    it('shows a failure of the API as a general error and keeps what was typed', async () => {
      const catalog = start();
      catalog.failNext({ method: 'POST', path: PATH, status: 500, code: 'internal_error' });
      const { user } = renderCreate();
      await fillIn(user);

      await user.click(save());

      expect(await screen.findByRole('alert')).toHaveTextContent(text.errors.retryable);
      expect(name()).toHaveValue('Clínica Plus');
      expect(price()).toHaveValue('3200.50');
      expect(catalog.requestsTo('POST', PATH)).toHaveLength(1);
    });
  });

  it('has no accessibility violations, with and without errors', async () => {
    start();
    const { container, user } = renderCreate();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(save());

    expect(await axe(container)).toHaveNoViolations();
  });
});
