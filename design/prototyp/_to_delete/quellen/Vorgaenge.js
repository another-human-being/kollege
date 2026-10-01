class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { suche: '', filter: 'offen', sel: 'solaro', wieLief: {}, wieLiefText: '', sysOffen: false, notizZeit: '', neue: [] });
  }
  kcCfg() { var d = this.aktuell(); return { name: d ? this.wert(d.id, 'titel', d.titel) : 'Vorgang', anzahl: 'Verlauf, Zusagen, Notizen', platzhalter: 'Frag oder notiere etwas zu diesem Vorgang', antwort: 'Stand: Solaro schickt das finale Pitchdeck bis Freitag, danach vermitteln wir Frau Weber. Einreichung geplant 30.10.', belege: [{ art: 'belegt', text: 'Pitchdeck-Entwurf kam gestern, ohne Finanzteil', quelle: 'Mail 29.09.' }], luecke: 'Dazu habe ich in diesem Vorgang nichts Belastbares.' }; }
  daten() {
    var V = [
      { id: 'solaro', titel: 'Solaro – EXIST-Antrag', art: 'Beratung', wer: 'Andreas', status: 'offen', mit: 'Solaro (Lisa Meier, Tom Kraus)', tage: 0, wartet: 'wartet auf Solaro: Pitchdeck final bis Fr 02.10.', naechster: 'Finales Pitchdeck abwarten (bis Fr 02.10.), dann Termin mit Frau Weber vereinbaren.', zuletzt: 'heute' },
      { id: 'kl', titel: 'Kitchen Loop – Mensa-Kooperation', art: 'Beratung', wer: 'Julia', status: 'offen', mit: 'Kitchen Loop (Sara Yilmaz, Ben Hofer)', tage: 0, wartet: 'wartet auf Studierendenwerk', naechster: 'Hygieneschulung klären, Pilotstart mit dem Studierendenwerk abstimmen.', zuletzt: 'heute' },
      { id: 'gn', titel: 'Gründungsnacht 20.11.', art: 'Event', wer: 'Julia', status: 'offen', mit: 'Verteiler Gründungsinteressierte', tage: 1, naechster: 'Einladung am 09.10. verschicken.', zuletzt: 'gestern' },
      { id: 'pa', titel: 'Pitch-Abend', art: 'Event', wer: 'Julia', status: 'offen', mit: 'Jury, Gründungsteams', tage: 9, wartet: 'wartet auf Antwort Frau Weber (Jury)', naechster: 'Jury vollständig machen.', zuletzt: '21.09.' },
      { id: 'ig', titel: 'Instagram: Pitch-Abend ankündigen', art: 'Beitrag', wer: 'Mehmet', status: 'offen', mit: '–', tage: 1, naechster: 'Freigabe bis 17:00.', zuletzt: 'gestern' },
      { id: 'eb', titel: 'Entrepreneurship Basics WS 26/27', art: 'Lehre', wer: 'Andreas', status: 'offen', mit: 'Prof. Dr. Martin Hartmann', tage: 2, naechster: 'Raum für Sitzung 3 buchen.', zuletzt: '28.09.' },
      { id: 'sw', titel: 'Anfrage Stadtwerke: Kooperation', art: 'Sonstiges', wer: 'Andreas', status: 'offen', mit: 'Karin Vogt (Stadtwerke Augsburg)', tage: 1, naechster: 'Rahmenvereinbarung prüfen.', zuletzt: 'gestern' },
      { id: 'nord', titel: 'Nordlicht Analytics – Erstberatung', art: 'Beratung', wer: 'Andreas', status: 'offen', mit: 'Jonas Berg', tage: 23, naechster: 'Folgetermin vereinbaren.', zuletzt: '07.09.' },
      { id: 'sommer', titel: 'Rückblick Sommerfest', art: 'Beitrag', wer: 'Mehmet', status: 'offen', mit: '–', tage: 25, naechster: 'Entwurf fertigstellen.', zuletzt: '05.09.' },
      { id: 'kf', titel: 'Kitchen Loop – Förderberatung', art: 'Beratung', wer: 'Mehmet', status: 'erledigt', mit: 'Ben Hofer', tage: 28, naechster: '–', zuletzt: '02.09.' },
      { id: 'u1', ungeprueft: true, titel: 'Max Brandt – Gründungsstipendium', art: 'Beratung', wer: 'Andreas', status: 'offen', mit: 'Max Brandt', tage: 1, naechster: 'Sprechstunde anbieten.', zuletzt: 'gestern', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 29.09.' },
      { id: 'u2', ungeprueft: true, titel: 'VoltBox – Beratung Finanzierung', art: 'Beratung', wer: 'Andreas', status: 'erledigt', mit: 'VoltBox', tage: 200, naechster: '–', zuletzt: '12.03.', grund: 'zwei Termine und ein Protokoll auf dem Netzlaufwerk', quelle: 'Termin 12.03.' },
      { id: 'u3', ungeprueft: true, titel: 'Rechnung Raumtechnik 03/2026', art: 'Sonstiges', wer: 'Julia', status: 'offen', mit: '–', tage: 190, naechster: '–', zuletzt: '20.03.', grund: 'Rechnung über Beamer-Miete', quelle: 'Rechnung_0326.pdf' },
      { id: 'u4', ungeprueft: true, titel: 'Rechnung Catering Gründungsnacht 2025', art: 'Sonstiges', wer: 'Julia', status: 'offen', mit: '–', tage: 300, naechster: '–', zuletzt: '28.11.2025', grund: 'Rechnung über 180 Gedecke', quelle: 'Rechnung_1125.pdf' },
      { id: 'u5', ungeprueft: true, titel: 'Gründungsnacht 2025', art: 'Event', wer: 'Julia', status: 'erledigt', mit: '–', tage: 300, naechster: '–', zuletzt: '21.11.2025', grund: 'Ablaufplan und 14 Mails zur Organisation', quelle: 'Netzlaufwerk' },
      { id: 'u6', ungeprueft: true, titel: 'Lernwerk – Nachhilfe-App', art: 'Beratung', wer: 'Mehmet', status: 'offen', mit: 'Lernwerk', tage: 330, naechster: '–', zuletzt: '04.11.2025', grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 04.11.2025' }
    ];
    return this.state.neue.concat(V);
  }
  aktuell() { var self = this; return this.daten().filter(function (v) { return v.id === self.state.sel; })[0]; }
  renderVals() {
    var self = this, st = this.state;
    var alle = this.daten().filter(function (v) { return self.wert(v.id, 'geprueft', '') !== 'weg'; });
    var q = st.suche.trim().toLowerCase();
    var pruef = st.filter === 'ungeprüft';
    var ungeprueftOffen = alle.filter(function (v) { return v.ungeprueft && !self.wert(v.id, 'geprueft', ''); });
    var sicht = alle.filter(function (v) {
      var s = self.wert(v.id, 'status', v.status), ung = v.ungeprueft && !self.wert(v.id, 'geprueft', '');
      if (pruef) return ung;
      if (st.filter === 'offen' && s !== 'offen') return false;
      if (st.filter === 'erledigt' && s !== 'erledigt') return false;
      if (st.filter === 'hängt' && !(s === 'offen' && v.tage >= 21 && !ung)) return false;
      if (ung) return false;
      return !q || (self.wert(v.id, 'titel', v.titel) + ' ' + v.mit + ' ' + v.art).toLowerCase().indexOf(q) >= 0;
    });
    var P = this.pruefVals(this.daten(), 118, 'Vorgänge');
    var berechnet = function (v) {
      var s = self.wert(v.id, 'status', v.status);
      if (s === 'erledigt') return '';
      if (v.tage >= 21) return 'hängt · seit ' + v.tage + ' T. nichts passiert';
      return v.wartet || '';
    };
    var zeilen = sicht.map(function (v) {
      var s = self.wert(v.id, 'status', v.status), b = berechnet(v);
      return { titel: self.wert(v.id, 'titel', v.titel), pruef: pruef, normal: !pruef,
        statusText: s === 'erledigt' ? 'erledigt' : (v.tage >= 21 ? 'hängt · ' + v.tage + ' T.' : (v.wartet ? 'wartet' : 'offen')),
        statusStil: s !== 'erledigt' && v.tage >= 21 ? 'color: var(--attention)' : '',
        titelStil: s === 'erledigt' ? 'color: var(--ink-muted)' : '',
        unter: self.wert(v.id, 'art', v.art) + ' · ' + self.wert(v.id, 'wer', v.wer) + ' · zuletzt ' + v.zuletzt + (pruef ? ' · ' + v.grund : ''),
        aktiv: v.id === st.sel ? 'true' : 'false',
        gewaehlt: P.pruefIstGewaehlt(v.id), waehlen: P.pruefWaehle(v.id),
        los: function () { self.setState({ sel: v.id, kcOffen: false }); } };
    });
    var v = this.aktuell();
    var d = {}, verlauf = [], system = [];
    if (v && self.wert(v.id, 'geprueft', '') !== 'weg') {
      var f = this.feld(v.id, v, 'Vorgang');
      var s = self.wert(v.id, 'status', v.status), b = berechnet(v), solaro = v.id === 'solaro';
      d = {
        titel: self.wert(v.id, 'titel', v.titel), art: self.wert(v.id, 'art', v.art), wer: self.wert(v.id, 'wer', v.wer), naechster: self.wert(v.id, 'naechster', v.naechster), mit: v.mit, f: f,
        status: s === 'erledigt' ? 'Erledigt' : 'Offen', offen: s !== 'erledigt',
        setStatus: function (w) { var neu = w === 'Erledigt' ? 'erledigt' : 'offen'; self.aendere([{ id: v.id, feld: 'status', wert: neu, basis: v.status }], 'Status: ' + neu); if (neu === 'erledigt') { var m = Object.assign({}, self.state.wieLief); m[v.id] = true; self.setState({ wieLief: m }); } },
        erledigt: function () { self.aendere([{ id: v.id, feld: 'status', wert: 'erledigt', basis: v.status }], 'Als erledigt markiert'); var m = Object.assign({}, self.state.wieLief); m[v.id] = true; self.setState({ wieLief: m }); },
        hatBerechnet: !!b, berechnet: b, berechnetStil: v.tage >= 21 ? 'color: var(--attention)' : '',
        andere: ['Andreas', 'Julia', 'Mehmet'].filter(function (n) { return n !== self.wert(v.id, 'wer', v.wer); }),
        uebergeben: function (e) { var n = e.target.value; if (!n) return; self.aendere([{ id: v.id, feld: 'wer', wert: n, basis: v.wer }, { id: v.id, feld: 'uebergeben', wert: true, basis: false }], 'Übergeben an ' + n + ' – ' + n + ' bekommt einen Kurzstand'); },
        wurdeUebergeben: !!self.wert(v.id, 'uebergeben', false),
        frageWieLief: !!st.wieLief[v.id] && s === 'erledigt',
        wieLiefText: st.wieLiefText, wieLiefTippen: function (e) { self.setState({ wieLiefText: e.target.value }); },
        wieLiefSkip: function () { var m = Object.assign({}, self.state.wieLief); m[v.id] = false; self.setState({ wieLief: m }); },
        wieLiefSpeichern: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.wieLiefText.trim(); if (!t) return; var m = Object.assign({}, self.state.wieLief); m[v.id] = false; self.setState({ wieLief: m, wieLiefText: '' }); self.aendere([{ id: v.id, feld: 'abschluss', wert: t, basis: '' }], 'Im Verlauf abgelegt'); },
        istUngeprueft: !!v.ungeprueft && !self.wert(v.id, 'geprueft', ''), grund: v.grund || '', quelle: v.quelle || '',
        uebernehmen: function () { self.aendere([{ id: v.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + v.titel); },
        verwerfen: function () { self.aendere([{ id: v.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + v.titel); },
        istSolaro: solaro, nichtSolaro: !solaro,
        hatZusagen: solaro,
        vonUns: [{ text: 'Feedback zum Finanzplan an Tom', faellig: 'heute', quelle: 'Mail 26.09.', status: 'offen' }, { text: 'Kontakt zu Frau Weber vermitteln', faellig: 'bis Fr 02.10.', quelle: 'Chat 30.09.', status: 'offen' }, { text: 'Pitch-Slot bestätigen (Julia)', faellig: 'bis 13.11.', quelle: 'aus Julias Mail 23.09.', status: 'offen' }],
        anUns: [{ text: 'Pitchdeck final inkl. Finanzteil', faellig: 'bis Fr 02.10.', quelle: 'Chat 30.09.', status: 'offen' }, { text: 'Finanzplan überarbeiten', faellig: 'bis 15.10.', quelle: 'Notiz 22.09.', status: 'offen' }],
        hatDateien: solaro,
        dateien: [{ name: 'Pitchdeck_Solaro_v1.pdf', datum: 'gestern', kurz: 'Zwölf Folien, Technik ausführlich, Finanzteil fehlt noch' }, { name: 'Finanzplan_Solaro_v2.xlsx', datum: '26.09.', kurz: '36 Monate, Break-even im Monat 28; ohne EXIST fehlen rund 9 Monate Finanzierung' }, { name: 'Beratungsprotokoll_22-09.docx', datum: '22.09.', kurz: 'Pitchdeck bis 29.09., Finanzplan bis 15.10., Kontakt IHK prüfen' }]
      };
      var mon = function (k) { var m = String(k).slice(4, 6); return m === '08' ? 'August 2026' : 'September 2026'; };
      var dat = function (k) { var x = String(k); return x.slice(6, 8) + '.' + x.slice(4, 6) + '.'; };
      var E = solaro ? [
        { id: 'm4', key: 202608211000, art: 'Mail', text: 'Erstkontakt über das Kontaktformular', quelle: 'Mail', herkunft: 'StartHub-Postfach' },
        { id: 'd2', key: 202608281500, art: 'Datei', text: 'Businessplan_Entwurf.pdf', quelle: 'Netzlaufwerk' },
        { id: 't1', key: 202609221000, art: 'Termin', text: 'Beratung mit Lisa Meier und Tom Kraus, 60 Min.', quelle: 'Kalender' },
        { id: 'jm', key: 202609231100, art: 'Mail', text: 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', privat: true },
        { id: 'm2', key: 202609241400, art: 'Mail', text: 'EXIST-Merkblatt an Lisa geschickt', quelle: 'Mail', herkunft: 'aus Outlook' },
        { id: 'p1', key: 202609241750, art: 'Notiz', text: 'Tom wirkt unter Druck wegen der Finanzierung', quelle: 'Chat', privat: true },
        { id: 'm1', key: 202609261000, art: 'Mail', text: 'Tom Kraus: Finanzplan v2 mit Bitte um Feedback', quelle: 'Mail', herkunft: 'Eingang' },
        { id: 'm5', key: 202609291740, art: 'Mail', text: 'Lisa Meier: Pitchdeck-Entwurf (ohne Finanzteil)', quelle: 'Mail', herkunft: 'Eingang' },
        { id: 'n1', key: 202609301432, art: 'Notiz', text: 'Beratung: Pitchdeck final bis Freitag; wir vermitteln Frau Weber.', quelle: 'Chat 14:32' },
        { id: 's1', key: 202609301433, art: 'System', text: 'Zusage Solaro aktualisiert: Pitchdeck final bis 02.10.' },
        { id: 's2', key: 202609301433, art: 'System', text: 'Erinnerung gesetzt für Fr 02.10., 17:00' },
        { id: 's3', key: 202609301434, art: 'System', text: 'Aufgabe angelegt: Kontakt zu Frau Weber vermitteln' }
      ] : [
        { id: 'g1', key: 202609151000, art: 'Mail', text: 'Letzte Mail zu „' + d.titel + '“', quelle: 'Mail', herkunft: 'Eingang' },
        { id: 'g2', key: 202609201000, art: 'Notiz', text: 'Stand festgehalten', quelle: self.wert(v.id, 'wer', v.wer) }
      ];
      if (self.wert(v.id, 'abschluss', '')) E.push({ id: 'ab', key: 202609301600, art: 'Notiz', text: 'Wie lief’s: ' + self.wert(v.id, 'abschluss', ''), quelle: 'Abschluss' });
      if (self.wert(v.id, 'status', v.status) !== v.status) E.push({ id: 'st', key: 202609301559, art: 'System', text: 'Status: ' + v.status + ' → ' + self.wert(v.id, 'status', v.status), rueckgaengig: false });
      if (self.wert(v.id, 'uebergeben', false)) E.push({ id: 'ue', key: 202609301558, art: 'System', text: 'Übergeben an ' + self.wert(v.id, 'wer', v.wer) + ' mit Kurzstand', rueckgaengig: false });
      E = E.filter(function (e) { return !self.wert(v.id, 'weg_' + e.id, false); }).sort(function (a, b) { return b.key - a.key; });
      system = E.filter(function (e) { return e.art === 'System'; });
      verlauf = (st.sysOffen ? E : E.filter(function (e) { return e.art !== 'System'; })).map(function (e) {
        return Object.assign({}, e, { monat: mon(e.key), datum: dat(e.key), onRueckgaengig: function () { self.aendere([{ id: v.id, feld: 'weg_' + e.id, wert: true, basis: false }], 'Systemschritt zurückgenommen'); } });
      });
    }
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    var cmd = function (c, arg) { return function () { try { document.execCommand(c, false, arg); } catch (e) {} }; };
    return Object.assign(this.kcVals(), this.toastVals(), P, {
      sidebarChats: this.kgChats(),
      zaehler: sicht.length + (pruef ? ' ungeprüft angezeigt' : ' Vorgänge'),
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      filter: [fl('offen', 'offen'), fl('hängt', 'hängt'), fl('erledigt', 'erledigt'), fl('alle', 'alle'), fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft')],
      pruefModus: pruef,
      zeigeHinweisUngeprueft: !pruef && ungeprueftOffen.length > 0, ungeprueftGesamt: P.pruefGesamt,
      zuUngeprueft: function () { self.setState({ filter: 'ungeprüft' }); },
      zeilen: zeilen, keine: zeilen.length === 0,
      hatMehr: pruef && P.pruefGesamt > zeilen.length, mehrText: zeilen.length + ' von ' + P.pruefGesamt + ' angezeigt · „alle ' + P.pruefGesamt + '“ oben wählt auch die übrigen',
      neu: function () { var id = 'n' + Date.now(); self.setState({ neue: [{ id: id, titel: 'Neuer Vorgang', art: 'Beratung', wer: 'Andreas', status: 'offen', mit: '–', tage: 0, naechster: '', zuletzt: 'gerade' }].concat(self.state.neue), sel: id, filter: 'offen' }); self.aendere([], 'Vorgang angelegt – Titel oben ändern', true); },
      hatDetail: !!d.titel, keinDetail: !d.titel, d: d,
      arten: ['Beratung', 'Event', 'Beitrag', 'Lehre', 'Sonstiges'], personen: ['Andreas', 'Julia', 'Mehmet'], statusOptionen: ['Offen', 'Erledigt'],
      notizStatus: st.notizZeit ? '✓ gespeichert ' + st.notizZeit + ' · ⌘Z macht rückgängig' : 'Überschriften, Listen, Fett',
      notizGetippt: function () { self.setState({ notizZeit: 'gerade eben' }); },
      halten: function (e) { e.preventDefault(); },
      fmtH: cmd('formatBlock', 'h3'), fmtListe: cmd('insertUnorderedList'), fmtFett: cmd('bold'), fmtText: cmd('formatBlock', 'p'),
      hatSystem: system.length > 0,
      sysZeile: system.length + (system.length === 1 ? ' Systemschritt' : ' Systemschritte') + (st.sysOffen ? ' · ausblenden' : ' · anzeigen'),
      sysKurz: st.sysOffen ? '' : system.slice(0, 3).map(function (e) { return e.text.split(':')[0]; }).join(', '),
      sysToggle: function () { self.setState({ sysOffen: !self.state.sysOffen }); },
      verlauf: verlauf
    });
  }
}
