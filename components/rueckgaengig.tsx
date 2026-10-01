'use client';
// "Speichern ohne Knopf, Rückgängig überall" (E24): every change shows
// "Gespeichert · Rückgängig" for 9 s; after undo "Rückgängig gemacht · Wiederholen" for 10 s.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { perform, undo, type Result } from '@/app/actions';

type Toast =
  | { kind: 'done'; text: string; actionId: string; redo: () => Promise<Result> }
  | { kind: 'undone'; text: string; redo: () => Promise<Result> }
  | { kind: 'error'; text: string };

interface Ctx {
  /** run an action; `text` is what the toast says on success */
  run(type: string, payload: unknown, text?: string): Promise<Result>;
  /** show the toast for a result produced elsewhere (e.g. answering a hint) */
  show(result: Result, text: string, redo: () => Promise<Result>): void;
}

const RueckgaengigCtx = createContext<Ctx | null>(null);

export function useAktion(): Ctx {
  const c = useContext(RueckgaengigCtx);
  if (!c) throw new Error('useAktion outside RueckgaengigProvider');
  return c;
}

export function RueckgaengigProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zeige = useCallback((t: Toast, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const show = useCallback(
    (r: Result, text: string, redo: () => Promise<Result>) => {
      if (r.ok) zeige({ kind: 'done', text, actionId: r.actionId, redo }, 9000);
      else zeige({ kind: 'error', text: r.error }, 9000);
    },
    [zeige],
  );

  const run = useCallback(
    async (type: string, payload: unknown, text = 'Gespeichert') => {
      const redo = () => perform(type, payload);
      const r = await redo();
      show(r, text, redo);
      return r;
    },
    [show],
  );

  async function zurueck(t: Extract<Toast, { kind: 'done' }>) {
    const r = await undo(t.actionId);
    if (r.ok) zeige({ kind: 'undone', text: 'Rückgängig gemacht', redo: t.redo }, 10000);
    else zeige({ kind: 'error', text: r.error }, 9000);
  }

  async function wiederholen(t: Extract<Toast, { kind: 'undone' }>) {
    const r = await t.redo();
    show(r, 'Wiederholt', t.redo);
  }

  return (
    <RueckgaengigCtx.Provider value={{ run, show }}>
      {children}
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.kind === 'error' ? toast.text : `✓ ${toast.text}`}</span>
          {toast.kind === 'done' ? <button type="button" onClick={() => zurueck(toast)}>↶ Rückgängig</button> : null}
          {toast.kind === 'undone' ? <button type="button" onClick={() => wiederholen(toast)}>Wiederholen</button> : null}
          <button type="button" onClick={() => setToast(null)} aria-label="Hinweis schließen" style={{ textDecoration: 'none', opacity: 0.7 }}>×</button>
        </div>
      ) : null}
    </RueckgaengigCtx.Provider>
  );
}
