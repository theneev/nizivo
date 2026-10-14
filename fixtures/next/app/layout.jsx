// Component CSS through the exports map. No tokens.css yet: @nizivo/tokens emits it in week 2.
import '@nizivo/react/css/button.css';
import '@nizivo/react/css/dialog.css';
import '@nizivo/react/css/select.css';
import '@nizivo/react/css/tooltip.css';

export const metadata = { title: 'Nizivo Next fixture' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
