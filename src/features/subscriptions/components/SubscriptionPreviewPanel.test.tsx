import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import type { ClinicModule } from '../schemas/clinicModule';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { SubscriptionPreviewPanel } from './SubscriptionPreviewPanel';

const text = messages.subscriptions.preview;
const price = messages.subscriptions.price;
const comparison = messages.subscriptions.comparison;

const MODULES: ClinicModule[] = [
  { key: 'patients', name: 'Pacientes', description: null, sortOrder: 10 },
  { key: 'scheduling', name: 'Agenda y citas', description: null, sortOrder: 20 },
  { key: 'reminders', name: 'Recordatorios', description: null, sortOrder: 30 },
  { key: 'finance', name: 'Finanzas', description: null, sortOrder: 40 },
];

const VALUES: SubscriptionFormValues = {
  name: 'Profesional',
  description: 'Para consultorios con varios doctores.',
  subscriptionTypeId: 1,
  clinicsLimit: '1',
  monthlyPrice: '1299.00',
  annualPrice: '12990.00',
  trialDays: '14',
  selfService: true,
  // Does not include `patients`: resolveModuleSelection must still show it as included (021).
  moduleKeys: new Set<string>(['scheduling', 'reminders']),
  consultingRoomsLimit: '2',
  doctorsLimit: '3',
  assistantsLimit: '2',
  newPatientsPerYearLimit: '15000',
  otherFeatures: [{ value: 'Soporte por correo y WhatsApp' }],
};

describe('SubscriptionPreviewPanel', () => {
  it('shows its own title and subtitle', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(screen.getByText(text.title)).toBeInTheDocument();
    expect(screen.getByText(text.subtitle)).toBeInTheDocument();
  });

  it('shows the name, the badge and the description', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(screen.getByText('Profesional')).toBeInTheDocument();
    expect(screen.getByText(messages.subscriptions.badge.selfService)).toBeInTheDocument();
    expect(screen.getByText('Para consultorios con varios doctores.')).toBeInTheDocument();
  });

  it('starts in Mensual and shows the monthly price', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(screen.getByText('$1,299.00/mes')).toBeInTheDocument();
  });

  it('switches to the annual price, with its saving, when Anual is chosen', async () => {
    const user = userEvent.setup();
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    await user.click(screen.getByRole('button', { name: comparison.priceToggle.annual }));

    expect(screen.getByText('$12,990.00/año')).toBeInTheDocument();
    expect(screen.getByText(price.savingsBadge(17))).toBeInTheDocument();
  });

  it('shows the trial days, hidden when it is 0', () => {
    const { rerender } = render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);
    expect(screen.getByText(price.trialDays(14))).toBeInTheDocument();

    rerender(<SubscriptionPreviewPanel values={{ ...VALUES, trialDays: '0' }} modules={MODULES} />);
    expect(screen.queryByText(/días de prueba/)).not.toBeInTheDocument();
  });

  it('lists the marked modules of the vigente catalog, Pacientes forced in even if not marked, and names the ones not included', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Agenda y citas')).toBeInTheDocument();
    expect(screen.getByText('Recordatorios')).toBeInTheDocument();
    expect(
      screen.getByText(messages.subscriptions.detail.notIncluded('Finanzas')),
    ).toBeInTheDocument();
  });

  it('shows the four limits under "Podrá dar de alta"', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    const section = screen.getByText(messages.subscriptions.preview.limitsTitle).parentElement;
    expect(section).not.toBeNull();
    expect(section).toHaveTextContent('2');
    expect(section).toHaveTextContent('3');
    expect(section).toHaveTextContent('15000');
  });

  it('shows the other features captured so far', () => {
    render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(screen.getByText('Soporte por correo y WhatsApp')).toBeInTheDocument();
  });

  it('updates live when the values change', () => {
    const { rerender } = render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);
    expect(screen.getByText('Profesional')).toBeInTheDocument();

    rerender(
      <SubscriptionPreviewPanel values={{ ...VALUES, name: 'Avanzado' }} modules={MODULES} />,
    );

    expect(screen.queryByText('Profesional')).not.toBeInTheDocument();
    expect(screen.getByText('Avanzado')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SubscriptionPreviewPanel values={VALUES} modules={MODULES} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
