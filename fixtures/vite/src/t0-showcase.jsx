// Every week 2 T0 component on one page. The pages pass the components in, imported either through
// their subpaths or through the root barrel, so both import paths render the same markup.

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23d4d4d4'/%3E%3C/svg%3E";

/** Stand-in for an @nizivo/icons glyph. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function T0Showcase({ c }) {
  const { Alert, Badge, Button, Card, Container, Delta, EmptyState, Grid, GridItem } = c;
  const { Heading, Image, Inline, InlineError, Kbd, Meter, ProgressBar, ProgressRing } = c;
  const { Separator, Skeleton, Stack, Text } = c;
  return (
    <Container render={<main />}>
      <Stack gap="6">
        <Heading level={1}>{c.title}</Heading>
        <Text tone="secondary">Every server-safe component, rendered on the server only.</Text>
        <Alert icon={<Mark />} title="Payouts move to daily on Nov 1">
          No action needed.
        </Alert>
        <Inline gap="2">
          <Badge tone="success">Paid</Badge>
          <Badge tone="warning" dot={false}>
            Pending
          </Badge>
          <Delta value={0.124} comparison="vs last week" />
          <Delta value={-0.031} />
          <Kbd keys="mod+k" />
        </Inline>
        <Separator />
        <Grid>
          <GridItem span={{ base: 'full', sm: 6, lg: 4 }}>
            <Card.Root>
              <Card.Header>
                <Card.Title>Top products</Card.Title>
                <Card.Description>Last 30 days</Card.Description>
                <Card.Action>
                  <Button variant="tertiary" size="sm">
                    View all
                  </Button>
                </Card.Action>
              </Card.Header>
              <Card.Body>
                <Image
                  src={PHOTO}
                  alt="A grey placeholder photo"
                  width={16}
                  height={9}
                  ratio="16/9"
                />
              </Card.Body>
            </Card.Root>
          </GridItem>
          <GridItem span={{ base: 'full', sm: 6, lg: 4 }}>
            <Card.Root tone="subtle" padding="sm">
              <Stack gap="4">
                <ProgressBar value={40} label="Upload" />
                <Meter value={72} label="Storage" />
                <ProgressRing value={64} aria-label="Profile complete" />
              </Stack>
            </Card.Root>
          </GridItem>
          <GridItem span={{ base: 'full', lg: 4 }}>
            <Card.Root tone="inverse" elevation={1}>
              <Card.Body>Share your store to get your first order.</Card.Body>
            </Card.Root>
          </GridItem>
        </Grid>
        <Stack gap="2" aria-busy="true">
          <span className="nz-visually-hidden">Loading orders</span>
          <Skeleton shape="circle" />
          <Skeleton />
          <Skeleton shape="block" />
        </Stack>
        <InlineError icon={<Mark />}>The report could not load.</InlineError>
        <EmptyState
          title="No orders yet"
          actions={<Button variant="primary">Share your store</Button>}
        />
      </Stack>
    </Container>
  );
}
