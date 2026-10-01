import type * as React from 'react';

export type Herkunft = 'belegt' | 'berechnet' | 'einschaetzung';
export type VorgangsArt = 'beratung' | 'event' | 'beitrag' | 'lehre' | 'sonstiges';

export interface NavigationProps { marke?: string; eintraege: { label: string; href?: string; aktiv?: boolean; anzahl?: number; onClick?: () => void }[]; rechts?: React.ReactNode }
export declare function Navigation(props: NavigationProps): React.ReactElement;

export interface AbschnittProps { titel: string; anzahl?: number; aside?: React.ReactNode; leer?: React.ReactNode; children?: React.ReactNode }
export declare function Abschnitt(props: AbschnittProps): React.ReactElement;

export interface EingabeProps { id?: string; wert?: string; kontext?: React.ReactNode; leeren?: boolean; platzhalter?: string; zustand?: 'leer' | 'bereit' | 'verarbeitet'; hilfe?: string; knopf?: string; ladetext?: string; onSenden?: (text: string) => void }
export declare function Eingabe(props: EingabeProps): React.ReactElement;

export interface AussageProps { art: Herkunft; quelle?: string; quelleHref?: string; onQuelle?: () => void; marke?: boolean; dringend?: boolean; inline?: boolean; children: React.ReactNode }
export declare function Aussage(props: AussageProps): React.ReactElement;

export interface QuelleProps { href?: string; onClick?: () => void; title?: string; children: React.ReactNode }
export declare function Quelle(props: QuelleProps): React.ReactElement;

export interface BezugProps { art?: 'Person' | 'Team' | 'Vorgang'; href?: string; onClick?: () => void; children: React.ReactNode }
export declare function Bezug(props: BezugProps): React.ReactElement;

export interface EtikettProps { art?: VorgangsArt; children?: React.ReactNode }
export declare function Etikett(props: EtikettProps): React.ReactElement;

export interface AktionProps { variante?: 'primaer' | 'sekundaer' | 'text' | 'rueckgaengig'; onClick?: () => void; disabled?: boolean; children?: React.ReactNode }
export declare function Aktion(props: AktionProps): React.ReactElement;

export interface UmschalterProps { optionen?: string[]; wert?: string; label?: string; onWechsel?: (wert: string) => void }
export declare function Umschalter(props: UmschalterProps): React.ReactElement;

export interface Grund { art: Herkunft; text: React.ReactNode; quelle?: string; dringend?: boolean }
export interface HinweisProps { zeit: string; titel: React.ReactNode; kontext?: React.ReactNode; gruende: Grund[]; frage?: React.ReactNode; aktionen?: React.ReactNode; dringend?: boolean; children?: React.ReactNode }
export declare function Hinweis(props: HinweisProps): React.ReactElement;

export interface EntwurfProps { kanal?: 'Mail' | 'Einladung' | 'Beitrag'; an: string; von?: string; hinweis?: string | false; betreff?: string; auszug?: string; grund?: React.ReactNode; sendenText?: string; gesperrt?: boolean; gesperrtText?: string; onAnsehen?: () => void; onSenden?: () => void }
export declare function Entwurf(props: EntwurfProps): React.ReactElement;

export interface QuittungPunkt { text: React.ReactNode; rueckgaengig?: boolean; onRueckgaengig?: () => void }
export interface QuittungProps { zeit?: string; verstanden?: QuittungPunkt[]; erledigt?: QuittungPunkt[]; vorschlag?: React.ReactNode; fuss?: React.ReactNode; onAllesRueckgaengig?: () => void; onFalsch?: () => void }
export declare function Quittung(props: QuittungProps): React.ReactElement;

export interface VerlaufEintrag { monat?: string; datum: string; art: 'Mail' | 'Termin' | 'Notiz' | 'Datei' | 'System'; text: React.ReactNode; quelle?: string; herkunft?: string; privat?: boolean; privatFuer?: string; rueckgaengig?: boolean; onRueckgaengig?: () => void }
export interface VerlaufProps { eintraege: VerlaufEintrag[]; label?: string }
export declare function Verlauf(props: VerlaufProps): React.ReactElement;

