'use client';
// Filters the Icons page's server-rendered grid in place: no icon data is sent to the browser, only
// this box. A tile matches when its Lucide name (data-icon) or its export name (its text) contains
// what was typed.
import { useId, useState, type JSX } from 'react';

export function IconSearch({ grid, total }: { grid: string; total: number }): JSX.Element {
  const id = useId();
  const [shown, setShown] = useState(total);
  const filter = (value: string): void => {
    const q = value.trim().toLowerCase().replaceAll(/\s+/g, '-');
    const flat = q.replaceAll('-', '');
    let n = 0;
    for (const tile of document.querySelectorAll<HTMLElement>(`#${grid} > [data-icon]`)) {
      const match =
        q === '' ||
        (tile.dataset.icon ?? '').includes(q) ||
        (tile.textContent ?? '').toLowerCase().includes(flat);
      tile.hidden = !match;
      if (match) n++;
    }
    setShown(n);
  };
  return (
    <div className="not-prose my-4 flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Search icons
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => filter(e.currentTarget.value)}
        className="w-full max-w-sm rounded-md border bg-fd-background px-3 py-2 text-sm"
      />
      <output htmlFor={id} className="text-sm text-fd-muted-foreground">
        {shown === total
          ? `${total.toLocaleString('en-US')} icons`
          : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} icons`}
      </output>
    </div>
  );
}
