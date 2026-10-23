import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { messages } from '@/shared/messages/es';

import { ROLE_TYPE_TABS } from '../schemas/rolePermissionsLocation';
import { useRolePermissionsLocation } from '../hooks/useRolePermissionsLocation';

const text = messages.roles.tabs;

/** Clínica / Sistema (research D5): which tab is active lives in the URL, via `type`. */
export function RoleTypeTabs() {
  const { location, setType } = useRolePermissionsLocation();

  return (
    <Tabs
      value={location.type}
      onChange={(_event, value: (typeof ROLE_TYPE_TABS)[number]) => {
        setType(value);
      }}
      aria-label={text.ariaLabel}
    >
      {ROLE_TYPE_TABS.map((tab) => (
        <Tab key={tab} value={tab} label={text[tab]} />
      ))}
    </Tabs>
  );
}
