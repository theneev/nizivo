import Link from 'next/link';

const pages = [
  ['/button-only', '(a) server-only: Button from the @nizivo/react barrel'],
  ['/button-subpath', '(a) server-only: Button from @nizivo/react/button'],
  ['/namespace', '(b) Select, Dialog and Tooltip through namespace imports'],
  ['/flat', '(c) the same through flat imports'],
  ['/render-prop', '(d) a server Button in client parts’ render prop'],
  ['/barrel-select', 'one client part (Select) through the barrel'],
  ['/dialog-default-open', 'a Dialog open on the server (defaultOpen)'],
  ['/tooltip-default-open', 'a Tooltip open on the server (defaultOpen)'],
  ['/select-groups', 'Select groups, group labels and a separator'],
  ['/select-composed', 'a server Button as the Select trigger, size="lg"'],
  ['/t0', 'server-only: every T0 component through its subpath'],
  ['/t0-barrel', 'server-only: every T0 component through the @nizivo/react barrel'],
  ['/alert-dismiss', 'a dismissible Alert: the dismiss button is the only client leaf'],
  ['/forms', 'a server Field around every client control; submits natively before hydration'],
  ['/native-select', 'server-only: NativeSelect with no Field'],
  ['/field-zero-js', 'a Field with a function child around a NativeSelect'],
  ['/icon-button', 'IconButton with tooltip={false}'],
  ['/icon-button-tooltip', 'IconButton with its default tooltip and a shortcut'],
  ['/menu', 'a Menu open on the server (defaultOpen), a server Button as its trigger'],
  ['/tabs', 'Tabs: the selected panel in the server HTML'],
  ['/tab-nav', 'TabNav with next/link through render: no @nizivo client module'],
  ['/icons-server', 'server-only: three icons from the @nizivo/icons barrel'],
  ['/icons-client', 'three icons from the @nizivo/icons barrel in a client component'],
];

export default function Home() {
  return (
    <main>
      <h1>Nizivo Next fixture</h1>
      <ul>
        {pages.map(([href, label]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
