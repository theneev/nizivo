import Link from 'next/link';

const pages = [
  ['/button-only', '(a) server-only: Button from the @nizivo/react barrel'],
  ['/button-subpath', '(a) server-only: Button from @nizivo/react/button'],
  ['/namespace', '(b) Select, Dialog and Tooltip through namespace imports'],
  ['/flat', '(c) the same through flat imports'],
  ['/render-prop', '(d) a server Button in client parts’ render prop'],
  ['/barrel-select', 'one client part (Select) through the barrel'],
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
