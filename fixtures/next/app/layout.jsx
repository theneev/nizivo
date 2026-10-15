// The granular CSS route (§5.2): tokens.css from @nizivo/tokens, then base.css (the a11y floor and
// the utilities), then one leaf file per component, all through the exports maps.
import '@nizivo/tokens/tokens.css';
import '@nizivo/react/css/base.css';
import '@nizivo/react/css/alert.css';
import '@nizivo/react/css/badge.css';
import '@nizivo/react/css/button.css';
import '@nizivo/react/css/card.css';
import '@nizivo/react/css/checkbox.css';
import '@nizivo/react/css/container.css';
import '@nizivo/react/css/delta.css';
import '@nizivo/react/css/dialog.css';
import '@nizivo/react/css/empty-state.css';
import '@nizivo/react/css/field.css';
import '@nizivo/react/css/fieldset.css';
import '@nizivo/react/css/grid.css';
import '@nizivo/react/css/heading.css';
import '@nizivo/react/css/icon-button.css';
import '@nizivo/react/css/image.css';
import '@nizivo/react/css/inline.css';
import '@nizivo/react/css/inline-error.css';
import '@nizivo/react/css/input.css';
import '@nizivo/react/css/kbd.css';
import '@nizivo/react/css/menu.css';
import '@nizivo/react/css/meter.css';
import '@nizivo/react/css/native-select.css';
import '@nizivo/react/css/progress-bar.css';
import '@nizivo/react/css/progress-ring.css';
import '@nizivo/react/css/radio-group.css';
import '@nizivo/react/css/segmented-control.css';
import '@nizivo/react/css/select.css';
import '@nizivo/react/css/separator.css';
import '@nizivo/react/css/skeleton.css';
import '@nizivo/react/css/stack.css';
import '@nizivo/react/css/switch.css';
import '@nizivo/react/css/tab-nav.css';
import '@nizivo/react/css/tabs.css';
import '@nizivo/react/css/text.css';
import '@nizivo/react/css/textarea.css';
import '@nizivo/react/css/tooltip.css';

import './app.css';

import { ThemeScript } from '@nizivo/react/theme-script';

export const metadata = { title: 'Nizivo Next fixture' };

// A stored theme choice, applied before first paint (the docs' Next.js page teaches the same pattern;
// ThemeScript does not persist the theme yet). With nothing stored, data-nz-theme="system" follows
// the OS with no script at all. runner/theme.ts checks that no light frame paints first.
const storedTheme = `(function(){try{var t=localStorage.getItem('nz-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-nz-theme',t)}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    // Both scripts change <html>'s attributes before hydration (data-nz-theme, data-nz-platform), so
    // <html> takes suppressHydrationWarning, as ThemeScript's JSDoc says.
    <html lang="en" data-nz-theme="system" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: storedTheme }} />
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
