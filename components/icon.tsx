// Line icons (E54): 16 px, stroke 1.6, colour of the text, own simple geometry – the set of the
// design system (bundle.js) and of the prototype's navigation (prototyp/build.py). Never alone:
// always with a word, or as a button with aria-label and tooltip.
const PFADE = {
  // design system (Icon, Schritte)
  hoch: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  lesen: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  suche: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  gefunden: '<path d="M5 12l4 4 10-10"/>',
  luecke: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/>',
  // navigation
  heute: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  aufgaben: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
  dateien: '<path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
  kontakte: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.4.6 2.4 1.9 2.9 4.2"/>',
  founding_teams: '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  events: '<path d="M4 9a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V6H4z"/><path d="M14 7v12" stroke-dasharray="2 2"/>',
  teaching: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2v-4.5"/>',
  social: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/>',
  einstellungen: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  neu: '<path d="M12 20h8"/><path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  leiste: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/>',
  pfeil: '<path d="M9 6l6 6-6 6"/>',
  runter: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bereich: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  // Heute (E56): kinds of rows
  senden: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
  hand: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0v6.5c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 13.5"/>',
  frage: '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.5a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.7M12 16.5h.01"/>',
  sanduhr: '<path d="M7 4h10M7 20h10M8 4c0 4 8 4 8 8s-8 4-8 8M16 4c0 4-8 4-8 8s8 4 8 8"/>',
  rat: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
} as const;

export type IconName = keyof typeof PFADE;

/** an area without its own icon gets the neutral square */
export const bereichIcon = (key: string): IconName => (key in PFADE ? (key as IconName) : 'bereich');

export function Icon({ name, className = 'kg-ic' }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: PFADE[name] }} />;
}
