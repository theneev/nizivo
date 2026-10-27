import { createFileRoute } from '@tanstack/react-router';
import Page from '../pages/tabs.jsx';

export const Route = createFileRoute('/tabs')({ component: Page });
