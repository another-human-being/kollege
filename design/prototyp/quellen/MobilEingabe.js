class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { msgs: [], laden: false, stream: null, gesendet: false, antwort: null };
  }
  senden(text) {
    var self = this;
    this.setState({ msgs: this.state.msgs.concat([{ typ: 'du', text: text }]), laden: true });
    var voll = 'Verstanden: Beratung mit Solaro zum EXIST-Antrag. Pitchdeck bis Freitag, 02.10.';
    var rest = [
      { typ: 'karte', punkte: ['Zusage bei Solaro aktualisiert: Pitchdeck final bis Fr 02.10.', 'Aufgabe für dich: Kontakt zu Frau Weber vermitteln'], folgen: 'entfernt auch 1 Erinnerung' },
      { typ: 'klaerung' },
      { typ: 'entwurf' }
    ];
    self.vollText = voll;
    setTimeout(function () {
      self.setState({ laden: false, stream: { n: 0 } });
      var t = setInterval(function () {
        var s = self.state.stream; if (!s) { clearInterval(t); return; }
        var n = Math.min(voll.length, s.n + 4);
        if (n >= voll.length) { clearInterval(t); self.setState({ stream: null, msgs: self.state.msgs.concat([{ typ: 'kollege', text: voll }], rest) }); }
        else self.setState({ stream: { n: n } });
      }, 30);
    }, 900);
  }
  renderVals() {
    var self = this, st = this.state;
    var msgs = st.msgs.slice();
    if (st.stream) msgs.push({ typ: 'kollege', text: (this.vollText || '').slice(0, st.stream.n), streamt: true });
    return {
      titel: st.msgs.length ? 'Beratung Solaro' : 'Neuer Chat',
      leer: st.msgs.length === 0,
      laden: st.laden,
      antworten: ['Ja', 'Andere Person', 'Neu anlegen'],
      beantworten: function (a) { self.setState({ antwort: a }); },
      zuruecknehmen: function () { self.setState({ antwort: null }); },
      wartet: !st.antwort || st.antwort === 'Neu anlegen',
      gesperrtText: st.antwort === 'Neu anlegen' ? 'Wartet, bis „Frau Weber“ als Kontakt angelegt ist.' : 'Wartet auf deine Antwort oben.',
      neuAnlegen: st.antwort === 'Neu anlegen',
      startText: 'Gerade Beratung mit Solaro gehabt, sie schicken bis Freitag das Pitchdeck, wir vermitteln Kontakt zu Frau Weber.',
      senden: function (t) { self.senden(t); },
      nachrichten: msgs.map(function (m) {
        return Object.assign({ punkte: [], folgen: '', streamt: false }, m, {
          istDu: m.typ === 'du', istKollege: m.typ === 'kollege', istKarte: m.typ === 'karte', istAussage: m.typ === 'aussage',
          istKlaerung: m.typ === 'klaerung', istEntwurf: m.typ === 'entwurf' && !st.gesendet && st.antwort !== 'Andere Person', istEntfallen: m.typ === 'entwurf' && st.antwort === 'Andere Person', istGesendet: m.typ === 'entwurf' && st.gesendet,
          gesendetPunkte: ['Mail an Anna Weber über dein Postfach gesendet', 'Zusage „Kontakt zu Frau Weber vermitteln“ als erledigt markiert'],
          senden: function () { self.setState({ gesendet: !self.state.gesendet }); }
        });
      })
    };
  }
}
