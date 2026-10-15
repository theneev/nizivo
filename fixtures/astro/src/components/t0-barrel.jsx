// The T0 set through the root barrel, for a server-only page (no client directive).
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Delta,
  EmptyState,
  Grid,
  GridItem,
  Heading,
  Image,
  Inline,
  InlineError,
  Kbd,
  Meter,
  ProgressBar,
  ProgressRing,
  Separator,
  Skeleton,
  Stack,
  Text,
} from '@nizivo/react';
import { T0Showcase } from './t0-showcase.jsx';

const c = {
  title: 'Server-safe components (barrel)',
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Delta,
  EmptyState,
  Grid,
  GridItem,
  Heading,
  Image,
  Inline,
  InlineError,
  Kbd,
  Meter,
  ProgressBar,
  ProgressRing,
  Separator,
  Skeleton,
  Stack,
  Text,
};

export function T0Barrel() {
  return <T0Showcase c={c} />;
}
