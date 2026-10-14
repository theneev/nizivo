// Fixture: a server-safe simple component (no directive), shaped like ARCHITECTURE.md §10.2.
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'critical' | 'accent';

export interface ButtonState {
  variant: ButtonVariant;
  pending: boolean;
}

export interface ButtonProps {
  variant?: ButtonVariant;
  pending?: boolean;
}

const baseClass = 'nz-button';

export function Button(props: ButtonProps): ButtonState & { className: string } {
  return {
    variant: props.variant ?? 'secondary',
    pending: props.pending ?? false,
    className: baseClass,
  };
}
