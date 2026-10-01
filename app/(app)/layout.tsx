import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { RueckgaengigProvider } from '@/components/rueckgaengig';
import { SeitenNav } from '@/components/seitennav';
import { navigation } from '@/lib/views/nav';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/anmelden');
  const nav = await navigation(session.user.id);

  async function abmelden() {
    'use server';
    await signOut({ redirectTo: '/anmelden' });
  }

  return (
    <RueckgaengigProvider>
      <div className="app">
        <aside className="seite">
          <div className="seite-marke">Kollege</div>
          <SeitenNav areas={nav.areas} />
          <div className="seite-fuss">
            <span>{nav.me} · Gründungszentrum</span>
            <form action={abmelden}>
              <button type="submit" className="kg-aktion kg-aktion--text">Abmelden</button>
            </form>
          </div>
        </aside>
        <div className="inhalt">{children}</div>
      </div>
    </RueckgaengigProvider>
  );
}
