'use client';
// Dateien: copy the path of a file – to open it from Explorer/Finder (the browser cannot open SMB).
import { useState } from 'react';

export function PfadKopieren({ pfad }: { pfad: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="kg-aktion kg-aktion--sekundaer" onClick={() => {
      void navigator.clipboard?.writeText(pfad).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); });
    }}>{ok ? 'Pfad kopiert' : 'Pfad kopieren'}</button>
  );
}
