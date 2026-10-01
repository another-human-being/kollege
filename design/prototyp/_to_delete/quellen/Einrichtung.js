class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { q: { mail: false, kal: false, team: true, netz: true }, julia: 'eingeladen', mehmet: 'offen', neue: [], einladText: '', import: 'bereit', teile: [] };
  }
  componentWillUnmount() { clearInterval(this.timer); }
  starten() {
    var self = this;
    this.setState({ import: 'laeuft', teile: [{ text: 'Mails (Postfächer + Team-Postfach)', wert: 0, max: 5640 }, { text: 'Termine', wert: 0, max: 760 }, { text: 'Dateien auf dem Netzlaufwerk', wert: 0, max: 1240 }] });
    clearInterval(this.timer);
    this.timer = setInterval(function () {
      var t = self.state.teile.map(function (x) { return Object.assign({}, x, { wert: Math.min(x.max, x.wert + Math.ceil(x.max / 45)) }); });
      var done = t.every(function (x) { return x.wert >= x.max; });
      self.setState({ teile: t, import: done ? 'fertig' : 'laeuft' });
      if (done) clearInterval(self.timer);
    }, 120);
  }
  renderVals() {
    var self = this, st = this.state;
    var set = function (k, v) { var q = Object.assign({}, self.state.q); q[k] = v; self.setState({ q: q }); };
    var Q = [
      { id: 'mail', name: 'Mail', fuer: 'nur du', konto: 'andreas@gruendung.uni-augsburg.de · Eingang + Gesendet', statusText: 'verbunden' },
      { id: 'kal', name: 'Kalender', fuer: 'nur du', konto: 'Outlook · persönlich + Teamkalender', statusText: 'verbunden' },
      { id: 'team', name: 'Team-Postfach', fuer: 'für alle sichtbar', konto: 'starthub@uni-augsburg.de · Eingang + Gesendet', statusText: 'verbunden (von Julia eingerichtet)' },
      { id: 'netz', name: 'Netzlaufwerk', fuer: 'Team', konto: '\\\\fs.uni-augsburg.de\\gruendung', statusText: 'verbunden über Rechner im Uni-Netz · zuletzt 10:42' }
    ];
    var n = Q.filter(function (q) { return st.q[q.id]; }).length;
    var eigene = st.q.mail;
    var zeile = function (name, state) {
      var ok = state === 'fertig';
      return { name: name, post: ok ? '✓ verbunden' : (state === 'eingeladen' ? 'fehlt – Einladung offen seit 2 T.' : 'fehlt – noch nicht eingeladen'), kal: ok ? '✓ verbunden' : 'fehlt',
        postKlasse: ok ? 'ok' : 'fehlt', kalKlasse: ok ? 'ok' : 'fehlt', hatAktion: !ok, aktionText: state === 'eingeladen' ? 'Erinnern' : 'Einladen',
        aktion: function () { var s = {}; s[name.toLowerCase()] = state === 'eingeladen' ? 'fertig' : 'eingeladen'; self.setState(s); } };
    };
    var team = [
      { name: 'Andreas (du)', post: eigene ? '✓ verbunden' : 'fehlt – Schritt 1', kal: st.q.kal ? '✓ verbunden' : 'fehlt – Schritt 1', postKlasse: eigene ? 'ok' : 'fehlt', kalKlasse: st.q.kal ? 'ok' : 'fehlt', hatAktion: false, aktionText: '', aktion: function () {} },
      zeile('Julia', st.julia), zeile('Mehmet', st.mehmet)
    ].concat(st.neue.map(function (a) { return { name: a, post: 'fehlt – eingeladen gerade eben', kal: 'fehlt', postKlasse: 'fehlt', kalKlasse: 'fehlt', hatAktion: false, aktionText: '', aktion: function () {} }; }));
    return {
      sidebarChats: this.kgChats(),
      verbundenZeile: n + ' von 4 verbunden',
      quellen: Q.map(function (q) { var an = !!st.q[q.id]; return Object.assign({}, q, { aus: !an, fertig: an, verbinden: function () { set(q.id, true); }, trennen: function () { set(q.id, false); } }); }),
      team: team,
      einladText: st.einladText,
      einladTippen: function (e) { self.setState({ einladText: e.target.value }); },
      einladen: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = self.state.einladText.trim(); if (!t) return; self.setState({ neue: self.state.neue.concat([t]), einladText: '' }); },
      importKlasse: 'kg-abschnitt' + (eigene ? '' : ' schritt--aus'),
      importBereit: st.import === 'bereit',
      importGesperrt: !eigene,
      importHinweis: eigene ? 'Liest die letzten 12 Monate aller verbundenen Quellen. Fehlende Personen werden nachgeholt, sobald sie verbunden sind.' : 'Erst dein Postfach verbinden (Schritt 1).',
      importStart: function () { self.starten(); },
      importLaeuft: st.import === 'laeuft',
      teile: st.teile,
      fertig: st.import === 'fertig', nichtFertig: st.import !== 'fertig',
      abschlussKlasse: 'kg-abschnitt' + (st.import === 'fertig' ? '' : ' schritt--aus')
    };
  }
}
