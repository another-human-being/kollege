class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { herkunft: 'aus Import', gruppierung: 'Art', offen: { sonst: true }, gGewaehlt: {}, iGewaehlt: {}, gStatus: {}, iStatus: {}, warumAuf: false, warum: '', karte: null };
  }
  gruppenDaten() {
    var I = function (id, titel, grund, quelle, imp) { return { id: id, titel: titel, grund: grund, quelle: quelle, import: imp !== false, herkunft: imp === false ? 'laufender Betrieb' : 'aus Import' }; };
    if (this.state.gruppierung === 'Art') return [
      { id: 'sonst', titel: 'Vorgänge · Sonstiges', imp: 61, lauf: 1, hinweis: 'davon 54 Rechnungen', items: [
        I('s1', 'Rechnung Raumtechnik 03/2026', 'Rechnung über Beamer-Miete', 'Rechnung_0326.pdf'), I('s2', 'Rechnung Catering Gründungsnacht 2025', 'Rechnung über 180 Gedecke', 'Rechnung_1125.pdf'),
        I('s3', 'Kitchen Loop – Catering-Rechnung', 'Rechnung über Catering am 19.09.', 'Rechnung_0923.pdf', false), I('s4', 'Newsletter IHK Oktober', 'Rundmail ohne Bezug zu einem Team', 'Mail 02.10.2025')] },
      { id: 'bera', titel: 'Vorgänge · Beratung', imp: 38, lauf: 1, items: [
        I('b1', 'Greenbyte – Erstberatung', '„Wir würden gern einen Beratungstermin vereinbaren“', 'Mail 29.09.', false), I('b2', 'VoltBox – Beratung Finanzierung', 'Zwei Termine im März, Protokoll auf dem Netzlaufwerk', 'Termin 12.03.'),
        I('b3', 'Lernwerk – Gründungsidee Nachhilfe-App', 'Anfrage über das Team-Postfach', 'Mail 04.11.2025')] },
      { id: 'event', titel: 'Vorgänge · Event', imp: 12, lauf: 0, items: [
        I('e1', 'Gründungsnacht 2025', 'Ablaufplan und 14 Mails zur Organisation', 'Netzlaufwerk'), I('e2', 'Workshop „Pitch-Training“ mit Felix Neumann', 'Terminabsprache für Juli', 'Mail 03.08.')] },
      { id: 'lehre', titel: 'Vorgänge · Lehre', imp: 9, lauf: 0, items: [
        I('l1', 'Entrepreneurship Basics – Gastvortrag Dr. Albrecht', '„Gerne halte ich einen Gastvortrag“', 'Mail 11.08.')] },
      { id: 'beitrag', titel: 'Vorgänge · Beitrag', imp: 6, lauf: 1, items: [
        I('t1', 'Beitrag: Gründerinnen-Porträt Lisa Meier', 'Mehmet: „Lisa wäre super fürs Porträt“', 'Notiz 15.09.', false)] },
      { id: 'pers', titel: 'Personen', imp: 88, lauf: 2, items: [
        I('p1', 'Nora Kim (Greenbyte)', 'Signatur „Gründerin, Greenbyte“', 'Mail 29.09.', false), I('p2', 'Sven Ott (Kitchen Loop Catering)', 'Absender der Rechnung', 'Rechnung_0923.pdf', false),
        I('p3', 'Dr. Jana Roth (Stadtsparkasse)', 'Ansprechpartnerin Gründungskredit, 3 Mails', 'Mail 17.01.')] }
    ];
    return [
      { id: 'grt', titel: 'Gründungsteams', imp: 94, lauf: 3, items: [I('b1', 'Greenbyte – Erstberatung', '„Wir würden gern einen Beratungstermin vereinbaren“', 'Mail 29.09.', false), I('b2', 'VoltBox – Beratung Finanzierung', 'Zwei Termine im März', 'Termin 12.03.')] },
      { id: 'uni', titel: 'Universität Augsburg', imp: 41, lauf: 0, items: [I('l1', 'Entrepreneurship Basics – Gastvortrag Dr. Albrecht', '„Gerne halte ich einen Gastvortrag“', 'Mail 11.08.')] },
      { id: 'part', titel: 'Partner & Förderer', imp: 29, lauf: 0, items: [I('p3', 'Dr. Jana Roth (Stadtsparkasse)', 'Ansprechpartnerin Gründungskredit', 'Mail 17.01.')] },
      { id: 'ohne', titel: 'ohne Organisation', imp: 50, lauf: 2, hinweis: 'davon 41 Rechnungen', items: [I('s1', 'Rechnung Raumtechnik 03/2026', 'Rechnung über Beamer-Miete', 'Rechnung_0326.pdf'), I('s3', 'Kitchen Loop – Catering-Rechnung', 'Rechnung über Catering am 19.09.', 'Rechnung_0923.pdf', false)] }
    ];
  }
  renderVals() {
    var self = this, st = this.state;
    var fmt = function (n) { return Number(n).toLocaleString('de-DE'); };
    var zaehle = function (g) { return st.herkunft === 'aus Import' ? g.imp : (st.herkunft === 'laufender Betrieb' ? g.lauf : g.imp + g.lauf); };
    var passt = function (i) { return st.herkunft === 'Alle' || (st.herkunft === 'aus Import' ? i.import : !i.import); };
    var set = function (key, id, v) { var m = Object.assign({}, self.state[key]); if (v == null) delete m[id]; else m[id] = v; var p = {}; p[key] = m; return p; };
    var G = this.gruppenDaten().filter(function (g) { return zaehle(g) > 0; });
    var auswahl = 0, offenGesamt = 0, gewaehlteGruppen = [], gewaehlteItems = [];
    var gruppen = G.map(function (g) {
      var n = zaehle(g), gs = st.gStatus[g.id], ggew = !!st.gGewaehlt[g.id] && !gs;
      var items = g.items.filter(passt);
      var erledigtItems = items.filter(function (i) { return st.iStatus[i.id]; }).length;
      var rest = gs ? 0 : n - erledigtItems;
      offenGesamt += rest;
      if (ggew) { auswahl += rest; gewaehlteGruppen.push(g); }
      else items.forEach(function (i) { if (st.iGewaehlt[i.id] && !st.iStatus[i.id]) { auswahl++; gewaehlteItems.push(i); } });
      var auf = !!st.offen[g.id];
      return {
        titel: g.titel + (g.hinweis ? ' – ' + g.hinweis : ''), anzahl: fmt(n), gewaehlt: ggew, erledigt: !!gs,
        offen: auf && !gs, aufText: auf ? 'true' : 'false', pfeil: auf ? '▾' : '▸',
        titelStil: gs ? 'color: var(--ink-muted); text-decoration: line-through' : '',
        status: gs === 'ok' ? '✓ ' + fmt(n) + ' übernommen' : (gs === 'weg' ? fmt(n) + ' verworfen' : (rest < n ? fmt(rest) + ' offen' : '')),
        statusStil: '',
        toggle: function () { self.setState(set('offen', g.id, !auf || null)); },
        waehlen: function () { self.setState(set('gGewaehlt', g.id, !ggew || null)); },
        items: items.map(function (i) {
          var s = st.iStatus[i.id], sel = ggew || !!st.iGewaehlt[i.id];
          return Object.assign({}, i, {
            gewaehlt: sel && !s, gesperrt: ggew || !!s, offen: !s, erledigt: !!s,
            status: s === 'ok' ? '✓ übernommen' : 'verworfen',
            stil: s === 'weg' ? 'color: var(--ink-muted); text-decoration: line-through' : (s ? 'color: var(--ink-muted)' : ''),
            waehlen: function () { self.setState(set('iGewaehlt', i.id, !st.iGewaehlt[i.id] || null)); },
            uebernehmen: function () { self.setState(set('iStatus', i.id, 'ok')); },
            verwerfen: function () { self.setState(set('iStatus', i.id, 'weg')); },
            rueck: function () { self.setState(set('iStatus', i.id, null)); }
          });
        }),
        hatMehr: n - items.length > 0, mehr: fmt(n - items.length)
      };
    });
    var anwenden = function (wert) {
      var gS = Object.assign({}, self.state.gStatus), iS = Object.assign({}, self.state.iStatus);
      gewaehlteGruppen.forEach(function (g) { gS[g.id] = wert; });
      gewaehlteItems.forEach(function (i) { iS[i.id] = wert; });
      var begr = self.state.warum.trim();
      var karte = { titel: wert === 'ok' ? 'Übernommen' : 'Verworfen', anzahl: auswahl,
        punkte: [fmt(auswahl) + (wert === 'ok' ? ' Einträge übernommen – sie gelten jetzt als bestätigt' : ' Einträge verworfen')].concat(wert === 'weg' && begr ? ['Begründung gemerkt: „' + begr + '“', 'Als Anweisung gespeichert: ähnliche Einträge lege ich nicht mehr an'] : []),
        link: wert === 'weg' && begr ? 'Zur Anweisungsliste' : '', snapshot: { g: self.state.gStatus, i: self.state.iStatus } };
      self.setState({ gStatus: gS, iStatus: iS, gGewaehlt: {}, iGewaehlt: {}, warumAuf: false, warum: '', karte: karte });
    };
    var k = st.karte;
    return {
      sidebarChats: this.kgChats(),
      summe: fmt(offenGesamt) + ' zu prüfen · Import Okt. 2025 – Sep. 2026: 214 neu angelegt, 312 bestehenden Vorgängen zugeordnet',
      herkuenfte: ['aus Import', 'laufender Betrieb', 'Alle'], herkunft: st.herkunft, setHerkunft: function (w) { self.setState({ herkunft: w, gGewaehlt: {}, iGewaehlt: {} }); },
      gruppierungen: ['Art', 'Organisation'], gruppierung: st.gruppierung, setGruppierung: function (w) { self.setState({ gruppierung: w, gGewaehlt: {}, iGewaehlt: {}, offen: {} }); },
      gruppen: gruppen,
      hatAuswahl: auswahl > 0,
      auswahlZeile: auswahl ? fmt(auswahl) + ' ausgewählt' : 'Nichts ausgewählt – ganze Gruppen über das Kästchen links wählen',
      alleUebernehmen: function () { anwenden('ok'); },
      verwerfenAuf: function () { self.setState({ warumAuf: !self.state.warumAuf }); },
      zeigeWarum: st.warumAuf && auswahl > 0,
      warum: st.warum, warumTippen: function (e) { self.setState({ warum: e.target.value }); },
      verwerfenText: fmt(auswahl) + ' verwerfen',
      alleVerwerfen: function (e) { if (e && e.preventDefault) e.preventDefault(); anwenden('weg'); },
      auswahlLeeren: function () { self.setState({ gGewaehlt: {}, iGewaehlt: {}, warumAuf: false }); },
      hatKarte: !!k,
      karteTitel: k ? k.titel : '', kartePunkte: k ? k.punkte : [], karteLink: k ? k.link : '',
      karteFolgen: k ? (k.link ? 'löscht auch die gespeicherte Anweisung' : '') : '',
      karteRueck: function () { var s = self.state.karte.snapshot; self.setState({ gStatus: s.g, iStatus: s.i }); }
    };
  }
}
