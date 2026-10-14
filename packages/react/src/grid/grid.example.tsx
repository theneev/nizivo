import type { JSX } from 'react';
import { Grid, GridItem } from './index';

export function GridExample(): JSX.Element {
  return (
    <Grid>
      {/* Desktop 8 + 4; tablet and mobile take the full row. */}
      <GridItem span={{ base: 'full', lg: 8 }}>Revenue</GridItem>
      <GridItem span={{ base: 'full', lg: 4 }}>Top products</GridItem>
      {/* KPI tiles: one column on mobile, 2 × 2 on tablet, four across on desktop. */}
      <GridItem span={{ base: 'full', sm: 4, lg: 3 }}>Orders</GridItem>
      <GridItem span={{ base: 'full', sm: 4, lg: 3 }}>Visitors</GridItem>
      <GridItem span={{ base: 'full', sm: 4, lg: 3 }}>Conversion</GridItem>
      <GridItem span={{ base: 'full', sm: 4, lg: 3 }}>Average order</GridItem>
    </Grid>
  );
}
