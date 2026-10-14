// NO directive. The shortcut syntax Kbd draws and IconButton announces: `"mod+shift+d"`.

/**
 * `"mod+shift+d"` → `["mod", "shift", "d"]`. The plus key is `plus`, or a `+` where a key is due:
 * `"mod++"` and `"mod+plus"` are both ⌘ and +.
 */
export function splitKeys(keys: string): string[] {
  const parts = keys.split('+').map((part) => part.trim());
  const out: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? '';
    if (part !== '') out.push(part);
    else if (parts[index + 1] === '') {
      out.push('+');
      index += 1;
    }
  }
  return out;
}

/** Key name → its `aria-keyshortcuts` name (WAI-ARIA 1.2, UI Events `key` values). */
const ARIA: Record<string, string> = {
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  ctrl: 'Control',
  control: 'Control',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  return: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  space: 'Space',
  plus: 'Plus',
  '+': 'Plus',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

/** One key's `aria-keyshortcuts` name; `mod` is the platform's command key, given by the caller. */
function ariaName(key: string, mod: string): string {
  const lower = key.toLowerCase();
  if (lower === 'mod') return mod;
  return ARIA[lower] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/**
 * `"mod+b"` → `"Meta+B Control+B"`. The server does not know the platform, so `mod` lists both
 * alternatives (space-separated, as the attribute allows); one letter is uppercased.
 */
export function ariaKeyShortcuts(keys: string): string | undefined {
  const parts = splitKeys(keys);
  if (parts.length === 0) return undefined;
  const apple = parts.map((key) => ariaName(key, 'Meta')).join('+');
  const other = parts.map((key) => ariaName(key, 'Control')).join('+');
  return apple === other ? apple : `${apple} ${other}`;
}