export interface ZusageProps { status?: 'offen' | 'ueberfaellig' | 'erledigt'; faellig?: string; quelle?: string; children: React.ReactNode }
export declare function Zusage(props: ZusageProps): React.ReactElement;

export interface KlaerungProps { frage: React.ReactNode; grund?: React.ReactNode; quelle?: string; antworten?: string[]; antwort?: string; bestaetigt?: (antwort: string) => string; onAntwort?: (antwort: string) => void; onRueckgaengig?: (alteAntwort: string) => void }
export declare function Klaerung(props: KlaerungProps): React.ReactElement;

export interface AnweisungProps { geltung: 'team' | 'persoenlich'; von?: string; datum?: string; onLoeschen?: () => void; angewandt?: string; onBearbeiten?: () => void; children: React.ReactNode }
export declare function Anweisung(props: AnweisungProps): React.ReactElement;

export interface LeerProps { titel: string; text?: string; aktion?: React.ReactNode }
export declare function Leer(props: LeerProps): React.ReactElement;

export interface LadenProps { text?: string; wert?: number; max?: number; inline?: boolean }
export declare function Laden(props: LadenProps): React.ReactElement;

export interface NachrichtProps { von: 'du' | 'kollege'; zeit?: string; streamt?: boolean; children?: React.ReactNode }
export declare function Nachricht(props: NachrichtProps): React.ReactElement;

export interface KarteProps { art?: 'quittung' | 'anweisung'; titel?: string; geltung?: 'team' | 'persoenlich'; privat?: boolean; zeit?: string; punkte?: React.ReactNode[]; anweisung?: string; linkText?: string; linkHref?: string; onLink?: () => void; folgen?: string; zurueck?: boolean; onRueckgaengig?: () => void; onWiederholen?: () => void }
export declare function Karte(props: KarteProps): React.ReactElement;

export interface WissenslueckeProps { titel?: string; bekannt?: React.ReactNode; aktionen?: React.ReactNode }
export declare function Wissensluecke(props: WissenslueckeProps): React.ReactElement;

export interface ChatEintrag { id: string; titel: string; datum: string; etikett?: string; angepinnt?: boolean; aktiv?: boolean; href?: string }
export interface ChatListeProps { chats: ChatEintrag[]; onNeu?: () => void; neuHref?: string; onOeffnen?: (id: string) => void; onPin?: (id: string) => void; onLoeschen?: (id: string) => void }
export declare function ChatListe(props: ChatListeProps): React.ReactElement;

export interface PrivatProps { nurSymbol?: boolean; fuer?: string; children?: React.ReactNode }
export declare function Privat(props: PrivatProps): React.ReactElement;

export interface VermutungProps { children?: React.ReactNode }
export declare function Vermutung(props: VermutungProps): React.ReactElement;

declare global { interface Window { Kollege: { Navigation: typeof Navigation; Abschnitt: typeof Abschnitt; Eingabe: typeof Eingabe; Aussage: typeof Aussage; Quelle: typeof Quelle; Bezug: typeof Bezug; Etikett: typeof Etikett; Aktion: typeof Aktion; Umschalter: typeof Umschalter; Hinweis: typeof Hinweis; Entwurf: typeof Entwurf; Quittung: typeof Quittung; Verlauf: typeof Verlauf; Zusage: typeof Zusage; Klaerung: typeof Klaerung; Anweisung: typeof Anweisung; Leer: typeof Leer; Laden: typeof Laden; Nachricht: typeof Nachricht; Karte: typeof Karte; Wissensluecke: typeof Wissensluecke; ChatListe: typeof ChatListe; Privat: typeof Privat; Vermutung: typeof Vermutung } } }
