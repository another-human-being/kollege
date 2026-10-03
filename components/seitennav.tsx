'use client';
// Sidebar navigation as slash paths in groups (E12, E40). Only what is built appears –
// no dead links (decision 17). No counters (M2).
import { usePathname } from 'next/navigation';

export function SeitenNav({ areas }: { areas: { key: string; name_plural: string }[] }) {
  const path = usePathname();
  const link = (href: string, label: string) => (
    <a key={href} href={href} aria-current={path === href || path.startsWith(`${href}/`) ? 'page' : undefined}>
      <span className="kg-nav-slash" aria-hidden="true">/</span>
      {label.toLowerCase()}
    </a>
  );
  return (
    <nav className="kg-seitennav" aria-label="Hauptnavigation">
      {link('/heute', 'heute')}
      {link('/chat', 'chat')}
      <span className="nav-gruppe">Werkzeuge</span>
      {link('/mail', 'mail')}
      {link('/kalender', 'kalender')}
      {link('/aufgaben', 'aufgaben')}
      {link('/kontakte', 'kontakte')}
      <span className="nav-gruppe">Bereiche</span>
      {areas.map((a) => link(`/b/${a.key}`, a.name_plural))}
      <span className="nav-gruppe" aria-hidden="true" />
      {link('/einstellungen', 'einstellungen')}
    </nav>
  );
}
