// v0.2 (week 12, M41): CountUp, @nizivo/react's one client dashboard part, alone on a server page.
// The server HTML holds the final value; the page must ship CountUp's own client module and no
// other @nizivo client module (week 12 review R2-6).
import { Heading } from '@nizivo/react/heading';
import { CountUp } from '@nizivo/react/motion';

export default function Page() {
  return (
    <main>
      <Heading level={1}>CountUp</Heading>
      <p>
        Total sales:{' '}
        <CountUp
          value={48290}
          format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
        />
      </p>
    </main>
  );
}
