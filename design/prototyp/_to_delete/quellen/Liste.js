class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { art: 'Alle', status: 'Offen + wartet', wer: 'Alle', haengt: 'Alle', sucht: false, antwort: false };
  }
  renderVals() {
    var self = this, st = this.state;
    var daten = [
      { titel: 'Solaro – EXIST-Antrag', art: 'beratung', wer: 'Andreas', status: 'Wartet', naechster: 'wartet auf Pitchdeck (bis 02.10.)', zuletzt: '30.09.', tage: 0, link: true },
      { titel: 'Kitchen Loop – Mensa-Kooperation', art: 'beratung', wer: 'Julia', status: 'Offen', naechster: 'Rückmeldung Studierendenwerk', zuletzt: '30.09.', tage: 0 },
      { titel: 'Gründungsnacht 20.11.', art: 'event', wer: 'Julia', status: 'Offen', naechster: 'Save-the-Date heute', zuletzt: '29.09.', tage: 1 },
      { titel: 'Pitch-Abend', art: 'event', wer: 'Julia', status: 'Wartet', naechster: 'wartet auf Antwort Frau Weber', zuletzt: '21.09.', tage: 9 },
      { titel: 'Instagram: Pitch-Abend ankündigen', art: 'beitrag', wer: 'Mehmet', status: 'Offen', naechster: 'Freigabe bis 17:00', zuletzt: '29.09.', tage: 1 },
      { titel: 'Entrepreneurship Basics WS 26/27', art: 'lehre', wer: 'Andreas', status: 'Offen', naechster: 'Raum für Sitzung 3', zuletzt: '28.09.', tage: 2 },
      { titel: 'Anfrage Stadtwerke: Kooperation', art: 'sonstiges', wer: 'Andreas', status: 'Offen', naechster: 'Termin vorschlagen', zuletzt: '29.09.', tage: 1 },
      { titel: 'Nordlicht Analytics – Erstberatung', art: 'beratung', wer: 'Andreas', status: 'Offen', naechster: 'Folgetermin vereinbaren', zuletzt: '07.09.', tage: 23 },
      { titel: 'Rückblick Sommerfest', art: 'beitrag', wer: 'Mehmet', status: 'Offen', naechster: 'Entwurf fertigstellen', zuletzt: '05.09.', tage: 25 },
      { titel: 'Förderantrag Kitchen Loop', art: 'beratung', wer: 'Mehmet', status: 'Wartet', naechster: 'wartet auf Bescheid (seit 25 T.)', zuletzt: '05.09.', tage: 25 },
      { titel: 'Kitchen Loop – Förderberatung', art: 'beratung', wer: 'Mehmet', status: 'Erledigt', naechster: '–', zuletzt: '02.09.', tage: 28 },
      { titel: 'Beitrag „Startup der Woche“: Solaro', art: 'beitrag', wer: 'Mehmet', status: 'Erledigt', naechster: '–', zuletzt: '09.09.', tage: 21 }
    ];
    var ARTEN = { Beratung: 'beratung', Event: 'event', Beitrag: 'beitrag', Lehre: 'lehre', Sonstiges: 'sonstiges' };
    var gruppe = function (key, label, opts) {
      return { label: label, optionen: opts.map(function (o) {
        return { label: o, gedrueckt: st[key] === o ? 'true' : 'false', waehlen: function () { var p = {}; p[key] = o; self.setState(p); } };
      }) };
    };
    var liste = daten.filter(function (v) {
      return (st.art === 'Alle' || v.art === ARTEN[st.art]) && (st.status === 'Alle' || (st.status === 'Offen + wartet' ? v.status !== 'Erledigt' : v.status === st.status)) && (st.haengt === 'Alle' || (v.tage >= 21 && v.status !== 'Erledigt')) && (st.wer === 'Alle' || v.wer === st.wer);
    }).map(function (v) {
      return Object.assign({}, v, { link: !!v.link, keinLink: !v.link, haengt: v.tage >= 21 && v.status !== 'Erledigt', haengtText: '= hängt · ' + v.tage + ' T.', statusText: v.status.toLowerCase(), stil: v.status === 'Erledigt' ? 'color: var(--ink-muted)' : '' });
    });
    return {
      sidebarChats: this.kgChats(),
      filtergruppen: [
        gruppe('art', 'Art', ['Alle', 'Beratung', 'Event', 'Beitrag', 'Lehre', 'Sonstiges']),
        gruppe('status', 'Status', ['Offen + wartet', 'Offen', 'Wartet', 'Erledigt', 'Alle']),
        gruppe('haengt', 'Hängt', ['Alle', 'nur hängende']),
        gruppe('wer', 'Zuständig', ['Alle', 'Andreas', 'Julia', 'Mehmet'])
      ],
      vorgaenge: liste,
      anzahl: liste.length + (liste.length === 1 ? ' Vorgang' : ' Vorgänge'),
      leer: liste.length === 0,
      sucht: st.sucht,
      antwort: st.antwort,
      fragen: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        self.setState({ sucht: true, antwort: false });
        setTimeout(function () { self.setState({ sucht: false, antwort: true }); }, 900);
      },
      antwortZu: function () { self.setState({ antwort: false }); }
    };
  }
}
