// The pages, statically imported: the server renders them with renderToString, which does not wait
// for lazy chunks. Tree-shaking per page is measured by fixtures/vite and fixtures/next; this fixture
// checks server rendering and hydration.
import AlertDismiss from './pages/alert-dismiss.jsx';
import ButtonOnly from './pages/button-only.jsx';
import Forms from './pages/forms.jsx';
import Home from './pages/home.jsx';
import Menu from './pages/menu.jsx';
import Overlays from './pages/overlays.jsx';
import T0Barrel from './pages/t0-barrel.jsx';
import Tabs from './pages/tabs.jsx';

export const PAGES = {
  '/': Home,
  '/button-only': ButtonOnly,
  '/t0-barrel': T0Barrel,
  '/alert-dismiss': AlertDismiss,
  '/overlays': Overlays,
  '/forms': Forms,
  '/menu': Menu,
  '/tabs': Tabs,
};

function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
    </main>
  );
}

export function App({ path }) {
  const Page = PAGES[path] ?? NotFound;
  return <Page />;
}
