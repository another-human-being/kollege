class Component extends DCLogic {
  constructor(props) {
    super(props);
    var B = this.bereich();
    this.state = Object.assign(this.basisState(), this.kcState(), { suche: '', filter: B.startFilter, sel: B.startSel, wieLief: {}, wieLiefText: '', gespraechText: '', gDatum: '2026-09-30', gArt: 'Beratung', gMit: null, themaText: '', notizZeit: '', voll: this.bkey() === 'events', mehrUeb: false, imp: null, kanal: 'Alle', fassung: null });
  }
  bkey() { return '@@BEREICH@@'; }
  // ——— Bereiche: Spalten (max. 5), Phasen, Knöpfe ———
  konfig() {
    return {
      gruendungsteams: { titel: 'Gründungsteams', einzahl: 'Gründungsteam', href: 'Gruendungsteams.dc.html', akte: true,
        spalten: [{ k: 'titel', l: 'Team', w: '1.2fr' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '92px' }, { k: 'wer', l: 'betreut von', typ: 'person', w: '80px' }, { k: 'letzter', l: 'letzter Kontakt', typ: 'berechnet', w: '96px' }, { k: 'naechster', l: 'nächster Schritt', typ: 'lang', w: '1.4fr' }],
        phasen: ['Idee', 'Vorgründung', 'gegründet', 'ruht'], endPhase: 'gegründet', endPhasen: ['gegründet', 'ruht'], wieLief: 'Wie lief die Begleitung?', neuLabel: 'Neues Team', ungeprueft: 52, startFilter: 'alle', startSel: 'gt-solaro', extraFilter: 'hängt' },
      events: { titel: 'Events', einzahl: 'Event', href: 'Events.dc.html',
        spalten: [{ k: 'titel', l: 'Event', w: '1.4fr' }, { k: 'datum', l: 'Datum', typ: 'text', w: '96px' }, { k: 'wer', l: 'zuständig', typ: 'person', w: '80px' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '110px' }],
        phasen: ['Planung', 'Einladung raus', 'vorbei'], endPhase: 'vorbei', endPhasen: ['vorbei'], wieLief: 'Wie lief’s?', neuLabel: 'Neues Event', vorlageLabel: 'Aus Vorjahr', ungeprueft: 31, startFilter: 'alle', startSel: 'ev-gn' },
      lehre: { titel: 'Lehre', einzahl: 'Veranstaltung', href: 'Lehre.dc.html',
        spalten: [{ k: 'titel', l: 'Veranstaltung', w: '1.5fr' }, { k: 'semester', l: 'Semester', typ: 'semester', w: '80px' }, { k: 'sitzung', l: 'nächste Sitzung', typ: 'text', w: '130px' }],
        extraFelder: [{ k: 'wer', l: 'zuständig', typ: 'person' }],
        phasen: [], filterWerte: ['WS 26/27', 'SS 26'], filterFeld: 'semester', neuLabel: 'Neue Veranstaltung', vorlageLabel: 'Aus letztem Semester', ungeprueft: 14, startFilter: 'WS 26/27', startSel: 'le-eb' },
      socialmedia: { titel: 'Social Media', einzahl: 'Beitrag', href: 'SocialMedia.dc.html',
        spalten: [{ k: 'titel', l: 'Beitrag', w: '1.4fr' }, { k: 'geplant', l: 'geplant für', typ: 'text', w: '104px' }, { k: 'kanalText', l: 'Kanäle', typ: 'berechnet', w: '150px' }, { k: 'phase', l: 'Phase', typ: 'phase', w: '92px' }],
        extraFelder: [{ k: 'wer', l: 'zuständig', typ: 'person' }],
        phasen: ['Entwurf', 'geplant', 'veröffentlicht'], endPhase: 'veröffentlicht', endPhasen: ['veröffentlicht'], neuLabel: 'Neuer Beitrag', ungeprueft: 21, startFilter: 'alle', startSel: 'sm-ig' }
    };
  }
  bereich() { return this.konfig()[this.bkey()]; }
  // ——— Einträge aller Bereiche (für Bezüge über Bereiche hinweg) ———
  alle() {
    var I = [
      // Gründungsteams
      { id: 'gt-solaro', b: 'gruendungsteams', orgId: 'solaro', titel: 'Solaro', phase: 'Vorgründung', wer: 'Andreas', letzter: 'heute', tage: 0, naechster: 'Finales Pitchdeck abwarten (bis Fr 02.10.), dann Termin mit Frau Weber vereinbaren.',
        gespraeche: [{ datum: '30.09.', titel: 'Beratung', wer: 'Andreas · Lisa, Tom', punkte: ['Pitchdeck final inkl. Finanzteil bis Fr 02.10.', 'Wir vermitteln Kontakt zu Frau Weber (IHK)'] }, { datum: '22.09.', titel: 'Beratung', wer: 'Andreas · Lisa, Tom', punkte: ['EXIST-Voraussetzungen durchgesprochen', 'Einreichung geplant für 30.10.', 'Finanzplan bis 15.10. überarbeiten'] }, { datum: '21.08.', titel: 'Erstkontakt', wer: 'StartHub-Postfach', punkte: ['Anfrage über das Kontaktformular'] }],
        themen: ['EXIST-Antrag', 'Finanzplan', 'Pitch'],
        verlauf: [['202609301432', 'Notiz', 'Beratung: Pitchdeck final bis Freitag; wir vermitteln Frau Weber.', 'Chat 14:32'], ['202609291740', 'Mail', 'Lisa Meier: Pitchdeck-Entwurf (ohne Finanzteil)', 'Mail', 'Eingang'], ['202609261000', 'Mail', 'Tom Kraus: Finanzplan v2 mit Bitte um Feedback', 'Mail', 'Eingang'], ['202609241750', 'Notiz', 'Tom wirkt unter Druck wegen der Finanzierung', 'Chat', '', true], ['202609241400', 'Mail', 'EXIST-Merkblatt an Lisa geschickt', 'Mail', 'aus Outlook'], ['202609231100', 'Mail', 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', '', '', true], ['202609221000', 'Termin', 'Beratung mit Lisa Meier und Tom Kraus, 60 Min.', 'Kalender'], ['202608211000', 'Mail', 'Erstkontakt über das Kontaktformular', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-kl', b: 'gruendungsteams', orgId: 'kl', titel: 'Kitchen Loop', phase: 'Vorgründung', ki: { phase: true }, wer: 'Julia', letzter: 'vor 2 Tagen', tage: 2, naechster: 'Hygieneschulung klären, Pilotstart mit dem Studierendenwerk abstimmen.',
        gespraeche: [{ datum: '23.09.', titel: 'Förderberatung', wer: 'Mehmet · Ben', punkte: ['Gründerstipendium Bayern passt eher als EXIST'] }, { datum: '14.09.', titel: 'Beratung Mensa-Konzept', wer: 'Julia · Sara, Ben', punkte: ['Pilot mit 200 Boxen pro Woche', 'Julia klärt Hygieneschulung mit dem Studierendenwerk'] }],
        themen: ['Mensa-Pilot', 'Förderung'],
        verlauf: [['202609281520', 'Mail', 'Sara Yilmaz: Hygieneschulung – Termin?', 'Mail', 'Eingang'], ['202609231000', 'Termin', 'Förderberatung mit Ben Hofer', 'Kalender'], ['202609141000', 'Termin', 'Beratung Mensa-Konzept', 'Kalender']] },
      { id: 'gt-nord', b: 'gruendungsteams', orgId: 'nord', titel: 'Nordlicht Analytics', phase: 'Idee', ki: { phase: true }, wer: 'Andreas', letzter: 'vor 23 Tagen', tage: 23, naechster: 'Folgetermin vereinbaren – Mentoring mit Dr. Albrecht ist angefragt (Fr 02.10.).',
                gespraeche: [{ datum: '07.09.', titel: 'Erstberatung', wer: 'Andreas · Jonas', punkte: ['Datenanalyse für Kommunen', 'Zielgruppe und Preismodell noch offen'] }], themen: ['Geschäftsmodell'],
        verlauf: [['202609071000', 'Termin', 'Erstberatung mit Jonas Berg', 'Kalender'], ['202609050900', 'Mail', 'Jonas Berg: Onepager', 'Mail', 'Eingang']] },
      { id: 'gt-green', b: 'gruendungsteams', orgId: 'green', ungeprueft: true, titel: 'Greenbyte', phase: 'Idee', ki: { phase: true, wer: true }, wer: 'Andreas', letzter: 'gestern', tage: 1, naechster: 'Erstberatung Do 01.10., 14:00.', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 29.09.',
        gespraeche: [], themen: [], verlauf: [['202609291100', 'Mail', 'Nora Kim: Anfrage Erstberatung', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-max', b: 'gruendungsteams', personIds: ['max'], ungeprueft: true, titel: 'Lern-App (Max Brandt)', phase: 'Idee', ki: { phase: true, wer: true }, wer: 'Andreas', letzter: 'gestern', tage: 1, naechster: 'Sprechstunde anbieten (Di 14–16 Uhr).', grund: 'Anfrage zum Gründungsstipendium', quelle: 'Mail 29.09.',
        gespraeche: [], themen: ['EXIST-Gründungsstipendium'], verlauf: [['202609291612', 'Mail', 'Max Brandt: Beratung Gründungsstipendium?', 'Mail', 'StartHub-Postfach']] },
      { id: 'gt-volt', b: 'gruendungsteams', ungeprueft: true, titel: 'VoltBox', phase: 'gegründet', ki: { phase: true }, wer: 'Andreas', letzter: 'vor 200 Tagen', tage: 200, naechster: '–', grund: 'zwei Termine und ein Protokoll auf dem Netzlaufwerk', quelle: 'Termin 12.03.', personen: [], gespraeche: [{ datum: '12.03.', titel: 'Beratung Finanzierung', wer: 'Andreas', punkte: ['aus Protokoll übernommen'] }], themen: [], verlauf: [['202603121000', 'Termin', 'Beratung Finanzierung', 'Kalender']] },
      { id: 'gt-lern', b: 'gruendungsteams', ungeprueft: true, titel: 'Lernwerk', phase: 'Idee', ki: { phase: true }, wer: 'Mehmet', letzter: 'vor 330 Tagen', tage: 330, naechster: '–', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 04.11.2025', personen: [], gespraeche: [], themen: [], verlauf: [['202511040900', 'Mail', 'Anfrage Nachhilfe-App', 'Mail', 'StartHub-Postfach']] },
      // Events
      { id: 'ev-gn', b: 'events', titel: 'Gründungsnacht 2026', datum: 'Fr 20.11.', wer: 'Julia', phase: 'Planung',
        mitwirkende: [{ name: 'Prof. Dr. Martin Hartmann', rolle: 'Speaker', info: 'Keynote 19:00', status: 'zugesagt' }, { name: 'Anna Weber', org: 'IHK Schwaben', rolle: 'Partner', info: 'Grußwort', status: 'angefragt' }, { name: 'Karin Vogt', org: 'Stadtwerke Augsburg', rolle: 'Partner', info: 'Sponsor Catering', status: 'zugesagt' }, { name: 'Lisa Meier', org: 'Solaro', rolle: 'Speaker', info: 'Gründerinnen-Talk', status: 'angefragt' }],
        teilnehmende: [['Sara Yilmaz', 'Kitchen Loop', 'angemeldet'], ['Ben Hofer', 'Kitchen Loop', 'angemeldet'], ['Jonas Berg', 'Nordlicht Analytics', 'angemeldet'], ['Nora Kim', 'Greenbyte', 'angemeldet'], ['Max Brandt', 'Uni Augsburg', 'angemeldet'], ['Tom Kraus', 'Solaro', 'abgesagt'], ['Petra Lang', 'Studierendenwerk', 'angemeldet'], ['Sven Ott', 'KLC', 'angemeldet'], ['Dr. Kerstin Albrecht', 'Albrecht Consulting', 'angemeldet'], ['Julia Roth', 'Uni Augsburg', 'angemeldet'], ['Emre Aydin', 'Uni Augsburg', 'angemeldet'], ['Fachschaft Informatik', '3 Personen', 'angemeldet']], naechster: 'Einladung am 09.10. verschicken (6 Wochen vorher); Catering klären.', notiz: true,
        verlauf: [['202609291000', 'Datei', 'Ablaufplan_Gruendungsnacht.docx geändert', 'Netzlaufwerk'], ['202609281012', 'Notiz', 'Einladung als Entwurf vorbereitet, Versand 09.10.', 'Chat']] },
      { id: 'ev-pa', b: 'events', titel: 'Pitch-Abend', datum: 'Do 12.11.', wer: 'Julia', phase: 'Planung', tage: 9,
        mitwirkende: [{ name: 'Anna Weber', org: 'IHK Schwaben', rolle: 'Jury', info: '', status: 'angefragt' }, { name: 'Dr. Kerstin Albrecht', org: 'Albrecht Consulting', rolle: 'Jury', info: '', status: 'zugesagt' }, { name: 'Prof. Dr. Martin Hartmann', rolle: 'Jury', info: 'Vorsitz', status: 'zugesagt' }, { name: 'Solaro', org: 'Lisa Meier, Tom Kraus', rolle: 'Pitch', info: 'Slot 3', status: 'zugesagt' }, { name: 'Kitchen Loop', org: 'Sara Yilmaz', rolle: 'Pitch', info: '', status: 'angefragt' }],
        teilnehmende: [], naechster: 'Jury vollständig machen – Rückmeldung von Frau Weber fehlt.',
        verlauf: [['202609230900', 'Mail', 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', '', '', true], ['202609211000', 'Mail', 'Juryanfrage an Anna Weber (IHK)', 'Mail', 'aus Outlook']] },
      { id: 'ev-som', b: 'events', titel: 'Sommerfest 2026', datum: '10.07.', wer: 'Mehmet', phase: 'vorbei', naechster: '–', abschluss: 'Gut besucht (ca. 120); Grillstand zu klein – nächstes Jahr zwei.', verlauf: [['202607101800', 'Termin', 'Sommerfest im Innenhof', 'Kalender']] },
      { id: 'ev-hack', b: 'events', ungeprueft: true, titel: 'Hackathon Januar', datum: 'Jan. 2027', ki: { datum: true, wer: true }, wer: 'Julia', phase: 'Planung', naechster: 'Fachschaft antworten: Challenge und Mentoring?', grund: 'Kooperationsanfrage im StartHub-Postfach', quelle: 'Mail 28.09.', verlauf: [['202609280914', 'Mail', 'Fachschaft Informatik: Hackathon im Januar', 'Mail', 'StartHub-Postfach']] },
      { id: 'ev-gn25', b: 'events', ungeprueft: true, titel: 'Gründungsnacht 2025', datum: '21.11.2025', wer: 'Julia', phase: 'vorbei', naechster: '–', grund: 'Ablaufplan und 14 Mails zur Organisation', quelle: 'Netzlaufwerk', verlauf: [['202511211800', 'Termin', 'Gründungsnacht 2025', 'Kalender']] },
      // Lehre
      { id: 'le-eb', b: 'lehre', titel: 'Entrepreneurship Basics', semester: 'WS 26/27', sitzung: 'Di 06.10., 16:00', wer: 'Andreas', naechster: 'Raum mit Beamer für Sitzung 3 buchen (überfällig).', notiz: true,
        verlauf: [['202609291600', 'Termin', 'Sitzung 1, Hörsaal 1004', 'Kalender'], ['202609281130', 'Mail', 'Prof. Hartmann: Raum für Sitzung 3', 'Mail', 'Eingang'], ['202609281400', 'Termin', 'Vorbesprechung mit Prof. Hartmann', 'Kalender']] },
      { id: 'le-dt', b: 'lehre', titel: 'Design Thinking Workshop', semester: 'WS 26/27', sitzung: 'Do 15.10., 14:00', wer: 'Mehmet', naechster: 'Teilnehmerliste schließen (max. 24).', verlauf: [['202609211000', 'Notiz', 'Anmeldung geöffnet', 'Mehmet']] },
      { id: 'le-gs', b: 'lehre', titel: 'Gründungsseminar', semester: 'SS 26', sitzung: '– (beendet)', wer: 'Andreas', naechster: '–', verlauf: [['202607151000', 'Termin', 'Abschlusspräsentationen', 'Kalender']] },
      { id: 'le-iw', b: 'lehre', ungeprueft: true, titel: 'Ideenwerkstatt', semester: 'SS 26', ki: { semester: true }, sitzung: '– (beendet)', wer: 'Mehmet', naechster: '–', grund: 'Ordner „Lehre/Ideenwerkstatt“ auf dem Netzlaufwerk', quelle: 'Netzlaufwerk', verlauf: [['202606011000', 'Datei', 'Teilnehmerliste_Ideenwerkstatt.xlsx', 'Netzlaufwerk']] },
      // Social Media
      { id: 'sm-ig', b: 'socialmedia', titel: 'Pitch-Abend ankündigen', geplant: 'Do 01.10., 12:00', kanal: 'Instagram', kanaele: ['Instagram', 'LinkedIn'], fassungen: { Instagram: { status: 'Entwurf', geplant: 'Do 01.10., 12:00', text: 'Am 12.11. pitchen sieben Gründungsteams vor Jury und Publikum. Kommt vorbei – Eintritt frei, Anmeldung über den Link in der Bio. #Gründen #Augsburg #PitchAbend', bild: 'Foto Pitch-Abend 2025 liegt bereit' }, LinkedIn: { status: 'Entwurf', geplant: 'Do 01.10., 9:00', text: 'Am 12. November ist es wieder so weit: Beim Pitch-Abend des Gründungszentrums stellen sieben Teams ihre Ideen vor – von Energie bis Bildung. Die Jury aus Wirtschaft und Wissenschaft gibt direktes Feedback. Wir freuen uns auf Gäste aus der Region. Anmeldung: Link im Kommentar.', bild: 'Titelbild 1200×627 fehlt noch' } }, phase: 'Entwurf', wer: 'Mehmet', naechster: 'Freigabe bis heute 17:00 – Text und Bild liegen bereit.', notiz: true, verlauf: [['202609291000', 'Notiz', 'Entwurf angelegt', 'Mehmet']] },
      { id: 'sm-std', b: 'socialmedia', titel: 'Save-the-Date Gründungsnacht', geplant: 'Fr 09.10.', kanal: 'Instagram + LinkedIn', kanaele: ['Instagram', 'LinkedIn', 'Newsletter'], fassungen: { Instagram: { status: 'geplant', geplant: 'Fr 09.10., 12:00', text: 'Save the Date: Gründungsnacht am 20.11. Mehr bald hier.', bild: 'Grafik liegt bereit' }, LinkedIn: { status: 'geplant', geplant: 'Fr 09.10., 9:00', text: 'Save the Date: Am 20. November lädt das Gründungszentrum zur Gründungsnacht – mit Talks, Teams und Netzwerk. Details folgen.', bild: 'Grafik liegt bereit' }, Newsletter: { status: 'geplant', geplant: 'Oktober-Ausgabe, 12.10.', text: 'Gründungsnacht 2026 – merkt euch den 20.11.! Programm und Anmeldung im nächsten Newsletter.', bild: '' } }, phase: 'geplant', wer: 'Mehmet', naechster: '–', verlauf: [['202609281030', 'Notiz', 'Für 09.10. eingeplant', 'Mehmet']] },
      { id: 'sm-por', b: 'socialmedia', titel: 'Porträt: Lisa Meier (Solaro)', geplant: '15.10.', kanal: 'LinkedIn', kanaele: ['LinkedIn'], fassungen: { LinkedIn: { status: 'Entwurf', geplant: '15.10.', text: 'Gründerinnen im Porträt: Lisa Meier hat mit Solaro …', bild: 'Foto von Lisa angefragt' } }, phase: 'Entwurf', wer: 'Mehmet', naechster: 'Freigabe von Lisa einholen.', verlauf: [['202609151000', 'Notiz', 'Idee: Porträtreihe Gründerinnen', 'Mehmet']] },
      { id: 'sm-som', b: 'socialmedia', titel: 'Rückblick Sommerfest', geplant: '–', kanal: 'LinkedIn', kanaele: ['LinkedIn'], fassungen: { LinkedIn: { status: 'Entwurf', geplant: '–', text: 'Rückblick Sommerfest: rund 120 Gäste …', bild: '3 Fotos ausgewählt' } }, phase: 'Entwurf', wer: 'Mehmet', tage: 25, naechster: 'Entwurf fertigstellen.', verlauf: [['202609051000', 'Datei', 'Entwurf zuletzt geändert', 'Netzlaufwerk']] },
      { id: 'sm-rgn', b: 'socialmedia', titel: 'Rückblick Gründungsnacht 2025', geplant: '25.11.2025', kanal: 'Instagram', kanaele: ['Instagram'], fassungen: { Instagram: { status: 'veröffentlicht', geplant: '25.11.2025', text: 'Danke an alle, die bei der Gründungsnacht 2025 dabei waren!', bild: 'Karussell mit 6 Fotos' } }, phase: 'veröffentlicht', wer: 'Mehmet', naechster: '–', verlauf: [['202511251000', 'Notiz', 'Veröffentlicht', 'Instagram']] },
      { id: 'sm-hack', b: 'socialmedia', titel: 'Aufruf Hackathon', geplant: '–', kanal: 'Instagram', kanaele: ['Instagram'], fassungen: { Instagram: { status: 'Entwurf', geplant: '–', text: '', bild: '' } }, ungeprueft: true, ki: { kanal: true }, phase: 'Entwurf', wer: 'Mehmet', naechster: '–', grund: 'Bitte der Fachschaft um Bewerbung', quelle: 'Mail 28.09.', verlauf: [['202609280914', 'Mail', 'Fachschaft Informatik: Hackathon im Januar', 'Mail', 'StartHub-Postfach']] }
    ];
    I.forEach(function (x) { if (x.b === 'socialmedia') { x.kanaele = x.kanaele || []; x.kanalText = x.kanaele.join(' · ') || '–'; } });
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
  personenVon(x) { var K = this.kontaktDaten(); var oid = x.orgId, ids = x.personIds || []; return K.personen.filter(function (p) { return (oid && p.orgId === oid && !p.dublette) || ids.indexOf(p.id) >= 0; }).map(function (p) { return { name: p.name, rolle: p.rolle + (p.funktion ? ' · ' + p.funktion : ''), adresse: p.adressen[0].adresse }; }); }
  aktuell() { var self = this; return this.alle().filter(function (x) { return x.id === self.state.sel && x.b === self.bkey() && self.wert(x.id, 'geprueft', '') !== 'weg'; })[0]; }
  kcCfg() { var x = this.aktuell(); return { name: x ? this.wert(x.id, 'titel', x.titel) : this.bereich().titel, anzahl: 'Gespräche, Zusagen, Verlauf', platzhalter: 'Frag oder notiere etwas dazu', antwort: 'Stand Solaro: Pitchdeck-Entwurf kam gestern ohne Finanzteil, final ist bis Freitag zugesagt. Danach vermitteln wir Frau Weber.', belege: [{ art: 'belegt', text: 'Pitchdeck-Entwurf ohne Finanzteil', quelle: 'Mail 29.09.' }], luecke: 'Dazu habe ich hier nichts Belastbares.' }; }
  sbBaum() {
    // E55: Baum in der Seitenleiste – laufende Einträge des Bereichs, Zahl = offene Aufgaben (Bestand)
    var self = this, st = this.state, B = this.bereich(), bk = this.bkey();
    var w = function (x, k) { return self.wert(x.id, k, x[k]); };
    if (bk === 'socialmedia') return ['Instagram', 'LinkedIn', 'Newsletter'].map(function (k) { var n = self.alle().filter(function (x) { return x.b === 'socialmedia' && !x.ungeprueft && (self.wert(x.id, 'kanaele', x.kanaele) || []).indexOf(k) >= 0 && self.wert(x.id, 'phase', x.phase) !== 'veröffentlicht'; }).length; return { titel: k, zahl: String(n), hatZahl: n > 0, tip: k + ' · ' + n + ' offene Beiträge', aktiv: st.kanal === k ? 'true' : 'false', los: function () { self.setState({ kanal: self.state.kanal === k ? 'Alle' : k }); } }; });
    var A = this.aufgabenDaten();
    var lauf = this.alle().filter(function (x) {
      if (x.b !== bk || self.wert(x.id, 'geprueft', '') === 'weg' || self.wert(x.id, 'archiv', false)) return false;
      if (x.ungeprueft && !self.wert(x.id, 'geprueft', '')) return false;
      return (B.endPhasen || []).indexOf(w(x, 'phase')) < 0;
    });
    return lauf.slice(0, 5).map(function (x) {
      var t = w(x, 'titel'), v = B.titel + ' · ' + x.titel;
      var n = A.filter(function (a) { return a.vorgang === v && !self.wert(a.id, 'erledigt', !!a.erledigt); }).length;
      return { titel: t, zahl: String(n), hatZahl: n > 0, tip: t + (n ? ' · ' + n + (n === 1 ? ' offene Aufgabe' : ' offene Aufgaben') : ''),
        aktiv: x.id === st.sel && !st.zu ? 'true' : 'false',
        los: function () { self.setState({ zu: false, sel: x.id, kcOffen: false, voll: bk === 'events', fassung: null, mehrUeb: false, mehrOffen: false }); } };
    });
  }
  todosFuer(vorgang) {
    var self = this;
    return this.aufgabenDaten().filter(function (a) { return a.vorgang === vorgang && !a.ungeprueft && !a.privat; }).map(function (a) {
      var erl = self.wert(a.id, 'erledigt', !!a.erledigt), g = self.faelligGruppe(a.faellig);
      var wer = a.richtung === 'an uns' ? a.von.replace(/ \(.*\)$/, '') : a.wer;
      return { text: a.titel + ' · ' + wer, quelle: a.quelle, sort: (erl ? '1' : '0') + (a.faellig || '9'),
        faellig: erl ? '' : (g === 'ueber' ? 'seit ' + self.datumText(a.faellig) : g === 'ohne' ? 'ohne Datum' : g === 'heute' ? self.datumText(a.faellig, a.zeit) : 'bis ' + self.datumText(a.faellig, a.zeit)),
        status: erl ? 'erledigt' : g === 'ueber' ? 'ueberfaellig' : 'offen' };
    }).sort(function (a, b) { return a.sort < b.sort ? -1 : 1; });
  }
  importZeilen() {
    var V = ['Lea', 'Paul', 'Mia', 'Jan', 'Sophie', 'Felix', 'Hannah', 'Luca', 'Emma', 'Noah', 'Clara', 'Ben', 'Lina', 'Elias', 'Marie', 'Tim'];
    var N = ['Bauer', 'Huber', 'Wagner', 'Schmid', 'Fischer', 'Weber', 'Maier', 'Koch', 'Wolf', 'Schulz', 'Keller', 'Roth'];
    var out = [];
    for (var i = 0; i < 46; i++) out.push([V[i % V.length] + ' ' + N[(i * 7) % N.length], i % 3 === 0 ? 'Hochschule Augsburg' : 'Uni Augsburg', i % 11 === 5 ? 'abgesagt' : 'angemeldet']);
    return out;
  }
  renderVals() {
    var self = this, st = this.state, K = this.konfig(), B = this.bereich(), bk = this.bkey();
    var ALLE = this.alle();
    var eigene = ALLE.filter(function (x) { return x.b === bk; });
    var lebend = eigene.filter(function (x) { return self.wert(x.id, 'geprueft', '') !== 'weg' && !self.wert(x.id, 'archiv', false); });
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(eigene, B.ungeprueft, B.titel);
    var ung = function (x) { return !!x.ungeprueft && !self.wert(x.id, 'geprueft', ''); };
    var w = function (x, k) { return self.wert(x.id, k, x[k]); };
    var ende = function (x) { return (B.endPhasen || []).indexOf(w(x, 'phase')) >= 0; };
    var haengt = function (x) { return (self.wert(x.id, 'tage', x.tage) || 0) >= 21 && !ende(x) && !ung(x); };
    var uebergabe = function (x) { return self.wert(x.id, 'uebergabeAn', ''); };
    var q = st.suche.trim().toLowerCase();
    var liste = lebend.filter(function (x) {
      if (pruef) return ung(x);
      if (ung(x)) return false;
      if (st.filter === 'hängt' && !haengt(x)) return false;
      if (B.phasen.indexOf(st.filter) >= 0 && w(x, 'phase') !== st.filter) return false;
      if (B.filterFeld && (B.filterWerte || []).indexOf(st.filter) >= 0 && w(x, B.filterFeld) !== st.filter) return false;
      if (bk === 'socialmedia' && st.kanal !== 'Alle' && (w(x, 'kanaele') || []).indexOf(st.kanal) < 0) return false;
      return !q || (w(x, 'titel') + ' ' + (x.personen || []).map(function (p) { return p.name; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    var raster = 'grid-template-columns: ' + B.spalten.map(function (s) { return 'minmax(0, ' + s.w + ')'; }).join(' ');
    var zeilen = liste.map(function (x) {
      return { pruef: pruef, normal: !pruef, raster: raster, aktiv: x.id === st.sel ? 'true' : 'false',
        waehlenLabel: 'Auswählen: ' + w(x, 'titel'), gewaehlt: P.pruefIstGewaehlt(x.id), waehlen: P.pruefWaehle(x.id),
        los: function () { self.setState({ zu: false, sel: x.id, kcOffen: false, voll: bk === 'events', fassung: null, mehrUeb: false, mehrOffen: false }); },
        zellen: B.spalten.map(function (s, i) {
          var t = String(w(x, s.k) || '–'), stil = '';
          if (s.k === 'letzter' && haengt(x)) { t = t + ' · hängt'; stil = 'color: var(--attention)'; }
          if (s.k === 'phase' && haengt(x) && bk !== 'gruendungsteams') { t = t + ' · hängt'; stil = 'color: var(--attention)'; }
          if (s.k === 'phase' && ende(x)) stil = 'color: var(--ink-muted)';
          if (s.typ === 'person' && uebergabe(x)) t = t + ' → ' + uebergabe(x) + '?';
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
        return { k: s.k, label: s.l, htmlId: 'f-' + s.k, wert: s.k === 'letzter' && haengt(x) ? w(x, s.k) + ' · hängt (seit 21 Tagen nichts passiert)' : String(w(x, s.k) || ''),
          stil: s.k === 'letzter' && haengt(x) ? 'color: var(--attention)' : '',
          istSelect: !!opt && s.typ !== 'person', istInput: !opt && s.typ !== 'berechnet', istBerechnet: s.typ === 'berechnet', istPerson: s.typ === 'person', optionen: opt || [],
          istFeld: !!opt && s.typ !== 'person' || (!opt && s.typ !== 'berechnet'), istAnzeige: s.typ === 'berechnet' || s.typ === 'person',
          wahl: function (e) { var neu = e.target.value; var ch = [{ id: x.id, feld: s.k, wert: neu, basis: x[s.k] }, { id: x.id, feld: 'ok_' + s.k, wert: true, basis: false }];
            self.aendere(ch, 'Gespeichert: ' + s.l + ' → ' + neu);
            if (s.typ === 'phase' && B.wieLief && (B.endPhasen || []).indexOf(neu) >= 0) { var m = Object.assign({}, self.state.wieLief); m[x.id] = true; self.setState({ wieLief: m }); } },
          ki: kiOffen, bestaetigen: function () { self.aendere([{ id: x.id, feld: 'ok_' + s.k, wert: true, basis: false }], 'Bestätigt: ' + s.l + ' = ' + w(x, s.k)); } };
      });
      var bz = this.wert('_bez', 'liste', this.bezuegeStart());
      var setBz = function (neu, label) { self.aendere([{ id: '_bez', feld: 'liste', wert: neu, basis: self.bezuegeStart() }], label); };
      var meine = bz.filter(function (r) { return r.a === x.id || r.z === x.id; });
      var finde = function (id) { return ALLE.filter(function (y) { return y.id === id; })[0]; };
      var gespraeche = this.wert(x.id, 'gespraeche', x.gespraeche || []);
      var ZU = this.zusagenFuer(B.titel + ' · ' + w(x, 'titel'));
      var TD = this.todosFuer(B.titel + ' · ' + w(x, 'titel'));
      var themen = this.wert(x.id, 'themen', x.themen || []);
      var vl = (x.verlauf || []).slice();
      if (this.wert(x.id, 'abschluss', x.abschluss || '')) vl.unshift(['202609301600', 'Notiz', 'Wie lief’s: ' + this.wert(x.id, 'abschluss', x.abschluss), 'Abschluss']);
      gespraeche.filter(function (g) { return g.neu; }).forEach(function (g) { vl.unshift([(g.sort || '2026-09-30').replace(/-/g, '') + '1601', g.titel, g.titel + ': ' + g.punkte[0], 'von Hand']); });
      var MON = { '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April', '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August', '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember' };
      d = {
        f: f, kopfzeile: B.einzahl + (B.akte ? ' · Beratungsakte' : ''),
        titel: w(x, 'titel'), naechster: w(x, 'naechster'), wer: w(x, 'wer'), felder: felder,
        istAkte: !!B.akte, keineAkte: !B.akte,
        andere: TEAM.filter(function (n) { return n !== w(x, 'wer'); }),
        uebergabeAn2: TEAM.filter(function (n) { return n !== w(x, 'wer'); }).map(function (n) { return { name: n, los: function () { self.setState({ mehrOffen: false, mehrUeb: false }); self.aendere([{ id: x.id, feld: 'uebergabeAn', wert: n, basis: '' }], 'Übergabe an ' + n + ' angeboten – ' + n + ' bekommt einen Kurzstand und nimmt an'); } }; }),
        archivieren: function () { self.setState({ mehrOffen: false }); self.aendere([{ id: x.id, feld: 'archiv', wert: true, basis: false }], '„' + w(x, 'titel') + '“ archiviert'); },
        uebergeben: function (e) { var n = e.target.value; if (!n) return; self.aendere([{ id: x.id, feld: 'uebergabeAn', wert: n, basis: '' }], 'Übergabe an ' + n + ' angeboten – ' + n + ' bekommt einen Kurzstand und nimmt an'); },
        uebergabeAn: uebergabe(x), uebergabeOffen: !!uebergabe(x), keineUebergabe: !uebergabe(x),
        uebergabeText: uebergabe(x) ? 'Übergabe an ' + uebergabe(x) + ' – wartet auf Annahme. Bis dahin bleibt ' + w(x, 'wer') + ' zuständig.' : '',
        zurueckziehen: function () { self.aendere([{ id: x.id, feld: 'uebergabeAn', wert: '', basis: '' }], 'Übergabe zurückgezogen'); },
        annehmenSimulieren: function () { var n = uebergabe(x); self.aendere([{ id: x.id, feld: 'wer', wert: n, basis: x.wer }, { id: x.id, feld: 'uebergabeAn', wert: '', basis: '' }], n + ' hat angenommen – jetzt zuständig'); },
        werLabel: (B.spalten.concat(B.extraFelder || []).filter(function (s) { return s.typ === 'person'; })[0] || { l: 'zuständig' }).l,
        wieLiefTitel: B.wieLief || 'Wie lief’s?', wieLiefHilfe: bk === 'gruendungsteams' ? 'Landet in der Akte – z. B. warum es ruht oder was geholfen hat.' : 'Landet im Verlauf und hilft bei „Aus Vorjahr“.',
        frageWieLief: !!st.wieLief[x.id], wieLiefText: st.wieLiefText, wieLiefTippen: function (e) { self.setState({ wieLiefText: e.target.value }); },
        wieLiefSkip: function () { var m = Object.assign({}, self.state.wieLief); m[x.id] = false; self.setState({ wieLief: m }); },
        wieLiefSpeichern: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.wieLiefText.trim(); if (!t) return; var m = Object.assign({}, self.state.wieLief); m[x.id] = false; self.setState({ wieLief: m, wieLiefText: '' }); self.aendere([{ id: x.id, feld: 'abschluss', wert: t, basis: '' }], 'Im Verlauf abgelegt'); },
        personen: this.personenVon(x), personenAnzahl: this.personenVon(x).length,
        gespraeche: gespraeche, gespraecheAnzahl: gespraeche.length,
        gespraechText: st.gespraechText, gespraechTippen: function (e) { self.setState({ gespraechText: e.target.value }); },
        gDatum: st.gDatum, gDatumWahl: function (e) { self.setState({ gDatum: e.target.value }); },
        gArten: ['Beratung', 'Telefonat', 'Treffen', 'Videocall', 'Mail-Austausch'], gArt: st.gArt, gArtWahl: function (e) { self.setState({ gArt: e.target.value }); },
        gMit: st.gMit !== null ? st.gMit : this.personenVon(x).map(function (p) { return p.name.split(' ')[0]; }).join(', '), gMitTippen: function (e) { self.setState({ gMit: e.target.value }); },
        gespraechDazu: function (e) {
          if (e && e.preventDefault) e.preventDefault(); var t = self.state.gespraechText.trim(); if (!t) return;
          var dt = self.state.gDatum || self.heuteIso(), tage = self.tageSeit(dt), mit = self.state.gMit !== null ? self.state.gMit : self.personenVon(x).map(function (p) { return p.name.split(' ')[0]; }).join(', ');
          var g = { datum: dt.slice(8, 10) + '.' + dt.slice(5, 7) + '.', sort: dt, titel: self.state.gArt, wer: 'Andreas' + (mit ? ' · ' + mit : ''), punkte: [t], neu: true };
          var neuG = [g].concat(gespraeche).sort(function (a, b) { var x1 = a.sort || ('2026-' + a.datum.slice(3, 5) + '-' + a.datum.slice(0, 2)), y1 = b.sort || ('2026-' + b.datum.slice(3, 5) + '-' + b.datum.slice(0, 2)); return x1 < y1 ? 1 : -1; });
          var ch = [{ id: x.id, feld: 'gespraeche', wert: neuG, basis: x.gespraeche || [] }];
          var altTage = self.wert(x.id, 'tage', x.tage); var neuer = altTage === undefined || tage <= altTage;
          if (neuer) ch.push({ id: x.id, feld: 'letzter', wert: tage === 0 ? 'heute' : tage === 1 ? 'gestern' : 'vor ' + tage + ' Tagen', basis: x.letzter }, { id: x.id, feld: 'tage', wert: tage, basis: x.tage });
          self.setState({ gespraechText: '', gMit: null, gDatum: self.heuteIso(), gArt: 'Beratung' });
          self.aendere(ch, g.titel + ' am ' + g.datum + ' notiert' + (neuer ? ' – letzter Kontakt: ' + (tage === 0 ? 'heute' : g.datum) : ''));
        },
        themen: themen.map(function (t) { return { name: t, wegLabel: 'Thema entfernen: ' + t, weg: function () { self.aendere([{ id: x.id, feld: 'themen', wert: themen.filter(function (y) { return y !== t; }), basis: x.themen || [] }], 'Thema entfernt: ' + t); } }; }),
        themaText: st.themaText, themaTippen: function (e) { self.setState({ themaText: e.target.value }); },
        themaDazu: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.themaText.trim(); if (!t) return; self.setState({ themaText: '' }); self.aendere([{ id: x.id, feld: 'themen', wert: themen.concat([t]), basis: x.themen || [] }], 'Thema ergänzt: ' + t); },
        vonUns: ZU.vonUns, anUns: ZU.anUns, keineVonUns: !ZU.vonUns.length, keineAnUns: !ZU.anUns.length,
        todos: TD, keineTodos: !TD.length, todoAnzahl: TD.length,
        istEvent: bk === 'events', istSM: bk === 'socialmedia',
        mitwirkende: (x.mitwirkende || []).map(function (m) { return Object.assign({ org: '', info: '' }, m, { pille: 'kg-pille' + (m.status === 'angefragt' ? ' kg-pille--offen' : '') }); }),
        mitwirkendeAnzahl: (x.mitwirkende || []).length, keineMitwirkenden: !(x.mitwirkende || []).length,
        rollenZahl: ['Jury', 'Speaker', 'Partner', 'Pitch'].map(function (r) { var n = (x.mitwirkende || []).filter(function (m) { return m.rolle === r; }).length; return n ? n + ' ' + r : ''; }).filter(Boolean).join(' · '),
        bezuege: meine.map(function (r) {
          var anderesId = r.a === x.id ? r.z : r.a, y = finde(anderesId); if (!y) return null;
          var kiOffen = !!r.ki && !r.ok;
          return { titel: self.wert(y.id, 'titel', y.titel), bereich: K[y.b].titel, wie: r.wie, href: K[y.b].href, intern: y.b === bk, extern: y.b !== bk,
            klasse: 'bz' + (kiOffen ? ' bz--ki' : ''), ki: kiOffen,
            los: function () { self.setState({ zu: false, sel: y.id }); },
            bestaetigen: function () { setBz(bz.map(function (q2) { return q2 === r ? Object.assign({}, r, { ok: true }) : q2; }), 'Bezug bestätigt'); },
            wegLabel: 'Bezug entfernen: ' + y.titel, weg: function () { setBz(bz.filter(function (q2) { return q2 !== r; }), 'Bezug entfernt: ' + y.titel); } };
        }).filter(Boolean),
        moeglich: ALLE.filter(function (y) { return y.id !== x.id && !y.ungeprueft && !meine.some(function (r) { return r.a === y.id || r.z === y.id; }); }).map(function (y) { return { id: y.id, label: K[y.b].titel + ' · ' + y.titel }; }),
        bezugDazu: function (e) { var id = e.target.value; if (!id) return; var y = finde(id); setBz(bz.concat([{ a: x.id, z: id, wie: '', ok: true }]), 'Bezug ergänzt: ' + K[y.b].titel + ' · ' + y.titel); },
        verlauf: vl.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; }).map(function (v) { return { monat: MON[v[0].slice(4, 6)] + ' ' + v[0].slice(0, 4), datum: v[0].slice(6, 8) + '.' + v[0].slice(4, 6) + '.', art: v[1], text: v[2], quelle: v[3] || '', herkunft: v[4] || '', privat: !!v[5], privatFuer: v[5] === true && /nur für Julia/.test(v[2]) ? 'Julia' : (typeof v[5] === 'string' ? v[5] : undefined) }; }),
        istUngeprueft: ung(x), grund: x.grund || '', quelle: x.quelle || '',
        uebernehmen: function () { self.aendere([{ id: x.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + x.titel); },
        verwerfen: function () { self.aendere([{ id: x.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + x.titel); }
      };
    }
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    var filter = [fl('alle', 'alle')].concat((B.phasen.length ? B.phasen : B.filterWerte).map(function (p) { return fl(p, p); }));
    if (B.extraFilter) filter.push(fl(B.extraFilter, B.extraFilter));
    filter.push(fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft'));
    if (x) Object.assign(d, { teilnehmende: [], tnAnzahl: 0, tnSumme: '', keineTn: true, tnMehr: false, tnMehrText: '', importOffen: false, importAuf: function () {}, importZu: function () {}, importUebernehmen: function () {},
      fassungTabs: [], fehlend: [], hatFehlend: false, hatFassung: false, fassungKanal: '', fassungFormat: '', fassungStatus: '', fassungGeplant: '', fassungText: '', fassungBild: '', fassungKi: false, fassungZeichen: '', fassungTippen: function () {} });
    if (x && bk === 'events') {
      var importiert = !!this.wert(x.id, 'importiert', false);
      var tn = (x.teilnehmende || []).concat(importiert ? this.importZeilen() : []);
      var an = tn.filter(function (t) { return t[2] === 'angemeldet'; }).length;
      Object.assign(d, { teilnehmende: tn.slice(0, 8).map(function (t) { return { name: t[0], org: t[1], status: t[2], pille: 'kg-pille' + (t[2] === 'abgesagt' ? ' kg-pille--weg' : '') }; }),
        tnAnzahl: tn.length, tnSumme: tn.length ? an + ' angemeldet · ' + (tn.length - an) + ' abgesagt' : 'noch niemand', keineTn: !tn.length,
        tnMehr: tn.length > 8, tnMehrText: 'Alle ' + tn.length + ' anzeigen',
        importOffen: st.imp === 'vorschau',
        importAuf: function () { self.setState({ imp: 'vorschau' }); },
        importZu: function () { self.setState({ imp: null }); },
        importUebernehmen: function () { self.setState({ imp: null }); self.aendere([{ id: x.id, feld: 'importiert', wert: true, basis: false }], '46 Teilnehmende aus Anmeldungen_Gruendungsnacht.xlsx übernommen · 4 zusammengeführt'); } });
    }
    if (x && bk === 'socialmedia') {
      var KAN = ['Instagram', 'LinkedIn', 'Newsletter'];
      var fs = this.wert(x.id, 'fassungen', x.fassungen || {}), ks = KAN.filter(function (k) { return fs[k]; });
      var akt = ks.indexOf(st.fassung) >= 0 ? st.fassung : ks[0];
      var FORMAT = { Instagram: 'Bild oder Karussell · Bildunterschrift bis 2.200 Zeichen · Hashtags', LinkedIn: 'Beitrag bis 3.000 Zeichen · Titelbild 1200×627 · Link im Kommentar', Newsletter: 'Abschnitt mit Überschrift, Teaser und Link' };
      var fa = fs[akt] || { status: '', geplant: '', text: '', bild: '' };
      Object.assign(d, {
        fassungTabs: ks.map(function (k) { return { label: k + ' · ' + fs[k].status, an: k === akt ? 'true' : 'false', los: function () { self.setState({ fassung: k }); } }; }),
        fehlend: KAN.filter(function (k) { return !fs[k]; }).map(function (k) { return { label: '+ ' + k, los: function () {
          var quelle = fs[akt] || { text: '' }; var neu = Object.assign({}, fs); neu[k] = { status: 'Entwurf', geplant: '–', text: quelle.text, bild: '', ki: true };
          var kan = KAN.filter(function (z) { return neu[z]; });
          self.setState({ fassung: k });
          self.aendere([{ id: x.id, feld: 'fassungen', wert: neu, basis: x.fassungen || {} }, { id: x.id, feld: 'kanaele', wert: kan, basis: x.kanaele }, { id: x.id, feld: 'kanalText', wert: kan.join(' · '), basis: x.kanalText }], 'Fassung für ' + k + ' angelegt – Kollege schreibt sie aus ' + akt + ' um'); } }; }),
        hatFehlend: ks.length < KAN.length, hatFassung: !!akt, fassungKanal: akt || '', fassungFormat: FORMAT[akt] || '',
        fassungStatus: fa.status, fassungGeplant: fa.geplant, fassungText: fa.text, fassungBild: fa.bild || 'noch kein Bild', fassungKi: !!fa.ki,
        fassungZeichen: (fa.text || '').length + ' von ' + (akt === 'Instagram' ? '2.200' : akt === 'LinkedIn' ? '3.000' : '600') + ' Zeichen',
        fassungTippen: function (e) { var neu = Object.assign({}, fs); neu[akt] = Object.assign({}, fa, { text: e.target.value, ki: false }); self.aendere([{ id: x.id, feld: 'fassungen', wert: neu, basis: x.fassungen || {} }], 'Fassung ' + akt + ' gespeichert'); }
      });
    }
    var cmd = function (c, arg) { return function () { try { document.execCommand(c, false, arg); } catch (e) {} }; };
    var neuAnlegen = function (daten, label) {
      var id = bk.slice(0, 2) + '-n' + Date.now();
      var n = Object.assign({ id: id, b: bk, titel: B.einzahl + ' (neu)', wer: 'Andreas', naechster: '', phase: B.phasen[0], verlauf: [['202609301600', 'Notiz', 'Angelegt', 'von Hand']], personen: [], gespraeche: [], themen: [], letzter: 'heute', tage: 0, semester: 'WS 26/27', sitzung: 'noch offen', datum: 'noch offen', geplant: 'noch offen', kanal: 'Instagram' }, daten || {});
      self.setState({ zu: false, sel: id, suche: '', filter: B.startFilter === 'WS 26/27' ? 'WS 26/27' : 'alle' });
      self.aendere([{ id: '_neu', feld: 'liste', wert: [n].concat(self.wert('_neu', 'liste', [])), basis: [] }], label);
    };
    return Object.assign(this.kcVals(), this.toastVals(), this.detailVals(), P, { sbBaum: this.sbBaum(),
      kannVerkleinern: bk !== 'events', istSMListe: bk === 'socialmedia',
      kanaele: ['Alle', 'Instagram', 'LinkedIn', 'Newsletter'].map(function (k) { return { label: k, an: st.kanal === k ? 'true' : 'false', los: function () { self.setState({ kanal: k }); } }; }),
      mehrOffen: !!st.mehrOffen, mehrAria: st.mehrOffen ? 'true' : 'false', mehrToggle: function () { self.setState({ mehrOffen: !self.state.mehrOffen, mehrUeb: false }); }, mehrUeb: !!st.mehrUeb, mehrHaupt: !st.mehrUeb, mehrUebAuf: function () { self.setState({ mehrUeb: true }); }, mehrUebZu: function () { self.setState({ mehrUeb: false }); },
      sidebarChats: this.kgChats(),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : zeilen.length + ' von ' + lebend.filter(function (y) { return !ung(y); }).length,
      neuLabel: B.neuLabel, neu: function () { neuAnlegen(null, B.einzahl + ' angelegt – Titel rechts ändern' + (B.akte ? '; die Organisation steht damit auch in Kontakte' : '')); },
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
