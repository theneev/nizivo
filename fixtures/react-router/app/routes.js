// The pages of fixtures/vite, as framework-mode routes.
import { index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.jsx'),
  route('button-only', 'routes/button-only.jsx'),
  route('t0-barrel', 'routes/t0-barrel.jsx'),
  route('alert-dismiss', 'routes/alert-dismiss.jsx'),
  route('overlays', 'routes/overlays.jsx'),
  route('forms', 'routes/forms.jsx'),
  route('menu', 'routes/menu.jsx'),
  route('tabs', 'routes/tabs.jsx'),
];
