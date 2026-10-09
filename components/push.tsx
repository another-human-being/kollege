'use client';
// Einstellungen → Benachrichtigungen: push notifications on this device on or off, a test, and the
// list of one's devices. The browser asks for permission; Kollege only stores the subscription.
import { useEffect, useState } from 'react';
import { pushAn, pushAus, pushProbe } from '@/app/push';
import { Aktion } from '@/components/kg';

type Zustand = 'pruefen' | 'nicht-moeglich' | 'iphone' | 'blockiert' | 'aus' | 'an';

const b64 = (s: string) => {
  const p = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
};

/** "Chrome auf Mac" – so the person recognises the device in the list */
function geraetName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Gerät';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${br} auf ${os}`;
}

export function PushGeraet({ schluessel }: { schluessel: string }) {
  const [zustand, setZustand] = useState<Zustand>('pruefen');
  const [meldung, setMeldung] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setZustand(ios ? 'iphone' : 'nicht-moeglich'); return; }
      if (Notification.permission === 'denied') { setZustand('blockiert'); return; }
      const reg = await navigator.serviceWorker.getRegistration('/');
      setZustand((await reg?.pushManager.getSubscription()) ? 'an' : 'aus');
    })().catch(() => setZustand('nicht-moeglich'));
  }, []);

  async function einschalten() {
    setBusy(true); setMeldung(null);
    try {
      if ((await Notification.requestPermission()) !== 'granted') { setZustand('blockiert'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(schluessel) });
      const r = await pushAn(abo.toJSON(), geraetName());
      if (!r.ok) { await abo.unsubscribe(); setMeldung(r.error); return; }
      setZustand('an');
    } catch {
      setMeldung('Der Browser hat die Anmeldung abgelehnt.');
    } finally { setBusy(false); }
  }

  async function ausschalten() {
    setBusy(true); setMeldung(null);
    try {
      const abo = await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
      if (abo) { await pushAus(abo.endpoint); await abo.unsubscribe(); }
      setZustand('aus');
    } finally { setBusy(false); }
  }

  const text: Record<Zustand, string> = {
    pruefen: 'Wird geprüft …',
    'nicht-moeglich': 'Dieser Browser kann keine Benachrichtigungen empfangen.',
    iphone: 'Auf iPhone und iPad zuerst Kollege zum Home-Bildschirm hinzufügen (Teilen → „Zum Home-Bildschirm“), dann Kollege von dort öffnen und hier einschalten.',
    blockiert: 'Der Browser blockiert Benachrichtigungen für Kollege. Erlauben lässt es sich in den Website-Einstellungen des Browsers.',
    aus: 'Aus auf diesem Gerät.',
    an: 'An auf diesem Gerät.',
  };
  return (
    <div className="gz">
      <span className="mono">Dieses Gerät</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div role="status">{text[zustand]}</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {zustand === 'aus' ? <Aktion variante="primaer" disabled={busy} onClick={einschalten}>Einschalten</Aktion> : null}
          {zustand === 'an' ? <Aktion disabled={busy} onClick={ausschalten}>Ausschalten</Aktion> : null}
          {zustand === 'an' ? <Aktion variante="text" disabled={busy} onClick={async () => { setBusy(true); const r = await pushProbe(); setMeldung(r.text); setBusy(false); }}>Probe senden</Aktion> : null}
        </div>
        {meldung ? <div className="mono" role="status">{meldung}</div> : null}
      </div>
    </div>
  );
}
