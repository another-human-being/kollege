// Sign in. Development: pick a team member (no mail). The magic link follows with
// sending mail (decision 11) – until then production has no way in, on purpose.
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { withSystem } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export default async function Anmelden() {
  if ((await auth())?.user?.id) redirect('/heute');
  const dev = process.env.NODE_ENV === 'development';
  const team = dev ? await withSystem((tx) => tx.select({ name: users.name, email: users.email }).from(users).orderBy(users.name)) : [];

  async function als(formData: FormData) {
    'use server';
    await signIn('dev', { email: formData.get('email'), redirectTo: '/heute' });
  }

  return (
    <main className="anmelden">
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 500 }}>Kollege</h1>
      {dev ? (
        <>
          <p className="mono">Entwicklung: ohne Mail anmelden als …</p>
          <div className="kg-aktionen">
            {team.map((u) => (
              <form key={u.email} action={als}>
                <input type="hidden" name="email" value={u.email} />
                <button type="submit" className="kg-aktion kg-aktion--sekundaer">{u.name}</button>
              </form>
            ))}
          </div>
        </>
      ) : (
        <p>Die Anmeldung per Link in der Mail kommt, sobald der Mailversand eingerichtet ist.</p>
      )}
    </main>
  );
}
