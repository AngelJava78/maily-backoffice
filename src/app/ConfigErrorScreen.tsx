import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import { messages } from '@/shared/messages/es';

import { createAppTheme } from './theme/theme';

/**
 * What the person sees when the environment variables are wrong: the app cannot start. Renders
 * before `ThemeModeProvider` would even mount (`main.tsx`), so it uses a plain light theme instead
 * of depending on the theme-mode machinery (009-dark-mode-toggle) for a screen whose only job is
 * to report a fatal configuration error as plainly as possible.
 */
export function ConfigErrorScreen({ errors }: { readonly errors: readonly string[] }) {
  return (
    <ThemeProvider theme={createAppTheme('claro')}>
      <CssBaseline />
      <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>{messages.config.title}</AlertTitle>
          {messages.config.message}
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      </Container>
    </ThemeProvider>
  );
}
