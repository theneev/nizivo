import type { JSX } from 'react';
import { Button } from '../button/index';
import { BulkActionBar } from './index';

/**
 * The bar alone, as the server renders it: the count stays hidden until TableSelection's island
 * writes it (the Table selection page shows it working).
 */
export function BulkActionBarExample(): JSX.Element {
  return (
    <BulkActionBar style={{ maxInlineSize: 560 }}>
      <Button size="sm" variant="secondary">
        Archive
      </Button>
      <Button size="sm" variant="critical">
        Delete
      </Button>
    </BulkActionBar>
  );
}
