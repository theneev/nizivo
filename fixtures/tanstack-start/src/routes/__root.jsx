// The root route, as the docs' TanStack Start page teaches (ARCHITECTURE.md §11.1): Nizivo's one
// stylesheet through `head().links` with `?url` (its JavaScript never imports CSS), ThemeScript first
// in <head>, and data-nz-theme="system" on <html>.
import { ThemeScript } from '@nizivo/react/theme-script';
import styles from '@nizivo/react/styles.css?url';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import app from '../app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Nizivo TanStack Start fixture' },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      { rel: 'stylesheet', href: app },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    // the theme script changes <html>'s attributes before hydration
    <html lang="en" data-nz-theme="system" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
