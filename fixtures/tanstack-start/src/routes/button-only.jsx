import { createFileRoute } from '@tanstack/react-router';
import Page from '../pages/button-only.jsx';

export const Route = createFileRoute('/button-only')({ component: Page });
