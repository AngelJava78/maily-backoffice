import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { parseEnv } from '@/app/config/env';
import { ConfigErrorScreen } from '@/app/ConfigErrorScreen';
import { StyleCacheProvider } from '@/app/providers/StyleCacheProvider';
import { router } from '@/app/router/router';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('The #root element is missing from index.html');
}

// The configuration is validated before anything starts: a wrong one stops the application with a
// clear message instead of failing later in an obscure way.
const parsed = parseEnv(import.meta.env, { isProduction: import.meta.env.PROD });

createRoot(container).render(
  <StrictMode>
    <StyleCacheProvider>
      {parsed.ok ? (
        <App env={parsed.env} router={router} />
      ) : (
        <ConfigErrorScreen errors={parsed.errors} />
      )}
    </StyleCacheProvider>
  </StrictMode>,
);
