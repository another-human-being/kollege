class Component extends DCLogic {
  constructor(props) {
    super(props);
    var B = this.bereich();
    this.state = Object.assign(this.basisState(), this.kcState(), { suche: '', filter: B.startFilter, sel: B.startSel, wieLief: {}, wieLiefText: '', gespraechText: '', themaText: '', notizZeit: '' });
  }
  bkey() { return '@@BEREICH@@'; }
  // ——— Bereiche: Spalten (max. 5), Phasen, Knöpfe ———
  konfig() {
    return {
      gruendungsteams: { titel: 'Gründungsteams', einzahl: 'Gründungsteam', href: 'Gruendungsteams.dc.html', akte: true,
        spalten: [{ k: 'titel', l: 'Team', w: '1.2fr' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '92px' }, { k: 'wer', l: 'betreut von', typ: 'person', w: '80px' }, { k: 'letzter', l: 'letzter Kontakt', typ: 'berechnet', w: '96px' }, { k: 'naechster', l: 'nächster Schritt', typ: 'lang', w: '1.4fr' }],
        phasen: ['Idee', 'Vorgründung', 'gegründet'], endPhase: 'gegründet', neuLabel: 'Neues Team', ungeprueft: 52, startFilter: 'alle', startSel: 'gt-solaro', extraFilter: 'hängt' },
      events: { titel: 'Events', einzahl: 'Event', href: 'Events.dc.html',
        spalten: [{ k: 'titel', l: 'Event', w: '1.4fr' }, { k: 'datum', l: 'Datum', typ: 'text', w: '96px' }, { k: 'wer', l: 'zuständig', typ: 'person', w: '80px' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '110px' }],
        phasen: ['Planung', 'Einladung raus', 'vorbei'], endPhase: 'vorbei', neuLabel: 'Neues Event', vorlageLabel: 'Aus Vorjahr', ungeprueft: 31, startFilter: 'alle', startSel: 'ev-gn' },
      lehre: { titel: 'Lehre', einzahl: 'Veranstaltung', href: 'Lehre.dc.html',
        spalten: [{ k: 'titel', l: 'Veranstaltung', w: '1.5fr' }, { k: 'semester', l: 'Semester', typ: 'semester', w: '80px' }, { k: 'sitzung', l: 'nächste Sitzung', typ: 'text', w: '130px' }],
        extraFelder: [{ k: 'wer', l: 'zuständig', typ: 'person' }],
        phasen: [], filterWerte: ['WS 26/27', 'SS 26'], filterFeld: 'semester', neuLabel: 'Neue Veranstaltung', vorlageLabel: 'Aus letztem Semester', ungeprueft: 14, startFilter: 'WS 26/27', startSel: 'le-eb' },
      socialmedia: { titel: 'Social Media', einzahl: 'Beitrag', href: 'SocialMedia.dc.html',
        spalten: [{ k: 'titel', l: 'Beitrag', w: '1.4fr' }, { k: 'geplant', l: 'geplant für', typ: 'text', w: '104px' }, { k: 'kanal', l: 'Kanal', typ: 'kanal', w: '96px' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '92px' }],
        extraFelder: [{ k: 'wer', l: 'zuständig', typ: 'person' }],
        phasen: ['Entwurf', 'geplant', 'veröffentlicht'], endPhase: 'veröffentlicht', neuLabel: 'Neuer Beitrag', ungeprueft: 21, startFilter: 'alle', startSel: 'sm-ig' }
    };
  }
  bereich() { return this.konfig()[this.bkey()]; }
  // ——— Einträge aller Bereiche (für Bezüge über Bereiche hinweg) ———
  alle() {
    var I = [
      // Gründungsteams
      { id: 'gt-solaro', b: 'gruendungsteams', titel: 'Solaro', phase: 'Vorgründung', wer: 'Andreas', letzter: 'heute', tage: 0, naechster: 'Finales Pitchdeck abwarten (bis Fr 02.10.), dann Termin mit Frau Weber vereinbaren.',
        personen: [{ name: 'Lisa Meier', rolle: 'Gründerin · Produkt', adresse: 'lisa@solaro.de' }, { name: 'Tom Kraus', rolle: 'Gründer · Finanzen', adresse: 'tom@solaro.de' }],
        gespraeche: [{ datum: '30.09.', titel: 'Beratung', wer: 'Andreas · Lisa, Tom', punkte: ['Pitchdeck final inkl. Finanzteil bis Fr 02.10.', 'Wir vermitteln Kontakt zu Frau Weber (IHK)'] }, { datum: '22.09.', titel: 'Beratung', wer: 'Andreas · Lisa, Tom', punkte: ['EXIST-Voraussetzungen durchgesprochen', 'Einreichung geplant für 30.10.', 'Finanzplan bis 15.10. überarbeiten'] }, { datum: '21.08.', titel: 'Erstkontakt', wer: 'StartHub-Postfach', punkte: ['Anfrage über das Kontaktformular'] }],
        themen: ['EXIST-Antrag', 'Finanzplan', 'Pitch'],
        vonUns: [{ text: 'Feedback zum Finanzplan an Tom', faellig: 'heute', quelle: 'Mail 26.09.', status: 'offen' }, { text: 'Kontakt zu Frau Weber vermitteln', faellig: 'bis Fr 02.10.', quelle: 'Chat 30.09.', status: 'offen' }, { text: 'Pitch-Slot bestätigen (Julia)', faellig: 'bis 13.11.', quelle: 'aus Julias Mail 23.09.', status: 'offen' }],
        anUns: [{ text: 'Pitchdeck final inkl. Finanzteil', faellig: 'bis Fr 02.10.', quelle: 'Chat 30.09.', status: 'offen' }, { text: 'Finanzplan überarbeiten', faellig: 'bis 15.10.', quelle: 'Notiz 22.09.', status: 'offen' }],
        verlauf: [['202609301432', 'Notiz', 'Beratung: Pitchdeck final bis Freitag; wir vermitteln Frau Weber.', 'Chat 14:32'], ['202609291740', 'Mail', 'Lisa Meier: Pitchdeck-Entwurf (ohne Finanzteil)', 'Mail', 'Eingang'], ['202609261000', 'Mail', 'Tom Kraus: Finanzplan v2 mit Bitte um Feedback', 'Mail', 'Eingang'], ['202609241750', 'Notiz', 'Tom wirkt unter Druck wegen der Finanzierung', 'Chat', '', true], ['202609241400', 'Mail', 'EXIST-Merkblatt an Lisa geschickt', 'Mail', 'aus Outlook'], ['202609231100', 'Mail', 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', '', '', true], ['202609221000', 'Termin', 'Beratung mit Lisa Meier und Tom Kraus, 60 Min.', 'Kalender'], ['202608211000', 'Mail', 'Erstkontakt über das Kontaktformular', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-kl', b: 'gruendungsteams', titel: 'Kitchen Loop', phase: 'Vorgründung', ki: { phase: true }, wer: 'Julia', letzter: 'vor 2 T.', tage: 2, naechster: 'Hygieneschulung klären, Pilotstart mit dem Studierendenwerk abstimmen.',
        personen: [{ name: 'Sara Yilmaz', rolle: 'Gründerin', adresse: 'sara@kitchenloop.de' }, { name: 'Ben Hofer', rolle: 'Gründer', adresse: 'ben@kitchenloop.de' }],
        gespraeche: [{ datum: '23.09.', titel: 'Förderberatung', wer: 'Mehmet · Ben', punkte: ['Gründerstipendium Bayern passt eher als EXIST'] }, { datum: '14.09.', titel: 'Beratung Mensa-Konzept', wer: 'Julia · Sara, Ben', punkte: ['Pilot mit 200 Boxen pro Woche', 'Julia klärt Hygieneschulung mit dem Studierendenwerk'] }],
        themen: ['Mensa-Pilot', 'Förderung'],
        vonUns: [{ text: 'Hygieneschulung klären (Julia)', faellig: 'Do 01.10.', quelle: 'Mail 24.09.', status: 'offen' }], anUns: [{ text: 'Studierendenwerk: Termin für Pilotstart', faellig: 'Fr 02.10.', quelle: 'Notiz 23.09.', status: 'offen' }],
        verlauf: [['202609281520', 'Mail', 'Sara Yilmaz: Hygieneschulung – Termin?', 'Mail', 'Eingang'], ['202609231000', 'Termin', 'Förderberatung mit Ben Hofer', 'Kalender'], ['202609141000', 'Termin', 'Beratung Mensa-Konzept', 'Kalender']] },
      { id: 'gt-nord', b: 'gruendungsteams', titel: 'Nordlicht Analytics', phase: 'Idee', ki: { phase: true }, wer: 'Andreas', letzter: 'vor 23 T.', tage: 23, naechster: 'Folgetermin vereinbaren – Mentoring mit Dr. Albrecht ist angefragt (Fr 02.10.).',
        personen: [{ name: 'Jonas Berg', rolle: 'Gründer', adresse: 'jonas@nordlicht-analytics.de' }],
        gespraeche: [{ datum: '07.09.', titel: 'Erstberatung', wer: 'Andreas · Jonas', punkte: ['Datenanalyse für Kommunen', 'Zielgruppe und Preismodell noch offen'] }], themen: ['Geschäftsmodell'],
        vonUns: [{ text: 'Folgetermin anbieten', faellig: 'Do 01.10.', quelle: 'Anweisung Mehmet', status: 'offen' }], anUns: [],
        verlauf: [['202609071000', 'Termin', 'Erstberatung mit Jonas Berg', 'Kalender'], ['202609050900', 'Mail', 'Jonas Berg: Onepager', 'Mail', 'Eingang']] },
      { id: 'gt-green', b: 'gruendungsteams', ungeprueft: true, titel: 'Greenbyte', phase: 'Idee', ki: { phase: true, wer: true }, wer: 'Andreas', letzter: 'gestern', tage: 1, naechster: 'Erstberatung Do 01.10., 14:00.', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 29.09.',
        personen: [{ name: 'Nora Kim', rolle: 'Gründerin', adresse: 'nora@greenbyte.io' }], gespraeche: [], themen: [], vonUns: [], anUns: [], verlauf: [['202609291100', 'Mail', 'Nora Kim: Anfrage Erstberatung', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-max', b: 'gruendungsteams', ungeprueft: true, titel: 'Lern-App (Max Brandt)', phase: 'Idee', ki: { phase: true, wer: true }, wer: 'Andreas', letzter: 'gestern', tage: 1, naechster: 'Sprechstunde anbieten (Di 14–16 Uhr).', grund: 'Anfrage zum Gründungsstipendium', quelle: 'Mail 29.09.',
        personen: [{ name: 'Max Brandt', rolle: 'Gründer', adresse: 'max.brandt@student.uni-augsburg.de' }], gespraeche: [], themen: ['EXIST-Gründungsstipendium'], vonUns: [], anUns: [], verlauf: [['202609291612', 'Mail', 'Max Brandt: Beratung Gründungsstipendium?', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-volt', b: 'gruendungsteams', ungeprueft: true, titel: 'VoltBox', phase: 'gegründet', ki: { phase: true }, wer: 'Andreas', letzter: 'vor 200 T.', tage: 200, naechster: '–', grund: 'zwei Termine und ein Protokoll auf dem Netzlaufwerk', quelle: 'Termin 12.03.', personen: [], gespraeche: [{ datum: '12.03.', titel: 'Beratung Finanzierung', wer: 'Andreas', punkte: ['aus Protokoll übernommen'] }], themen: [], vonUns: [], anUns: [], verlauf: [['202603121000', 'Termin', 'Beratung Finanzierung', 'Kalender']] },
      { id: 'gt-lern', b: 'gruendungsteams', ungeprueft: true, titel: 'Lernwerk', phase: 'Idee', ki: { phase: true }, wer: 'Mehmet', letzter: 'vor 330 T.', tage: 330, naechster: '–', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 04.11.2025', personen: [], gespraeche: [], themen: [], vonUns: [], anUns: [], verlauf: [['202511040900', 'Mail', 'Anfrage Nachhilfe-App', 'Mail', 'StartHub-Postfach']] },
      // Events
      { id: 'ev-gn', b: 'events', titel: 'Gründungsnacht 2026', datum: 'Fr 20.11.', wer: 'Julia', phase: 'Planung', naechster: 'Einladung am 09.10. verschicken (6 Wochen vorher); Catering klären.', notiz: true,
        vonUns: [{ text: 'Save-the-Date verschicken (Andreas)', faellig: 'heute', quelle: 'Anweisung Julia', status: 'offen' }, { text: 'Catering anfragen', faellig: 'bis 16.10.', quelle: 'Ablaufplan', status: 'offen' }], anUns: [],
        verlauf: [['202609291000', 'Datei', 'Ablaufplan_Gruendungsnacht.docx geändert', 'Netzlaufwerk'], ['202609281012', 'Notiz', 'Einladung als Entwurf vorbereitet, Versand 09.10.', 'Chat']] },
      { id: 'ev-pa', b: 'events', titel: 'Pitch-Abend', datum: 'Do 12.11.', wer: 'Julia', phase: 'Planung', tage: 9, naechster: 'Jury vollständig machen – Rückmeldung von Frau Weber fehlt.',
        vonUns: [{ text: 'Jury vollständig machen', faellig: 'Fr 02.10.', quelle: 'Mail 21.09.', status: 'offen' }, { text: 'Jury-Briefing vorbereiten (Andreas)', faellig: '04.11.', quelle: 'Kalender', status: 'offen' }], anUns: [{ text: 'Anna Weber: Zusage als Jurorin', faellig: '25.09.', quelle: 'Mail 21.09.', status: 'offen' }],
        verlauf: [['202609230900', 'Mail', 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', '', '', true], ['202609211000', 'Mail', 'Juryanfrage an Anna Weber (IHK)', 'Mail', 'aus Outlook']] },
      { id: 'ev-som', b: 'events', titel: 'Sommerfest 2026', datum: '10.07.', wer: 'Mehmet', phase: 'vorbei', naechster: '–', abschluss: 'Gut besucht (ca. 120); Grillstand zu klein – nächstes Jahr zwei.', vonUns: [], anUns: [], verlauf: [['202607101800', 'Termin', 'Sommerfest im Innenhof', 'Kalender']] },
      { id: 'ev-hack', b: 'events', ungeprueft: true, titel: 'Hackathon Januar', datum: 'Jan. 2027', ki: { datum: true, wer: true }, wer: 'Julia', phase: 'Planung', naechster: 'Fachschaft antworten: Challenge und Mentoring?', grund: 'Kooperationsanfrage im StartHub-Postfach', quelle: 'Mail 28.09.', vonUns: [], anUns: [], verlauf: [['202609280914', 'Mail', 'Fachschaft Informatik: Hackathon im Januar', 'Mail', 'StartHub-Postfach']] },
      { id: 'ev-gn25', b: 'events', ungeprueft: true, titel: 'Gründungsnacht 2025', datum: '21.11.2025', wer: 'Julia', phase: 'vorbei', naechster: '–', grund: 'Ablaufplan und 14 Mails zur Organisation', quelle: 'Netzlaufwerk', vonUns: [], anUns: [], verlauf: [['202511211800', 'Termin', 'Gründungsnacht 2025', 'Kalender']] },
      // Lehre
      { id: 'le-eb', b: 'lehre', titel: 'Entrepreneurship Basics', semester: 'WS 26/27', sitzung: 'Di 06.10., 16:00', wer: 'Andreas', naechster: 'Raum mit Beamer für Sitzung 3 buchen (überfällig).', notiz: true,
        vonUns: [{ text: 'Raum für Sitzung 3 buchen', faellig: 'Di 29.09.', quelle: 'Mail 28.09.', status: 'offen' }], anUns: [{ text: 'Prof. Hartmann: Folien für Sitzung 3', faellig: '06.10.', quelle: 'Mail 28.09.', status: 'offen' }],
        verlauf: [['202609291600', 'Termin', 'Sitzung 1, Hörsaal 1004', 'Kalender'], ['202609281130', 'Mail', 'Prof. Hartmann: Raum für Sitzung 3', 'Mail', 'Eingang'], ['202609281400', 'Termin', 'Vorbesprechung mit Prof. Hartmann', 'Kalender']] },
      { id: 'le-dt', b: 'lehre', titel: 'Design Thinking Workshop', semester: 'WS 26/27', sitzung: 'Do 15.10., 14:00', wer: 'Mehmet', naechster: 'Teilnehmerliste schließen (max. 24).', vonUns: [], anUns: [], verlauf: [['202609211000', 'Notiz', 'Anmeldung geöffnet', 'Mehmet']] },
      { id: 'le-gs', b: 'lehre', titel: 'Gründungsseminar', semester: 'SS 26', sitzung: '– (beendet)', wer: 'Andreas', naechster: '–', vonUns: [], anUns: [], verlauf: [['202607151000', 'Termin', 'Abschlusspräsentationen', 'Kalender']] },
      { id: 'le-iw', b: 'lehre', ungeprueft: true, titel: 'Ideenwerkstatt', semester: 'SS 26', ki: { semester: true }, sitzung: '– (beendet)', wer: 'Mehmet', naechster: '–', grund: 'Ordner „Lehre/Ideenwerkstatt“ auf dem Netzlaufwerk', quelle: 'Netzlaufwerk', vonUns: [], anUns: [], verlauf: [['202606011000', 'Datei', 'Teilnehmerliste_Ideenwerkstatt.xlsx', 'Netzlaufwerk']] },
      // Social Media
      { id: 'sm-ig', b: 'socialmedia', titel: 'Pitch-Abend ankündigen', geplant: 'Do 01.10., 12:00', kanal: 'Instagram', phase: 'Entwurf', wer: 'Mehmet', naechster: 'Freigabe bis heute 17:00 – Text und Bild liegen bereit.', notiz: true, vonUns: [{ text: 'Freigabe (Mehmet)', faellig: 'heute 17:00', quelle: 'Notiz 29.09.', status: 'offen' }], anUns: [], verlauf: [['202609291000', 'Notiz', 'Entwurf angelegt', 'Mehmet']] },
      { id: 'sm-std', b: 'socialmedia', titel: 'Save-the-Date Gründungsnacht', geplant: 'Fr 09.10.', kanal: 'Instagram + LinkedIn', phase: 'geplant', wer: 'Mehmet', naechster: '–', vonUns: [], anUns: [], verlauf: [['202609281030', 'Notiz', 'Für 09.10. eingeplant', 'Mehmet']] },
      { id: 'sm-por', b: 'socialmedia', titel: 'Porträt: Lisa Meier (Solaro)', geplant: '15.10.', kanal: 'LinkedIn', phase: 'Entwurf', wer: 'Mehmet', naechster: 'Freigabe von Lisa einholen.', vonUns: [], anUns: [{ text: 'Lisa Meier: Freigabe des Porträts', faellig: '08.10.', quelle: 'Notiz 15.09.', status: 'offen' }], verlauf: [['202609151000', 'Notiz', 'Idee: Porträtreihe Gründerinnen', 'Mehmet']] },
      { id: 'sm-som', b: 'socialmedia', titel: 'Rückblick Sommerfest', geplant: '–', kanal: 'LinkedIn', phase: 'Entwurf', wer: 'Mehmet', tage: 25, naechster: 'Entwurf fertigstellen.', vonUns: [], anUns: [], verlauf: [['202609051000', 'Datei', 'Entwurf zuletzt geändert', 'Netzlaufwerk']] },
      { id: 'sm-rgn', b: 'socialmedia', titel: 'Rückblick Gründungsnacht 2025', geplant: '25.11.2025', kanal: 'Instagram', phase: 'veröffentlicht', wer: 'Mehmet', naechster: '–', vonUns: [], anUns: [], verlauf: [['202511251000', 'Notiz', 'Veröffentlicht', 'Instagram']] },
      { id: 'sm-hack', b: 'socialmedia', ungeprueft: true, titel: 'Aufruf Hackathon', geplant: '–', kanal: 'Instagram', ki: { kanal: true }, phase: 'Entwurf', wer: 'Mehmet', naechster: '–', grund: 'Bitte der Fachschaft um Bewerbung', quelle: 'Mail 28.09.', vonUns: [], anUns: [], verlauf: [['202609280914', 'Mail', 'Fachschaft Informatik: Hackathon im Januar', 'Mail', 'StartHub-Postfach']] }
    ];
    return this.wert('_neu', 'liste', []).concat(I);
  }
  bezuegeStart() {
    return [
      { a: 'gt-solaro', z: 'ev-pa', wie: 'pitcht' }, { a: 'gt-solaro', z: 'sm-por', wie: 'Porträt' }, { a: 'gt-solaro', z: 'le-eb', wie: 'Fallbeispiel Sitzung 3?', ki: true },
      { a: 'ev-pa', z: 'sm-ig', wie: 'Ankündigung' }, { a: 'ev-gn', z: 'sm-std', wie: 'Save-the-Date' }, { a: 'ev-som', z: 'sm-som', wie: 'Rückblick' },
      { a: 'gt-kl', z: 'ev-gn', wie: 'Catering?', ki: true }, { a: 'ev-hack', z: 'sm-hack', wie: 'Aufruf' }
    ];
  }
  vorlagen() {
    return { events: [{ id: 'v-iw', titel: 'Ideenwettbewerb 2025', neu: { titel: 'Ideenwettbewerb 2026', datum: 'Mitte Dez.', wer: 'Julia', phase: 'Planung', naechster: 'Datum festlegen, Jury aus 2025 anfragen.' } }, { id: 'v-hk', titel: 'Hackathon 2025', neu: { titel: 'Hackathon 2026', datum: 'Jan.', wer: 'Julia', phase: 'Planung', naechster: 'Mit Fachschaft abstimmen.' } }],
      lehre: [{ id: 'v-gs', titel: 'Gründungsseminar SS 26', neu: { titel: 'Gründungsseminar', semester: 'WS 26/27', sitzung: 'noch offen', wer: 'Andreas', naechster: 'Termine und Raum festlegen.' } }, { id: 'v-iw', titel: 'Ideenwerkstatt SS 26', neu: { titel: 'Ideenwerkstatt', semester: 'WS 26/27', sitzung: 'noch offen', wer: 'Mehmet', naechster: 'Termine festlegen.' } }] }[this.bkey()] || [];
  }
  aktuell() { var self = this; return this.alle().filter(function (x) { return x.id === self.state.sel && x.b === self.bkey() && self.wert(x.id, 'geprueft', '') !== 'weg'; })[0]; }
  kcCfg() { var x = this.aktuell(); return { name: x ? this.wert(x.id, 'titel', x.titel) : this.bereich().titel, anzahl: 'Gespräche, Zusagen, Verlauf', platzhalter: 'Frag oder notiere etwas dazu', antwort: 'Stand Solaro: Pitchdeck-Entwurf kam gestern ohne Finanzteil, final ist bis Freitag zugesagt. Danach vermitteln wir Frau Weber.', belege: [{ art: 'belegt', text: 'Pitchdeck-Entwurf ohne Finanzteil', quelle: 'Mail 29.09.' }], luecke: 'Dazu habe ich hier nichts Belastbares.' }; }
  renderVals() {
    var self = this, st = this.state, K = this.konfig(), B = this.bereich(), bk = this.bkey();
    var ALLE = this.alle();
    var eigene = ALLE.filter(function (x) { return x.b === bk; });
    var lebend = eigene.filter(function (x) { return self.wert(x.id, 'geprueft', '') !== 'weg' && !self.wert(x.id, 'archiv', false); });
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(eigene, B.ungeprueft, B.titel);
    var ung = function (x) { return !!x.ungeprueft && !self.wert(x.id, 'geprueft', ''); };
    var w = function (x, k) { return self.wert(x.id, k, x[k]); };
    var haengt = function (x) { return (self.wert(x.id, 'tage', x.tage) || 0) >= 21 && w(x, 'phase') !== B.endPhase && !ung(x); };
    var q = st.suche.trim().toLowerCase();
    var liste = lebend.filter(function (x) {
      if (pruef) return ung(x);
      if (ung(x)) return false;
      if (st.filter === 'hängt' && !haengt(x)) return false;
      if (B.phasen.indexOf(st.filter) >= 0 && w(x, 'phase') !== st.filter) return false;
      if (B.filterFeld && (B.filterWerte || []).indexOf(st.filter) >= 0 && w(x, B.filterFeld) !== st.filter) return false;
      return !q || (w(x, 'titel') + ' ' + (x.personen || []).map(function (p) { return p.name; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    var raster = 'grid-template-columns: ' + B.spalten.map(function (s) { return 'minmax(0, ' + s.w + ')'; }).join(' ');
    var zeilen = liste.map(function (x) {
      return { pruef: pruef, normal: !pruef, raster: raster, aktiv: x.id === st.sel ? 'true' : 'false',
        waehlenLabel: 'Auswählen: ' + w(x, 'titel'), gewaehlt: P.pruefIstGewaehlt(x.id), waehlen: P.pruefWaehle(x.id),
        los: function () { self.setState({ sel: x.id, kcOffen: false }); },
        zellen: B.spalten.map(function (s, i) {
          var t = String(w(x, s.k) || '–'), stil = '';
          if (s.k === 'letzter' && haengt(x)) { t = t + ' · hängt'; stil = 'color: var(--attention)'; }
          if (s.k === 'phase' && haengt(x) && bk !== 'gruendungsteams') { t = t + ' · hängt'; stil = 'color: var(--attention)'; }
          if (s.k === 'phase' && w(x, 'phase') === B.endPhase) stil = 'color: var(--ink-muted)';
          if (i === 0 && pruef) t = t + ' · ' + x.grund;
          return { text: t, klasse: i === 0 ? 't1' : (s.typ === 'berechnet' || s.k === 'datum' || s.k === 'geplant' || s.k === 'sitzung' ? 'tm' : ''), stil: stil };
        }) };
    });
    // ——— Detail ———
    var x = this.aktuell(), d = {};
    var TEAM = ['Andreas', 'Julia', 'Mehmet'];
    if (x) {
      var f = this.feld(x.id, x, B.einzahl);
      var felder = B.spalten.slice(1).concat(B.extraFelder || []).filter(function (s) { return s.k !== 'naechster'; }).map(function (s) {
        var kiOffen = !!(x.ki && x.ki[s.k]) && !self.wert(x.id, 'ok_' + s.k, false) && w(x, s.k) === x[s.k];
        var opt = s.typ === 'phase' ? B.phasen : s.typ === 'person' ? TEAM : s.typ === 'semester' ? ['WS 26/27', 'SS 26', 'WS 25/26'] : s.typ === 'kanal' ? ['Instagram', 'LinkedIn', 'Instagram + LinkedIn', 'Newsletter', 'Website'] : null;
        return { k: s.k, label: s.l, htmlId: 'f-' + s.k, wert: s.k === 'letzter' && haengt(x) ? w(x, s.k) + ' · hängt (seit 21 T. nichts passiert)' : String(w(x, s.k) || ''),
          stil: s.k === 'letzter' && haengt(x) ? 'color: var(--attention)' : '',
          istSelect: !!opt, istInput: !opt && s.typ !== 'berechnet', istBerechnet: s.typ === 'berechnet', optionen: opt || [],
          wahl: function (e) { var neu = e.target.value; var ch = [{ id: x.id, feld: s.k, wert: neu, basis: x[s.k] }, { id: x.id, feld: 'ok_' + s.k, wert: true, basis: false }];
            self.aendere(ch, 'Gespeichert: ' + s.l + ' → ' + neu);
            if (s.typ === 'phase' && neu === B.endPhase && bk === 'events') { var m = Object.assign({}, self.state.wieLief); m[x.id] = true; self.setState({ wieLief: m }); } },
          ki: kiOffen, bestaetigen: function () { self.aendere([{ id: x.id, feld: 'ok_' + s.k, wert: true, basis: false }], 'Bestätigt: ' + s.l + ' = ' + w(x, s.k)); } };
      });
      var bz = this.wert('_bez', 'liste', this.bezuegeStart());
      var setBz = function (neu, label) { self.aendere([{ id: '_bez', feld: 'liste', wert: neu, basis: self.bezuegeStart() }], label); };
      var meine = bz.filter(function (r) { return r.a === x.id || r.z === x.id; });
      var finde = function (id) { return ALLE.filter(function (y) { return y.id === id; })[0]; };
      var gespraeche = this.wert(x.id, 'gespraeche', x.gespraeche || []);
      var themen = this.wert(x.id, 'themen', x.themen || []);
      var vl = (x.verlauf || []).slice();
      if (this.wert(x.id, 'abschluss', x.abschluss || '')) vl.unshift(['202609301600', 'Notiz', 'Wie lief’s: ' + this.wert(x.id, 'abschluss', x.abschluss), 'Abschluss']);
      gespraeche.filter(function (g) { return g.neu; }).forEach(function (g) { vl.unshift(['202609301601', 'Notiz', 'Gespräch: ' + g.punkte[0], 'von Hand']); });
      var MON = { '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April', '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August', '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember' };
      d = {
        f: f, kopfzeile: B.einzahl + (B.akte ? ' · Beratungsakte' : ''),
        titel: w(x, 'titel'), naechster: w(x, 'naechster'), wer: w(x, 'wer'), felder: felder,
        istAkte: !!B.akte, keineAkte: !B.akte,
        andere: TEAM.filter(function (n) { return n !== w(x, 'wer'); }),
        uebergeben: function (e) { var n = e.target.value; if (!n) return; self.aendere([{ id: x.id, feld: 'wer', wert: n, basis: x.wer }, { id: x.id, feld: 'uebergeben', wert: true, basis: false }], 'Übergeben an ' + n + ' – ' + n + ' bekommt einen Kurzstand'); },
        wurdeUebergeben: !!this.wert(x.id, 'uebergeben', false),
        frageWieLief: !!st.wieLief[x.id], wieLiefText: st.wieLiefText, wieLiefTippen: function (e) { self.setState({ wieLiefText: e.target.value }); },
        wieLiefSkip: function () { var m = Object.assign({}, self.state.wieLief); m[x.id] = false; self.setState({ wieLief: m }); },
        wieLiefSpeichern: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.wieLiefText.trim(); if (!t) return; var m = Object.assign({}, self.state.wieLief); m[x.id] = false; self.setState({ wieLief: m, wieLiefText: '' }); self.aendere([{ id: x.id, feld: 'abschluss', wert: t, basis: '' }], 'Im Verlauf abgelegt'); },
        personen: x.personen || [], personenAnzahl: (x.personen || []).length,
        gespraeche: gespraeche, gespraecheAnzahl: gespraeche.length,
        gespraechText: st.gespraechText, gespraechTippen: function (e) { self.setState({ gespraechText: e.target.value }); },
        gespraechDazu: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.gespraechText.trim(); if (!t) return; self.setState({ gespraechText: '' }); self.aendere([{ id: x.id, feld: 'gespraeche', wert: [{ datum: '30.09.', titel: 'Notiz', wer: 'Andreas', punkte: [t], neu: true }].concat(gespraeche), basis: x.gespraeche || [] }, { id: x.id, feld: 'letzter', wert: 'heute', basis: x.letzter }, { id: x.id, feld: 'tage', wert: 0, basis: x.tage }], 'Gespräch notiert – letzter Kontakt: heute'); },
        themen: themen.map(function (t) { return { name: t, wegLabel: 'Thema entfernen: ' + t, weg: function () { self.aendere([{ id: x.id, feld: 'themen', wert: themen.filter(function (y) { return y !== t; }), basis: x.themen || [] }], 'Thema entfernt: ' + t); } }; }),
        themaText: st.themaText, themaTippen: function (e) { self.setState({ themaText: e.target.value }); },
        themaDazu: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.themaText.trim(); if (!t) return; self.setState({ themaText: '' }); self.aendere([{ id: x.id, feld: 'themen', wert: themen.concat([t]), basis: x.themen || [] }], 'Thema ergänzt: ' + t); },
        vonUns: x.vonUns || [], anUns: x.anUns || [], keineVonUns: !(x.vonUns || []).length, keineAnUns: !(x.anUns || []).length,
        bezuege: meine.map(function (r) {
          var anderesId = r.a === x.id ? r.z : r.a, y = finde(anderesId); if (!y) return null;
          var kiOffen = !!r.ki && !r.ok;
          return { titel: self.wert(y.id, 'titel', y.titel), bereich: K[y.b].titel, wie: r.wie, href: K[y.b].href, intern: y.b === bk, extern: y.b !== bk,
            klasse: 'bz' + (kiOffen ? ' bz--ki' : ''), ki: kiOffen,
            los: function () { self.setState({ sel: y.id }); },
            bestaetigen: function () { setBz(bz.map(function (q2) { return q2 === r ? Object.assign({}, r, { ok: true }) : q2; }), 'Bezug bestätigt'); },
            wegLabel: 'Bezug entfernen: ' + y.titel, weg: function () { setBz(bz.filter(function (q2) { return q2 !== r; }), 'Bezug entfernt: ' + y.titel); } };
        }).filter(Boolean),
        moeglich: ALLE.filter(function (y) { return y.id !== x.id && !y.ungeprueft && !meine.some(function (r) { return r.a === y.id || r.z === y.id; }); }).map(function (y) { return { id: y.id, label: K[y.b].titel + ' · ' + y.titel }; }),
        bezugDazu: function (e) { var id = e.target.value; if (!id) return; var y = finde(id); setBz(bz.concat([{ a: x.id, z: id, wie: '', ok: true }]), 'Bezug ergänzt: ' + K[y.b].titel + ' · ' + y.titel); },
        verlauf: vl.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; }).map(function (v) { return { monat: MON[v[0].slice(4, 6)] + ' ' + v[0].slice(0, 4), datum: v[0].slice(6, 8) + '.' + v[0].slice(4, 6) + '.', art: v[1], text: v[2], quelle: v[3] || '', herkunft: v[4] || '', privat: !!v[5] }; }),
        istUngeprueft: ung(x), grund: x.grund || '', quelle: x.quelle || '',
        uebernehmen: function () { self.aendere([{ id: x.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + x.titel); },
        verwerfen: function () { self.aendere([{ id: x.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + x.titel); }
      };
    }
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    var filter = [fl('alle', 'alle')].concat((B.phasen.length ? B.phasen : B.filterWerte).map(function (p) { return fl(p, p); }));
    if (B.extraFilter) filter.push(fl(B.extraFilter, B.extraFilter));
    filter.push(fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft'));
    var cmd = function (c, arg) { return function () { try { document.execCommand(c, false, arg); } catch (e) {} }; };
    var neuAnlegen = function (daten, label) {
      var id = bk.slice(0, 2) + '-n' + Date.now();
      var n = Object.assign({ id: id, b: bk, titel: B.einzahl + ' (neu)', wer: 'Andreas', naechster: '', phase: B.phasen[0], vonUns: [], anUns: [], verlauf: [['202609301600', 'Notiz', 'Angelegt', 'von Hand']], personen: [], gespraeche: [], themen: [], letzter: 'heute', tage: 0, semester: 'WS 26/27', sitzung: 'noch offen', datum: 'noch offen', geplant: 'noch offen', kanal: 'Instagram' }, daten || {});
      self.setState({ sel: id, filter: B.startFilter === 'WS 26/27' ? 'WS 26/27' : 'alle' });
      self.aendere([{ id: '_neu', feld: 'liste', wert: [n].concat(self.wert('_neu', 'liste', [])), basis: [] }], label);
    };
    return Object.assign(this.kcVals(), this.toastVals(), P, {
      sidebarChats: this.kgChats(),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : zeilen.length + ' von ' + lebend.filter(function (y) { return !ung(y); }).length,
      neuLabel: B.neuLabel, neu: function () { neuAnlegen(null, B.einzahl + ' angelegt – Titel rechts ändern'); },
      hatVorlage: !!B.vorlageLabel, vorlageLabel: B.vorlageLabel || '',
      vorlagen: this.vorlagen().map(function (v) { return { id: v.id, titel: v.titel }; }),
      ausVorlage: function (e) { var v = self.vorlagen().filter(function (y) { return y.id === e.target.value; })[0]; if (!v) return; neuAnlegen(Object.assign({ ki: bk === 'events' ? { datum: true } : { sitzung: true } }, v.neu), 'Übernommen aus „' + v.titel + '“: Felder, Checkliste, Verteiler – Datum prüfen'); },
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      filter: filter, pruefModus: pruef,
      spalten: B.spalten.map(function (s) { return s.l; }), spaltenRaster: raster + '; padding-left: ' + (pruef ? '40px' : '20px'),
      zeilen: zeilen, keine: zeilen.length === 0, leerText: 'Filter lösen oder „' + B.neuLabel + '“.',
      hatMehr: pruef && P.pruefGesamt > zeilen.length, mehrText: zeilen.length + ' von ' + P.pruefGesamt + ' angezeigt · „alle ' + P.pruefGesamt + '“ oben wählt auch die übrigen',
      hatDetail: !!x, keinDetail: !x, d: d,
      notizStatus: st.notizZeit ? '✓ gespeichert ' + st.notizZeit + ' · ⌘Z macht rückgängig' : 'Überschriften, Listen, Fett',
      notizGetippt: function () { self.setState({ notizZeit: 'gerade eben' }); },
      halten: function (e) { e.preventDefault(); },
      fmtH: cmd('formatBlock', 'h3'), fmtListe: cmd('insertUnorderedList'), fmtFett: cmd('bold'), fmtText: cmd('formatBlock', 'p')
    });
  }
}
