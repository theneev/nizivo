// NO directive: AiWelcome is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// AI Welcome 7411:321). The empty state of a new conversation: a greeting, what the assistant can
// see and do (be honest about its scope and its access to data), then the starters and the
// composer, passed as children (a SuggestionGroup, a PromptComposer). The orb is decoration, drawn
// with CSS as VoiceOrb's is; `orb` takes a shader or a picture in its place.
// UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface AiWelcomeProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** "Good morning, Maya". */
  greeting: ReactNode;
  /** The greeting's level, so the empty state fits the page outline. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** What the assistant can see and do: "Ask about your orders… I can see your store and Instagram." */
  description?: ReactNode;
  /** Replaces the CSS orb. Decorative: hidden from assistive technology. */
  orb?: ReactNode;
  /** Must render a `<section>`. */
  render?: RenderProp<Record<string, never>>;
}

export function AiWelcome({
  greeting,
  headingLevel = 2,
  description,
  orb,
  render,
  className,
  children,
  ...rest
}: AiWelcomeProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'section',
    render,
    {},
    {
      'data-slot': 'ai-welcome',
      ...rest,
      className: cx('nz-ai-welcome', className),
      children: (
        <>
          <span className="nz-ai-welcome-orb" aria-hidden="true">
            {orb ?? <span className="nz-ai-welcome-sphere" />}
          </span>
          <Heading className="nz-ai-welcome-greeting" data-slot="ai-welcome-greeting">
            {greeting}
          </Heading>
          {description != null && (
            <p className="nz-ai-welcome-description" data-slot="ai-welcome-description">
              {description}
            </p>
          )}
          {children}
        </>
      ),
    },
  );
}
