// The MDX `<Callout>` (Fumadocs' props: `type`, `title`) drawn as Nizivo's Alert (M90), so a note on
// a docs page looks like the kit's own. The glyph is decorative; the title carries the meaning.
import type { JSX, ReactNode } from 'react';
import { Alert, type AlertTone } from '@nizivo/react/alert';
import { CircleCheck } from '@nizivo/icons/circle-check';
import { CircleX } from '@nizivo/icons/circle-x';
import { Info } from '@nizivo/icons/info';
import { Lightbulb } from '@nizivo/icons/lightbulb';
import { TriangleAlert } from '@nizivo/icons/triangle-alert';

type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'idea';

const TONES: Record<CalloutType, { tone: AlertTone; icon: JSX.Element }> = {
  info: { tone: 'info', icon: <Info /> },
  idea: { tone: 'info', icon: <Lightbulb /> },
  warn: { tone: 'warning', icon: <TriangleAlert /> },
  warning: { tone: 'warning', icon: <TriangleAlert /> },
  error: { tone: 'critical', icon: <CircleX /> },
  success: { tone: 'success', icon: <CircleCheck /> },
};

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: CalloutType;
  title?: ReactNode;
  children?: ReactNode;
}): JSX.Element {
  const { tone, icon } = TONES[type];
  return (
    <Alert tone={tone} icon={icon} title={title} className="nz-docs-callout">
      {children}
    </Alert>
  );
}
