import type { JSX } from 'react';
import { Badge } from '../badge/index';
import { Button } from '../button/index';
import { SegmentedControl } from '../segmented-control/index';
import { PageHeader } from './index';

/** A stand-in for `@nizivo/icons`' download. */
function Download(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5" />
    </svg>
  );
}

const RANGES = [
  ['today', 'Today'],
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['12m', '12M'],
] as const;

/**
 * The Overview's header (08): the greeting, the range and Export. The header is a server
 * component; the SegmentedControl is its one client part.
 */
export function PageHeaderExample(): JSX.Element {
  return (
    <PageHeader
      title="Good morning, Maya"
      actions={
        <>
          <SegmentedControl.Root aria-label="Range" name="range" defaultValue="30d">
            {RANGES.map(([value, label]) => (
              <SegmentedControl.Item key={value} value={value}>
                {label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
          <Button leadingIcon={<Download />}>Export</Button>
        </>
      }
    />
  );
}

/** A resource page (08 Pattern 2): a status Badge after the title, a line under it, two actions. */
export function PageHeaderDetailExample(): JSX.Element {
  return (
    <PageHeader
      title="Stoneware mug"
      meta={<Badge tone="success">Active</Badge>}
      description="Last edited today at 09:12"
      actions={
        <>
          <Button>Preview</Button>
          <Button variant="primary">Save</Button>
        </>
      }
    />
  );
}
