// What the browser harness (test/visual/harness.tsx) exposes on `globalThis.nzVisual` and the
// runner (run.ts) calls through page.evaluate. Plain data only: the harness compiles with the DOM
// library, the runner with Node's, and both import this file.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExampleRef {
  /** The component folder: `select`. */
  component: string;
  /** The exported function: `SelectOpenExample`. */
  name: string;
  /** The file-name part: `open` (`basic` for `<Name>Example`). */
  slug: string;
}

/** One interactive control of the example's own component, found by its `data-slot`. */
export interface Control {
  /** `data-nz-visual` value the harness put on the element, for a Playwright locator. */
  id: string;
  slot: string;
  /** Position among the example's elements with this slot. */
  index: number;
  disabled: boolean;
  /** A trigger that opens a popup on press (Dialog, Menu, Select). */
  opens: boolean;
  /** It may open a Tooltip on hover and focus (a Tooltip trigger, an IconButton). */
  tooltip: boolean;
}

export interface Mounted {
  /** A popup is open after mount (the `defaultOpen` examples). */
  open: boolean;
  controls: Control[];
}

export interface Focused {
  /** Focus is inside the example or one of its popups. */
  inside: boolean;
  /** A stable key for the focused element, to stop when Tab comes round again. */
  key: string;
  /** `data-slot` of the nearest slotted ancestor-or-self. */
  slot: string;
  /** As Control.tooltip. */
  tooltip: boolean;
}

export type Theme = 'light' | 'dark';

export interface VisualApi {
  examples(): ExampleRef[];
  /** Loads the Geist faces the tokens name and checks both are in use. */
  fontsReady(): Promise<boolean>;
  mount(component: string, name: string): Promise<Mounted>;
  unmount(): Promise<void>;
  /** Waits for fonts, two frames and every `data-entering`/`data-exiting` to clear. */
  settle(): Promise<void>;
  setTheme(theme: Theme): void;
  /** Focuses the sentinel before the stage, so the next Tab enters the example. */
  resetFocus(): void;
  focused(): Focused;
  /** Marks the focused element so its crop can be taken; returns its `data-nz-visual` id. */
  markFocused(): string;
  /** Number of open popups (portalled `*-popup` slots), or of `<family>-popup` ones only. */
  popups(family?: string): number;
  /** Union of the example (or the element with `id`) and every open popup, padded, in page px. */
  crop(id?: string): Rect;
  /** First enabled item in an open popup, marked; empty string when there is none. */
  markPopupItem(): string;
}
