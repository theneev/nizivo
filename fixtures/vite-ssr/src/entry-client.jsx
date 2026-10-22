// The client entry: the same stylesheets as fixtures/vite (Nizivo's JavaScript never imports CSS),
// then hydration of the server's HTML. Every recoverable hydration error is logged, so the runner's
// console check fails the page.
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

import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './app.jsx';

hydrateRoot(
  document.getElementById('root'),
  <StrictMode>
    <App path={location.pathname} />
  </StrictMode>,
  {
    onRecoverableError: (error) => console.error('hydration:', error),
  },
);
