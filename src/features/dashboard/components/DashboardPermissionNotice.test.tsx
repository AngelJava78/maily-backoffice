import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import { DashboardPermissionNotice } from './DashboardPermissionNotice';

const text = messages.dashboard.noPermission;

describe('DashboardPermissionNotice', () => {
  it('tells the person that they may not see the indicators of the platform (FR-011)', () => {
    render(<DashboardPermissionNotice />);

    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent(text.title);
    expect(notice).toHaveTextContent(text.message);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DashboardPermissionNotice />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
