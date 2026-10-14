// @nizivo/react/augment: types only (ARCHITECTURE.md §8.6). Consumers add variants with
//   declare module '@nizivo/react/augment' { interface ButtonVariantMap { ai: true } }
// plus CSS for `.nz-button[data-variant="ai"]`.

/** Button variants, as lowercase Figma names. Augment this interface to add one. */
export interface ButtonVariantMap {
  primary: true;
  secondary: true;
  tertiary: true;
  critical: true;
  accent: true;
}

export type ButtonVariant = keyof ButtonVariantMap;

/** Control heights 32 / 40 / 48 px. */
export type ControlSize = 'sm' | 'md' | 'lg';
