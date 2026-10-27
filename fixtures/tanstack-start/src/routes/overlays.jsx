import { createFileRoute } from '@tanstack/react-router';
import Page from '../pages/overlays.jsx';

export const Route = createFileRoute('/overlays')({ component: Page });
