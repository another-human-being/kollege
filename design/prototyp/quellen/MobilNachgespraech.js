class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { msgs: [], laden: false, stream: null, gesendet: false };
  }
  senden(text) {
    var self = this;
    this.setState({ msgs: this.state.msgs.concat([{ typ: 'du', text: text }]), laden: true });
    var voll = 'Danke. Ich lege das bei Kitchen Loop ab: Ben klärt die Hygieneschulung bis 15.10., du fragst beim Studierendenwerk nach dem Pilotstart.';
    var rest = [
      { typ: 'karte', punkte: ['Beratung vom 30.09. in der Beratungsakte von Kitchen Loop abgelegt', 'Zusage Kitchen Loop: Hygieneschulung bis 15.10.', 'Aufgabe für dich: Studierendenwerk zum Pilotstart fragen'], folgen: 'entfernt auch 1 Aufgabe' },
      { typ: 'aussage', text: 'der Pilot kann vermutlich erst im November starten' }
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
      titel: 'Beratung Kitchen Loop',
      leer: st.msgs.length === 0,
      laden: st.laden,
      startText: 'Hygieneschulung klärt Ben bis 15.10., ich frag beim Studierendenwerk nach dem Pilotstart.',
      senden: function (t) { self.senden(t); },
      nachrichten: msgs.map(function (m) {
        return Object.assign({ punkte: [], folgen: '', streamt: false }, m, {
          istDu: m.typ === 'du', istKollege: m.typ === 'kollege', istKarte: m.typ === 'karte', istAussage: m.typ === 'aussage',
          istEntwurf: m.typ === 'entwurf' && !st.gesendet, istGesendet: m.typ === 'entwurf' && st.gesendet,
          gesendetPunkte: ['Mail an Anna Weber über dein Postfach gesendet'],
          senden: function () { self.setState({ gesendet: !self.state.gesendet }); }
        });
      })
    };
  }
}
