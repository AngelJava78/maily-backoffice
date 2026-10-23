import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import { NavLink } from 'react-router';

import { useLogout, useOperatorIdentity } from '@/features/auth';
import { messages } from '@/shared/messages/es';
import { Avatar } from '@/shared/ui/Avatar';

/**
 * The avatar button of the header, and the menu it opens (011-profile-avatar-menu): who the
 * person is (name, e-mail, active role(s), read only — FR-002), "Mi perfil" and "Cerrar sesión".
 * No option to switch the active role or the account/user (SC-003) — unlike the reference
 * applications the spec took inspiration from. Same accessibility pattern as
 * `SubscriptionStatusMenu` (`anchor` state, `aria-haspopup`/`aria-controls`/`aria-expanded`,
 * `useId()`), research.md D3.
 */
export function ProfileMenu() {
  const identity = useOperatorIdentity();
  const logout = useLogout();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const ids = { button: useId(), menu: useId() };

  function close(): void {
    setAnchor(null);
  }

  return (
    <>
      <IconButton
        id={ids.button}
        aria-haspopup="menu"
        aria-controls={anchor === null ? undefined : ids.menu}
        aria-expanded={anchor === null ? undefined : 'true'}
        aria-label={messages.nav.profileMenu(identity.displayName)}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
      >
        <Avatar name={identity.displayName} id={identity.id} />
      </IconButton>
      <Menu
        id={ids.menu}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        slotProps={{ list: { 'aria-labelledby': ids.button } }}
      >
        <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {identity.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {identity.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {identity.roles.map((role) => role.name).join(', ')}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={NavLink} to="/profile" onClick={close}>
          {messages.profile.title}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            void logout();
          }}
          sx={{ color: 'error.main' }}
        >
          {messages.common.logout}
        </MenuItem>
      </Menu>
    </>
  );
}
