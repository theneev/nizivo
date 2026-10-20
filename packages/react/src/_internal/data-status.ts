// packages/react/src/_internal/data-status.ts (plan §16.5). Shared by every data-display part.
export type DataStatus = 'ready' | 'loading' | 'empty' | 'error';

/** The §16.5 attributes for a resolved status (ready with no value is 'empty' upstream). */
export function dataStatusAttrs(
  status: DataStatus,
  pending?: boolean,
): Record<string, string | boolean | undefined> {
  return {
    'data-loading': status === 'loading' ? '' : undefined,
    'data-empty': status === 'empty' ? '' : undefined,
    'data-error': status === 'error' ? '' : undefined,
    'data-pending': pending ? '' : undefined,
    'aria-busy': status === 'loading' || pending || undefined,
  };
}
