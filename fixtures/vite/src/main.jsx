// The CSS import rule (§5.2, §11.1): Nizivo's JavaScript never imports CSS, so the app imports the
// tokens, the accessibility floor and one stylesheet per component once, here.
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

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// One lazy chunk per page, so each page's JavaScript shows what Vite kept from its imports. The entry
// chunk itself imports nothing from @nizivo.
const PAGES = {
  '/': lazy(() => import('./pages/home.jsx')),
  '/button-only': lazy(() => import('./pages/button-only.jsx')),
  '/button-subpath': lazy(() => import('./pages/button-subpath.jsx')),
  '/t0-barrel': lazy(() => import('./pages/t0-barrel.jsx')),
  '/alert-dismiss': lazy(() => import('./pages/alert-dismiss.jsx')),
  '/overlays': lazy(() => import('./pages/overlays.jsx')),
  '/barrel-select': lazy(() => import('./pages/barrel-select.jsx')),
  '/forms': lazy(() => import('./pages/forms.jsx')),
  '/menu': lazy(() => import('./pages/menu.jsx')),
  '/tabs': lazy(() => import('./pages/tabs.jsx')),
  '/tab-nav': lazy(() => import('./pages/tab-nav.jsx')),
  '/icons': lazy(() => import('./pages/icons.jsx')),
};

function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
    </main>
  );
}

const Page = PAGES[location.pathname] ?? NotFound;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  </StrictMode>,
);
