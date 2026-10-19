import Button from '@mui/material/Button';

import { messages } from '@/shared/messages/es';

import { useLogout } from '../hooks/useLogout';

/** The way out of the session, available on every screen that has an operator or an account. */
export function LogoutButton({ color = 'inherit' }: { readonly color?: 'inherit' | 'primary' }) {
  const logout = useLogout();

  return (
    <Button
      variant="outlined"
      color={color}
      onClick={() => {
        void logout();
      }}
    >
      {messages.common.logout}
    </Button>
  );
}
