import type { JSX } from 'react';
import { Text } from './index';

export function TextExample(): JSX.Element {
  return (
    <div>
      <Text>Shown on product pages and checkout.</Text>
      <Text variant="body-m" tone="secondary">
        No action needed.
      </Text>
      <Text variant="numeric-kpi" tone="primary" render={<span />}>
        ₹4,82,190
      </Text>
      <Text variant="label-s" tone="tertiary" render={<span />}>
        Updated 2 min ago
      </Text>
      <Text variant="mono-m" tone="secondary" render={<code />}>
        SKU-1040
      </Text>
    </div>
  );
}
