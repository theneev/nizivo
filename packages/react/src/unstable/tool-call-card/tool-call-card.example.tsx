import type { JSX } from 'react';
import { Button } from '../../button/index';
import { ToolCallCard } from './index';

/** Three states of one action: running, done, and failed with a scoped retry. */
export function ToolCallCardExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 460 }}>
      <ToolCallCard
        title="Tag products on 3 posts"
        status="running"
        steps={[
          { label: 'Find posts from last week', status: 'done' },
          { label: 'Match products by name', status: 'running' },
          { label: 'Apply tags', status: 'todo' },
        ]}
      />
      <ToolCallCard
        title="Tag products on 3 posts"
        status="done"
        steps={[
          { label: 'Find posts from last week', status: 'done' },
          { label: 'Match products by name', status: 'done' },
          { label: 'Apply tags', status: 'done' },
        ]}
      />
      <ToolCallCard
        title="Tag products on 3 posts"
        status="failed"
        steps={[
          { label: 'Find posts from last week', status: 'done' },
          { label: 'Match products by name', status: 'done' },
          { label: 'Apply tags — Instagram rejected 1 post', status: 'failed' },
        ]}
        actions={
          <Button variant="secondary" size="sm">
            Retry failed step
          </Button>
        }
      />
    </div>
  );
}
