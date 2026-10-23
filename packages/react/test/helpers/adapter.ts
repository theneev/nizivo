// Which Tooltip adapter the lane runs (test/adapters.ts): the node and overlay lanes each check it,
// so a lane that names `NZ_ADAPTER=hooks` fails if the swap did not happen.
import * as Components from '../../src/_engines/react-aria/tooltip.client';
import * as Hooks from '../../src/_engines/react-aria/tooltip.hooks.client';
import * as Engine from '../../src/tooltip/engine';

export function tooltipAdapter(): { named: string; running: string } {
  const running =
    Engine.Root === Hooks.Root ? 'hooks' : Engine.Root === Components.Root ? 'default' : 'unknown';
  return { named: NZ_ADAPTER_NAME, running };
}
