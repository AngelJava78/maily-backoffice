import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import { messages } from '@/shared/messages/es';

import { theme } from './theme/theme';

/** What the person sees when the environment variables are wrong: the app cannot start. */
export function ConfigErrorScreen({ errors }: { readonly errors: readonly string[] }) {
  return (
    <ThemeProvider theme={theme}>
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
