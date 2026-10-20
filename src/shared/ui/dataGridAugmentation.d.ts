import type { ReactNode } from 'react';

// Lets the list hand its "create a user" action to the overlay that the grid shows without rows.
declare module '@mui/x-data-grid' {
  interface NoRowsOverlayPropsOverrides {
    action?: ReactNode;
  }
}
