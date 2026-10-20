import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { parseEnv } from './config/env';
import { ConfigErrorScreen } from './ConfigErrorScreen';

const validSource = {
  VITE_AUTH0_DOMAIN: 'dev-angel-java.us.auth0.com',
  VITE_AUTH0_CLIENT_ID: 'spa-client-id',
  VITE_AUTH0_AUDIENCE: 'https://mailysoft-apis',
  VITE_USERS_API_URL: '/proxy/users',
  VITE_SUBSCRIPTIONS_API_URL: '/proxy/subscriptions',
};

/** The errors that a configuration with an interval of the Panel of 2.5 minutes produces. */
function errorsOfAWrongInterval(): readonly string[] {
  const result = parseEnv(
    { ...validSource, VITE_DASHBOARD_REFRESH_MINUTES: '2.5' },
    { isProduction: false },
  );
  if (result.ok) {
    throw new Error('Expected the environment to be rejected');
  }
  return result.errors;
}

describe('ConfigErrorScreen', () => {
  it('names the variable of the interval of the Panel and its rule, without the value it received (FR-029, SC-008)', () => {
    const { container } = render(<ConfigErrorScreen errors={errorsOfAWrongInterval()} />);

    expect(screen.getByText(messages.config.title)).toBeInTheDocument();
    expect(
      screen.getByText(
        'VITE_DASHBOARD_REFRESH_MINUTES: Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.',
      ),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent('2.5');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfigErrorScreen errors={errorsOfAWrongInterval()} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
