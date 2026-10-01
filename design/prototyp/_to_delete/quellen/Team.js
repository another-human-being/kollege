class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign({ filter: 'Alle' }, this.kcState());
  }
  kcCfg() {
    return { name: 'Solaro', anzahl: '3 Vorgänge, 9 Mails', platzhalter: 'Frag oder notiere etwas zu Solaro',
      antwort: 'Solaro arbeitet am EXIST-Antrag (Andreas) und pitcht am 19.11. beim Pitch-Abend (Julia). Offen sind 5 Zusagen, eine davon heute fällig.',
      belege: [{ art: 'belegt', text: 'Finanzplan-Feedback bis Mitte der Woche', quelle: 'Mail 26.09.' }, { art: 'berechnet', text: '1 Zusage heute fällig', dringend: true }],
      luecke: 'Wie es Solaro finanziell geht, kann ich aus den Unterlagen nicht einschätzen.' };
  }
  renderVals() {
    var self = this;
    var alle = [
      { monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: 'EXIST-Antrag · Beratung: Pitchdeck bis Freitag, Kontakt Frau Weber', quelle: 'Eingabe', typ: 'Notizen' },
      { monat: 'September 2026', datum: '26.09.', art: 'Mail', text: 'EXIST-Antrag · Tom Kraus: Finanzplan v2', quelle: 'Mail', herkunft: 'Eingang', typ: 'Mails' },
      { monat: 'September 2026', datum: '24.09.', art: 'Notiz', text: 'Tom wirkt unter Druck wegen der Finanzierung', quelle: 'Chat', privat: true, typ: 'Notizen' },
      { monat: 'September 2026', datum: '24.09.', art: 'Mail', text: 'EXIST-Antrag · Merkblatt an Lisa', quelle: 'Mail', herkunft: 'aus Outlook', typ: 'Mails' },
      { monat: 'September 2026', datum: '22.09.', art: 'Termin', text: 'EXIST-Antrag · Beratung, 60 Min.', quelle: 'Kalender', typ: 'Termine' },
      { monat: 'September 2026', datum: '21.09.', art: 'Mail', text: 'Mail von Julia an Lisa Meier · Inhalt nur für Julia', privat: true, typ: 'Mails' },
      { monat: 'September 2026', datum: '12.09.', art: 'Mail', text: 'EXIST-Antrag · Lisa: Fragen zum Gründungsstipendium', quelle: 'Mail', typ: 'Mails' },
      { monat: 'September 2026', datum: '09.09.', art: 'Datei', text: '„Startup der Woche“ · Beitrag veröffentlicht', quelle: 'Instagram', typ: 'Notizen' },
      { monat: 'August 2026', datum: '28.08.', art: 'Datei', text: 'EXIST-Antrag · Businessplan_Entwurf.pdf', quelle: 'Ablage', typ: 'Notizen' },
      { monat: 'August 2026', datum: '21.08.', art: 'Mail', text: 'Erstkontakt über das Kontaktformular', quelle: 'Mail', typ: 'Mails' }
    ];
    var f = this.state.filter;
    (this.state.kcNotizen || []).slice().reverse().forEach(function (n) { alle.unshift({ monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: n.text, quelle: 'Chat', privat: n.privat, typ: 'Notizen' }); });
    return Object.assign(this.kcVals(), {
      filter: f,
      filterOptionen: ['Alle', 'Mails', 'Termine', 'Notizen'],
      setFilter: function (w) { self.setState({ filter: w }); },
      verlauf: alle.filter(function (e) { return f === 'Alle' || e.typ === f; })
    });
  }
}
