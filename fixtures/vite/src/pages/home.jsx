const PAGES = [
  ['/button-only', 'Button from the @nizivo/react barrel'],
  ['/button-subpath', 'Button from @nizivo/react/button'],
  ['/t0-barrel', 'every server-safe (T0) component through the barrel'],
  ['/alert-dismiss', 'a dismissible Alert'],
  ['/overlays', 'Select, Dialog and Tooltip through namespace imports'],
  ['/barrel-select', 'Select alone through the barrel'],
  ['/forms', 'a Field around every control; the form submits natively'],
  ['/menu', 'a Menu open on first render (defaultOpen)'],
  ['/tabs', 'Tabs'],
  ['/tab-nav', 'TabNav with plain links'],
  ['/icons', 'three icons from the @nizivo/icons barrel'],
];

export default function Home() {
  return (
    <main>
      <h1>Nizivo Vite fixture</h1>
      <ul>
        {PAGES.map(([href, label]) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
