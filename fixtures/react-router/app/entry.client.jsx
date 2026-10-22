// The client entry: hydration that logs every recoverable error, so the runner's console check fails
// a page whose server and client renders differ.
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
    { onRecoverableError: (error) => console.error('hydration:', error) },
  );
});
