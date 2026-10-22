// Every week 2 T0 component through the root barrel: no client module may ship.
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
import { T0Showcase } from '../t0-showcase.jsx';

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

export default function Page() {
  return <T0Showcase c={c} />;
}
