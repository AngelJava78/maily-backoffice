import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { operatorAccess } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HeaderUserMenu } from './HeaderUserMenu';

describe('HeaderUserMenu', () => {
  it('reserves an empty slot to the right for the profile icon (Spec 5) and the language switcher (Spec 7)', () => {
    renderWithProviders(<HeaderUserMenu />, { access: operatorAccess() });

    expect(screen.getByTestId('header-reserved-slot')).toBeInTheDocument();
    expect(screen.getByTestId('header-reserved-slot')).toBeEmptyDOMElement();
  });
});
