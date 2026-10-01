class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign({ zustaendig: 'Andreas', offen: false, uebergeben: false, systemWeg: {}, status: 'Wartet', abschluss: 'zu', abschlussText: '', sysOffen: false, ereignisse: [] }, this.kcState());
  }
  kcCfg() {
    return { name: 'Solaro – EXIST-Antrag', anzahl: '15 Einträge, 5 Zusagen', platzhalter: 'Frag oder notiere etwas zu diesem Vorgang',
      antwort: 'Stand heute: Solaro schickt das Pitchdeck bis Freitag, danach stellen wir den Kontakt zu Frau Weber her. Eingereicht werden soll am 30.10.',
      belege: [{ art: 'belegt', text: 'Pitchdeck bis Fr 02.10. zugesagt', quelle: 'Chat 30.09.' }, { art: 'berechnet', text: 'Einreichung in 30 Tagen' }, { art: 'einschaetzung', text: 'knapp, aber machbar, wenn das Pitchdeck diese Woche kommt' }],
      luecke: 'Wie hoch die Bewilligungschance ist, kann ich aus zwei Anträgen nicht ableiten.' };
  }
  ereignis(e) { this.setState({ ereignisse: this.state.ereignisse.concat([Object.assign({ key: 202609301500 + this.state.ereignisse.length, id: 'e' + Date.now() + Math.random() }, e)]) }); }
  setStatus(w) {
    var alt = this.state.status;
    if (w === alt) return;
    this.setState({ status: w, abschluss: w === 'Erledigt' ? 'frage' : 'zu' });
    this.ereignis({ art: 'System', text: 'Status: ' + alt.toLowerCase() + ' → ' + w.toLowerCase() });
  }
  renderVals() {
    var self = this, st = this.state;
    var weg = function (id) { var m = Object.assign({}, self.state.systemWeg); m[id] = true; self.setState({ systemWeg: m }); };
    var monat = function (k) { return String(k).slice(4, 6) === '08' ? 'August 2026' : 'September 2026'; };
    var datum = function (k) { var s = String(k); return s.slice(6, 8) + '.' + s.slice(4, 6) + '.'; };
    var alle = [
      { id: 'm4', key: 202608211000, art: 'Mail', text: 'Erstkontakt über das Kontaktformular', quelle: 'Mail', herkunft: 'Team-Postfach' },
      { id: 'd2', key: 202608281500, art: 'Datei', text: 'Businessplan_Entwurf.pdf', quelle: 'Netzlaufwerk' },
      { id: 'm3', key: 202609120900, art: 'Mail', text: 'Lisa Meier: Fragen zum EXIST-Gründungsstipendium', quelle: 'Mail', herkunft: 'Eingang' },
      { id: 't1', key: 202609221000, art: 'Termin', text: 'Beratung mit Lisa Meier und Tom Kraus, 60 Min.', quelle: 'Kalender' },
      { id: 'jm', key: 202609231100, art: 'Mail', text: 'Mail von Julia an Tom Kraus · Inhalt nur für Julia', privat: true },
      { id: 'm2', key: 202609241400, art: 'Mail', text: 'EXIST-Merkblatt an Lisa geschickt', quelle: 'Mail', herkunft: 'aus Outlook' },
      { id: 'p1', key: 202609241750, art: 'Notiz', text: 'Tom wirkt unter Druck wegen der Finanzierung', quelle: 'Chat', privat: true },
      { id: 'm1', key: 202609261000, art: 'Mail', text: 'Tom Kraus: Finanzplan v2 mit Bitte um Feedback', quelle: 'Mail', herkunft: 'Eingang' },
      { id: 'd1', key: 202609261001, art: 'Datei', text: 'Finanzplan_Solaro_v2.xlsx', quelle: 'Anhang' },
      { id: 'm0', key: 202609280900, art: 'Mail', text: 'An Lisa: Rückfrage zum Pitchdeck-Format', quelle: 'Mail', herkunft: 'über Kollege' },
      { id: 'n1', key: 202609301432, art: 'Notiz', text: 'Beratung: Pitchdeck bis Freitag; wir vermitteln Frau Weber.', quelle: 'Chat 14:32' },
      { id: 's1', key: 202609301433, art: 'System', text: 'Zusage Solaro aktualisiert: Pitchdeck bis 02.10.' },
      { id: 's2', key: 202609301433, art: 'System', text: 'Erinnerung gesetzt für Fr 02.10., 17:00' },
      { id: 's3', key: 202609301434, art: 'System', text: 'Aufgabe angelegt: Kontakt zu Frau Weber vermitteln' }
    ];
    (st.kcNotizen || []).slice().reverse().forEach(function (n, i) { alle.push({ id: 'kc' + i, key: 202609301450 + i, art: 'Notiz', text: n.text, quelle: 'Chat', privat: n.privat }); });
    alle = alle.concat(st.ereignisse);
    alle = alle.filter(function (e) { return !st.systemWeg[e.id]; }).sort(function (a, b) { return b.key - a.key; });
    var system = alle.filter(function (e) { return e.art === 'System'; });
    var sichtbar = st.sysOffen ? alle : alle.filter(function (e) { return e.art !== 'System'; });
    var verlauf = sichtbar.map(function (e) {
      return Object.assign({}, e, { monat: monat(e.key), datum: datum(e.key), onRueckgaengig: function () { weg(e.id); } });
    });
    var erledigt = st.status === 'Erledigt';
    return Object.assign(this.kcVals(), {
      zustaendig: st.zustaendig,
      statusOptionen: ['Offen', 'Wartet', 'Erledigt'],
      statusWert: st.status,
      setStatus: function (w) { self.setStatus(w); },
      nichtErledigt: !erledigt,
      alsErledigt: function () { self.setStatus('Erledigt'); },
      statusZeile: erledigt ? 'erledigt heute' : (st.status === 'Wartet' ? 'wartet auf Solaro (Pitchdeck)' : 'offen'),
      haengtZeile: erledigt ? '' : '= letzte Bewegung heute · würde ab 21.10. als „hängt“ gelten',
      zeigeFrage: st.abschluss === 'frage',
      zeigeGespeichert: st.abschluss === 'gespeichert',
      abschlussText: st.abschlussText,
      abschlussTippen: function (e) { self.setState({ abschlussText: e.target.value }); },
      abschlussSpeichern: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var t = self.state.abschlussText.trim(); if (!t) return;
        self.setState({ abschluss: 'gespeichert' });
        self.ereignis({ art: 'Notiz', text: 'Wie lief’s: ' + t, quelle: 'Abschluss', abschluss: true });
      },
      abschlussSkip: function () { self.setState({ abschluss: 'zu' }); },
      abschlussRueck: function () { self.setState({ abschluss: 'frage', ereignisse: self.state.ereignisse.filter(function (e) { return !e.abschluss; }) }); },
      sysAnzahl: system.length,
      hatSystem: system.length > 0,
      sysZeile: system.length + (system.length === 1 ? ' Systemschritt' : ' Systemschritte') + (st.sysOffen ? ' · ausblenden' : ' · anzeigen'),
      sysKurz: st.sysOffen ? '' : system.slice(0, 3).map(function (e) { return e.text.split(':')[0]; }).join(', '),
      sysToggle: function () { self.setState({ sysOffen: !self.state.sysOffen }); },
      uebergabeOffen: st.offen,
      uebergeben: st.uebergeben,
      uebergabeToggle: function () { self.setState({ offen: !self.state.offen }); },
      personen: ['Julia', 'Mehmet'].map(function (n) {
        return { name: n, waehlen: function () {
          self.setState({ zustaendig: n, offen: false, uebergeben: true });
          self.ereignis({ art: 'System', text: 'Übergeben an ' + n + ' mit Kurzstand' });
        } };
      }),
      rueckgabe: function () { self.setState({ zustaendig: 'Andreas', uebergeben: false, ereignisse: self.state.ereignisse.filter(function (e) { return e.text.indexOf('Übergeben an') !== 0; }) }); },
      verlauf: verlauf
    });
  }
}
