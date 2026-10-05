import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { MobilKopf } from '@/components/menue';
import { RueckgaengigProvider } from '@/components/rueckgaengig';
import { Seitenleiste } from '@/components/seitenleiste';
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
        <MobilKopf />
        {/* E51/E55: no chat history in the sidebar – earlier chats live on the chat page (E40, E62) */}
        <Suspense><Seitenleiste areas={nav.areas} me={nav.me} abmelden={abmelden} /></Suspense>
        <div className="inhalt">{children}</div>
      </div>
    </RueckgaengigProvider>
  );
}
