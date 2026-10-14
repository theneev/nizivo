// Server-only page: every week 2 T0 component through its own subpath. It must load no @nizivo
// client module.
import { Alert } from '@nizivo/react/alert';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Container } from '@nizivo/react/container';
import { Delta } from '@nizivo/react/delta';
import { EmptyState } from '@nizivo/react/empty-state';
import { Grid, GridItem } from '@nizivo/react/grid';
import { Heading } from '@nizivo/react/heading';
import { Image } from '@nizivo/react/image';
import { Inline } from '@nizivo/react/inline';
import { InlineError } from '@nizivo/react/inline-error';
import { Kbd } from '@nizivo/react/kbd';
import { Meter } from '@nizivo/react/meter';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { ProgressRing } from '@nizivo/react/progress-ring';
import { Separator } from '@nizivo/react/separator';
import { Skeleton } from '@nizivo/react/skeleton';
import { Stack } from '@nizivo/react/stack';
import { Text } from '@nizivo/react/text';
import { T0Showcase } from '../_t0/showcase';

const c = {
  title: 'Server-safe components (subpaths)',
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
