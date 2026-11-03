import type { ReactNode } from 'react';

// Lets a list hand its "create" action (a user, a subscription) to the overlay that the grid shows
// without rows, and the text that says why it is empty, which depends on its filters (feature 026).
declare module '@mui/x-data-grid' {
  interface NoRowsOverlayPropsOverrides {
    action?: ReactNode;
    message?: string;
  }
}
