class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign({ merge: 'zu', wahl: null }, this.kcState());
  }
  kcCfg() {
    return { name: 'Lisa Meier', anzahl: '11 Mails, 2 Vorgänge', platzhalter: 'Frag oder notiere etwas zu Lisa Meier',
      antwort: 'Lisa hat zuletzt heute in der Beratung zugesagt, das Pitchdeck bis Freitag zu schicken. Offen von unserer Seite ist der Kontakt zu Frau Weber.',
      belege: [{ art: 'belegt', text: 'Pitchdeck bis Fr 02.10.', quelle: 'Chat 30.09.' }, { art: 'belegt', text: 'Kontakt Frau Weber zugesagt', quelle: 'Chat 30.09.' }],
      luecke: 'Wie Lisa zu Terminen am Wochenende steht, kann ich aus ihren Mails nicht sagen.' };
  }
  renderVals() {
    var self = this, st = this.state;
    var kandidaten = [
      { name: 'L. Meier', adresse: 'l.meier@solaro-energy.de', umfang: '2 Termine, 1 Mail', grund: 'gleicher Nachname, Domain ähnlich wie Solaro' },
      { name: 'Lisa Meyer', adresse: 'lisa.meyer@student.uni-augsburg.de', umfang: '1 Mail', grund: 'eher eine andere Person – andere Schreibweise, Studierendenadresse' }
    ];
    var adressen = [
      { adresse: 'lisa@solaro.de', herkunft: 'aus 7 Mails', rolle: 'Hauptadresse' },
      { adresse: 'l.meier@gmx.de', herkunft: 'aus 1 Mail · bestätigt 30.09.', rolle: 'privat genutzt' },
      { adresse: 'lisa.meier@uni-augsburg.de', herkunft: 'aus Kalender · 2 Termine', rolle: '' }
    ];
    if (st.merge === 'fertig' && st.wahl) adressen.push({ adresse: st.wahl.adresse, herkunft: 'übernommen von „' + st.wahl.name + '“', rolle: 'neu' });
    var verlauf = [
      { monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: 'EXIST-Antrag · Beratung, Pitchdeck bis Freitag', quelle: 'Chat' },
      { monat: 'September 2026', datum: '28.09.', art: 'Mail', text: 'EXIST-Antrag · Rückfrage zum Pitchdeck-Format', quelle: 'Mail', herkunft: 'über Kollege' },
      { monat: 'September 2026', datum: '28.09.', art: 'Mail', text: 'Lisa (gmx): Kurze Frage zum Termin', quelle: 'Mail', herkunft: 'Eingang' },
      { monat: 'September 2026', datum: '24.09.', art: 'Mail', text: 'EXIST-Antrag · Merkblatt an Lisa', quelle: 'Mail', herkunft: 'aus Outlook' },
      { monat: 'September 2026', datum: '21.09.', art: 'Mail', text: 'Mail von Julia an Lisa Meier · Inhalt nur für Julia', privat: true },
      { monat: 'September 2026', datum: '12.09.', art: 'Mail', text: 'EXIST-Antrag · Fragen zum Gründungsstipendium', quelle: 'Mail', herkunft: 'Eingang' }
    ];
    (st.kcNotizen || []).slice().reverse().forEach(function (n) { verlauf.unshift({ monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: n.text, quelle: 'Chat', privat: n.privat }); });
    return Object.assign(this.kcVals(), {
      mergeAuf: function () { self.setState({ merge: 'suche' }); },
      mergeZu: function () { self.setState({ merge: 'zu', wahl: null }); },
      mSuche: st.merge === 'suche',
      mVorschau: st.merge === 'vorschau',
      mFertig: st.merge === 'fertig',
      kandidaten: kandidaten.map(function (k) { return Object.assign({}, k, { waehlen: function () { self.setState({ merge: 'vorschau', wahl: k }); } }); }),
      wahl: st.wahl || {},
      mergeLos: function () { self.setState({ merge: 'fertig' }); },
      mergeRueck: function () { self.setState({ merge: 'zu', wahl: null }); },
      mPunkte: st.wahl ? ['„' + st.wahl.name + '“ in Lisa Meier übernommen', 'Adresse ' + st.wahl.adresse + ' hinzugefügt', st.wahl.umfang + ' jetzt bei Lisa'] : [],
      adressen: adressen,
      adressAnzahl: adressen.length,
      verlauf: verlauf
    });
  }
}
