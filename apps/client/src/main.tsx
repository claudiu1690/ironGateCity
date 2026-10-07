import '@irongate/ui/fonts';
import './index.css';
import { setClockSource } from '@irongate/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from './lib/queryClient';
import { initSentry } from './lib/sentry';
import { router } from './router';
import { serverNow } from './lib/useNow';

void initSentry();
// Review 4 (tech design §12.1): every time on screen reads the server's clock (the dev clock too).
setClockSource(serverNow);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
