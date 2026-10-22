// The root route (r1 §5.4): Nizivo's stylesheets through the `links` export with `?url` (its
// JavaScript never imports CSS), the theme script in the Layout's <head>, and data-nz-theme="system"
// on <html>, as the docs' React Router page teaches.
import { themeScript } from '@nizivo/react/theme-script';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import css0 from '@nizivo/tokens/tokens.css?url';
import css1 from '@nizivo/react/css/base.css?url';
import css2 from '@nizivo/react/css/alert.css?url';
import css3 from '@nizivo/react/css/badge.css?url';
import css4 from '@nizivo/react/css/button.css?url';
import css5 from '@nizivo/react/css/card.css?url';
import css6 from '@nizivo/react/css/checkbox.css?url';
import css7 from '@nizivo/react/css/container.css?url';
import css8 from '@nizivo/react/css/delta.css?url';
import css9 from '@nizivo/react/css/dialog.css?url';
import css10 from '@nizivo/react/css/empty-state.css?url';
import css11 from '@nizivo/react/css/field.css?url';
import css12 from '@nizivo/react/css/fieldset.css?url';
import css13 from '@nizivo/react/css/grid.css?url';
import css14 from '@nizivo/react/css/heading.css?url';
import css15 from '@nizivo/react/css/icon-button.css?url';
import css16 from '@nizivo/react/css/image.css?url';
import css17 from '@nizivo/react/css/inline.css?url';
import css18 from '@nizivo/react/css/inline-error.css?url';
import css19 from '@nizivo/react/css/input.css?url';
import css20 from '@nizivo/react/css/kbd.css?url';
import css21 from '@nizivo/react/css/menu.css?url';
import css22 from '@nizivo/react/css/meter.css?url';
import css23 from '@nizivo/react/css/native-select.css?url';
import css24 from '@nizivo/react/css/progress-bar.css?url';
import css25 from '@nizivo/react/css/progress-ring.css?url';
import css26 from '@nizivo/react/css/radio-group.css?url';
import css27 from '@nizivo/react/css/segmented-control.css?url';
import css28 from '@nizivo/react/css/select.css?url';
import css29 from '@nizivo/react/css/separator.css?url';
import css30 from '@nizivo/react/css/skeleton.css?url';
import css31 from '@nizivo/react/css/stack.css?url';
import css32 from '@nizivo/react/css/switch.css?url';
import css33 from '@nizivo/react/css/tab-nav.css?url';
import css34 from '@nizivo/react/css/tabs.css?url';
import css35 from '@nizivo/react/css/text.css?url';
import css36 from '@nizivo/react/css/textarea.css?url';
import css37 from '@nizivo/react/css/tooltip.css?url';
import app from './app.css?url';

export const links = () =>
  [
    css0,
    css1,
    css2,
    css3,
    css4,
    css5,
    css6,
    css7,
    css8,
    css9,
    css10,
    css11,
    css12,
    css13,
    css14,
    css15,
    css16,
    css17,
    css18,
    css19,
    css20,
    css21,
    css22,
    css23,
    css24,
    css25,
    css26,
    css27,
    css28,
    css29,
    css30,
    css31,
    css32,
    css33,
    css34,
    css35,
    css36,
    css37,
    app,
  ].map((href) => ({ rel: 'stylesheet', href }));

export function Layout({ children }) {
  return (
    // the theme script changes <html>'s attributes before hydration
    <html lang="en" data-nz-theme="system" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Nizivo React Router fixture</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
