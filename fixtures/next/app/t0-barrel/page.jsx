// Server-only page: every week 2 T0 component through the root barrel. It must load no @nizivo
// client module, under plain webpack too: the S2c leak needs a rendered client part.
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
import { T0Showcase } from '../_t0/showcase';

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
