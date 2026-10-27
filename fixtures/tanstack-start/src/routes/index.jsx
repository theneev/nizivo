import { createFileRoute } from '@tanstack/react-router';
import Page from '../pages/home.jsx';

export const Route = createFileRoute('/')({ component: Page });
