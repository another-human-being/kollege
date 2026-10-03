'use client';
// Phone (design "Mobil"): the sidebar sits behind a menu button in a slim top bar.
import { useState } from 'react';

export function MobilKopf() {
  const [offen, setOffen] = useState(false);
  return (
    <div className="mobil-kopf">
      <span className="seite-marke">Kollege</span>
      <button type="button" className="kg-aktion kg-aktion--text" aria-expanded={offen} aria-controls="seitenleiste"
        onClick={() => { setOffen(!offen); document.querySelector('.app')?.toggleAttribute('data-menue', !offen); }}>
        {offen ? 'Schließen' : 'Menü'}
      </button>
    </div>
  );
}
