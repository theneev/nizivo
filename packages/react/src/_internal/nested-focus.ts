// NO directive: DOM handlers for a visible <label> around a hidden native radio or checkbox (Chip,
// ChoiceCard), the components whose focusTarget is "nested-input" (gen/COMPONENT-JSON.md). Only
// client leaves attach them; nothing here runs during render. SegmentedControl keeps its own copy.

/**
 * True while an input's keydown is being handled. An arrow key moves focus to the next radio as the
 * keydown's default action, in the same task, so a focus seen while this is set came from a key.
 */
let keyDown = false;

export function markKeyDown(): void {
  keyDown = true;
  setTimeout(() => {
    keyDown = false;
  }, 0);
}

/**
 * WebKit does not match :focus-visible on a radio reached with an arrow key, so the label marks a
 * keyboard focus itself (nz.base draws the outline for `[data-focus-visible]`). Written on the DOM,
 * not through state: re-rendering a focused radio makes React re-write its `name`, and Chromium then
 * stops treating an unchecked group as one Tab stop.
 */
export function markFocus(event: { currentTarget: HTMLInputElement }): void {
  const visible = event.currentTarget.matches(':focus-visible') || keyDown;
  event.currentTarget.parentElement?.toggleAttribute('data-focus-visible', visible);
}

export function clearFocus(event: { currentTarget: HTMLInputElement }): void {
  event.currentTarget.parentElement?.removeAttribute('data-focus-visible');
}

/** Drops `undefined` values, so a spread never writes an empty attribute or handler. */
export function definedProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) if (value !== undefined) out[key] = value;
  return out;
}
