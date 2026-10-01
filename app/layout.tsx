import type { ReactNode } from 'react';
// fonts are served by the app itself, not by Google (decision 12)
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-serif/400-italic.css';
import '@/design/design-system/tokens.css';
import '@/design/design-system/components/bundle.css';
import '@/components/app.css';

export const metadata = { title: 'Kollege' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="kg">{children}</body>
    </html>
  );
}
