// The granular CSS route (§5.2): tokens.css from @nizivo/tokens, then base.css (the a11y floor and
// the utilities), then one leaf file per component, all through the exports maps.
import '@nizivo/tokens/tokens.css';
import '@nizivo/react/css/base.css';
import '@nizivo/react/css/alert.css';
import '@nizivo/react/css/badge.css';
import '@nizivo/react/css/button.css';
import '@nizivo/react/css/card.css';
import '@nizivo/react/css/container.css';
import '@nizivo/react/css/delta.css';
import '@nizivo/react/css/dialog.css';
import '@nizivo/react/css/empty-state.css';
import '@nizivo/react/css/grid.css';
import '@nizivo/react/css/heading.css';
import '@nizivo/react/css/image.css';
import '@nizivo/react/css/inline-error.css';
import '@nizivo/react/css/inline.css';
import '@nizivo/react/css/kbd.css';
import '@nizivo/react/css/meter.css';
import '@nizivo/react/css/progress-bar.css';
import '@nizivo/react/css/progress-ring.css';
import '@nizivo/react/css/select.css';
import '@nizivo/react/css/separator.css';
import '@nizivo/react/css/skeleton.css';
import '@nizivo/react/css/stack.css';
import '@nizivo/react/css/text.css';
import '@nizivo/react/css/tooltip.css';

export const metadata = { title: 'Nizivo Next fixture' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
