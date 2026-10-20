import type { ReactNode } from 'react';

// Lets a list hand its "create" action (a user, a subscription) to the overlay that the grid shows
// without rows.
declare module '@mui/x-data-grid' {
  interface NoRowsOverlayPropsOverrides {
    action?: ReactNode;
  }
}
