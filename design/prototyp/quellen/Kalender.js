class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { modus: 'Woche', scope: 'Meins', sel: null, neu: null, wasText: '', panelZu: false, wo: 0, tag: 2, kSuche: '', ganzerTag: false, extEntwurf: null, tnHover: null });
  }
  kcCfg() { var e = this.aktuell(); return { name: e ? this.wert(e.id, 'titel', e.titel) : 'Kalender', anzahl: 'Termine, Teilnehmende, letzte Mails', platzhalter: 'Frag etwas zu diesem Termin', antwort: 'Karin Vogt hat nach dem Gespräch die Rahmenvereinbarung geschickt (Mail 29.09.). Offen ist, wer sie prüft.', belege: [{ art: 'belegt', text: 'Rahmenvereinbarung als Vorschlag', quelle: 'Mail 29.09.' }], luecke: 'Dazu steht im Termin nichts, was ich auswerten könnte.' }; }
  team() { return ['Andreas', 'Julia', 'Mehmet']; }
  // Tage als Abstand zu Mo 28.09. (0 = Mo 28.09., 2 = heute Mi 30.09.)
  off(k) { k = String(k); if (/^-?\d+$/.test(k)) return +k; var w = /^w(-?\d+)-(\d)$/.exec(k); if (w) return 7 * +w[1] + +w[2]; var d = /^d(\d+)$/.exec(k); return d ? +d[1] - 28 : 0; }
  key(o) { return o >= 0 && o <= 6 ? String(o) : (o < 0 && o >= -28 ? 'd' + (28 + o) : 'w' + Math.floor(o / 7) + '-' + (((o % 7) + 7) % 7)); }
  datumLabel(tage) { var d = new Date(2026, 8, 28 + tage); var W = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']; return W[d.getDay()] + ' ' + ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.'; }
  tagLabel(k) { return this.datumLabel(this.off(k)); }
  min(z) { var p = String(z).split(':'); return +p[0] * 60 + +p[1]; }
  zeit(m) { m = Math.max(0, Math.min(m, 24 * 60 - 1)); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  basis() {
    var T = [
      { id: 'j1', tag: '0', start: '10:00', dauer: '1', titel: 'Jour fixe Team', ort: 'Raum 2.14', leute: 'Andreas, Julia, Mehmet', vorgang: '– (ohne Bereich)', wer: 'Andreas' },
      { id: 'v1', tag: '0', start: '14:00', dauer: '1', titel: 'Vorbesprechung Entrepreneurship Basics', ort: 'Büro Hartmann', leute: 'Prof. Dr. Martin Hartmann', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas', ergebnis: 'Raum für Sitzung 3 fehlt noch; Folien kommen bis 06.10.' },
      { id: 'sw', tag: '1', start: '11:00', dauer: '1', titel: 'Gespräch Stadtwerke', ort: 'Stadtwerke, Hoher Weg 1', leute: 'Karin Vogt', vorgang: '– (ohne Bereich)', wer: 'Andreas' },
      { id: 'eb', tag: '1', start: '16:00', dauer: '1.5', titel: 'Entrepreneurship Basics, Sitzung 1', ort: 'Hörsaal 1004', leute: '', vorgang: 'Lehre · Entrepreneurship Basics', wer: 'Andreas' },
      { id: 'kl', tag: '2', start: '10:00', dauer: '1', titel: 'Beratung Kitchen Loop', ort: 'Raum 2.14', leute: 'Sara Yilmaz, Ben Hofer', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Andreas' },
      { id: 'so', tag: '2', start: '13:30', dauer: '1', titel: 'Beratung Solaro', ort: 'Raum 2.14', leute: 'Lisa Meier, Tom Kraus', vorgang: 'Gründungsteams · Solaro', wer: 'Andreas', ergebnis: 'Pitchdeck final bis Fr 02.10.; wir vermitteln Frau Weber.' },
      { id: 'gb', tag: '3', start: '14:00', dauer: '1', titel: 'Erstberatung Greenbyte', ort: 'Raum 2.14', leute: 'Nora Kim', vorgang: 'Gründungsteams · Greenbyte', wer: 'Andreas' },
      { id: 'ma', tag: '3', start: '15:30', dauer: '0.5', titel: 'Sprechstunde Max Brandt', ort: 'Raum 2.14', leute: 'Max Brandt', vorgang: 'Gründungsteams · Lern-App (Max Brandt)', wer: 'Andreas', status: 'entwurf' },
      { id: 'nl', tag: '4', start: '09:00', dauer: '1.5', titel: 'Mentoring Nordlicht', ort: 'online', leute: 'Dr. Kerstin Albrecht, Jonas Berg', vorgang: 'Gründungsteams · Nordlicht Analytics', wer: 'Andreas', status: 'eingeladen', antworten: { 'Dr. Kerstin Albrecht': 'zugesagt' } },
      { id: 'fe', tag: '5', start: '00:00', ganztag: true, titel: 'Tag der Deutschen Einheit', ort: '', leute: '', vorgang: '– (ohne Bereich)', wer: 'Andreas', feiertag: true },
      { id: 'pa', tag: '2', start: '14:00', dauer: '1', titel: 'Orga Pitch-Abend', ort: 'Raum 2.12', leute: 'Julia', vorgang: 'Events · Pitch-Abend', wer: 'Julia' },
      { id: 'ur', tag: '3', endTag: '4', start: '00:00', ganztag: true, titel: 'Urlaub', ort: '', leute: '', vorgang: '– (ohne Bereich)', wer: 'Julia' },
      { id: 'kf', tag: '3', start: '10:00', dauer: '1', titel: 'Förderberatung Kitchen Loop', ort: 'Raum 2.12', leute: 'Ben Hofer', vorgang: 'Gründungsteams · Kitchen Loop', wer: 'Mehmet' },
      { id: 'rs', tag: '4', start: '11:00', dauer: '1', titel: 'Redaktion Social Media', ort: 'Büro', leute: 'Mehmet', vorgang: 'Social Media · Pitch-Abend ankündigen', wer: 'Mehmet' }
    ];
    var self = this;
    return T.concat(this.wert('_neu', 'termine', [])).filter(function (e) { return self.v(e, 'status') !== 'verworfen'; });
  }
  v(e, f) { return this.wert(e.id, f, e[f]); }
  ende(e) { var x = this.v(e, 'ende'); if (x) return x; return this.zeit(this.min(this.v(e, 'start')) + Math.round(parseFloat(e.dauer || '1') * 60)); }
  endTag(e) { return this.v(e, 'endTag') || this.v(e, 'tag'); }
  mehrtaegig(e) { return this.off(this.endTag(e)) > this.off(this.v(e, 'tag')); }
  ganz(e) { return !!this.v(e, 'ganztag') || this.mehrtaegig(e); }
  teamIn(s) { var t = this.team(); return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return t.indexOf(x) >= 0; }); }
  kontaktZu(name) { var K = this.kontaktDaten(); var p = K.personen.filter(function (x) { return x.name === name; })[0]; if (!p) return null; var o = K.orgs.filter(function (x) { return x.id === p.orgId; })[0]; return { p: p, org: o ? o.name : '' }; }
  personen(s) { var t = this.team(); return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && t.indexOf(x) < 0; }); }
  externe(e) { return this.personen(this.v(e, 'leute')); }
  // Wer hat die Einladung bekommen, wer hat geantwortet – je Person
  eingeladene(e) { var x = this.v(e, 'eingeladene'); if (x) return x; return e.status === 'entwurf' || e.istNeu ? [] : this.personen(e.leute); }
  antworten(e) { var x = this.v(e, 'antworten'); if (x) return x; if (e.status === 'eingeladen') return {}; var a = {}; this.eingeladene(e).forEach(function (n) { a[n] = 'zugesagt'; }); return a; }
  nichtEingeladen(e) { var inv = this.eingeladene(e); return this.externe(e).filter(function (n) { return inv.indexOf(n) < 0; }); }
  offeneAntworten(e) { var a = this.antworten(e), inv = this.eingeladene(e), ext = this.externe(e); return inv.filter(function (n) { return ext.indexOf(n) >= 0 && !a[n]; }); }
  vorbei(e) { var o = this.off(this.endTag(e)); if (o !== 2) return o < 2; return !this.v(e, 'ganztag') && this.ende(e) <= '14:40'; }
  eigen(e) { return this.v(e, 'wer') === 'Andreas'; }
  sichtbar() {
    var self = this;
    return this.basis().filter(function (e) { return self.state.scope === 'Team' || self.eigen(e); });
  }
  aktuell() {
    var self = this, st = this.state;
    if (st.neu) return st.neu;
    return this.basis().filter(function (e) { return e.id === st.sel; })[0];
  }
  renderVals() {
    var self = this, st = this.state, T = this.sichtbar();
    var H0 = st.ganzerTag ? 0 : 7, H1 = st.ganzerTag ? 24 : 21;
    var px = function (zeit) { return (self.min(zeit) / 60 - H0) * 48; };
    var oeffne = function (e) { return function () { var o = self.off(self.v(e, 'tag')); self.setState({ sel: e.id, neu: null, wasText: '', kcOffen: false, panelZu: false, wo: Math.floor(o / 7), tag: self.state.modus === 'Tag' ? o : self.state.tag }); }; };
    var neuAn = function (o, start) { return function () { self.setState({ panelZu: false, neu: { id: 'n' + Date.now(), istNeu: true, tag: self.key(o), endTag: self.key(o), start: start, ende: self.zeit(self.min(start) + 60), titel: '', ort: '', leute: '', vorgang: '– (ohne Bereich)', wer: 'Andreas' }, sel: null, wasText: '' }); }; };
    var fragt = function (e) { return self.vorbei(e) && self.externe(e).length > 0 && !self.v(e, 'ergebnis') && self.v(e, 'status') !== 'abgesagt' && self.v(e, 'status') !== 'entwurf'; };
    var unterText = function (e) {
      var s = self.v(e, 'status'); if (s === 'abgesagt') return 'abgesagt';
      if (self.v(e, 'feiertag')) return 'Feiertag';
      var ne = self.nichtEingeladen(e), inv = self.eingeladene(e);
      if (ne.length && !self.vorbei(e)) return inv.length ? ne.length + ' noch nicht eingeladen' : 'Einladung nicht verschickt';
      if (self.v(e, 'geaendert')) return 'Änderung nicht verschickt';
      var oa = self.offeneAntworten(e).length; if (oa && !self.vorbei(e)) return 'eingeladen · ' + oa + (oa === 1 ? ' Antwort' : ' Antworten') + ' offen';
      return self.v(e, 'leute') || self.v(e, 'ort');
    };
    var klasse = function (e) { var s = self.v(e, 'status'); return 'r-t' + (s === 'abgesagt' ? ' r-t--ab' : (self.nichtEingeladen(e).length && !self.eingeladene(e).length && !self.vorbei(e)) || self.v(e, 'geaendert') ? ' r-t--entwurf' : self.vorbei(e) ? ' r-t--vorbei' : ''); };
    var wer = function (e) { return st.scope === 'Team' && !self.eigen(e) ? ' · ' + self.v(e, 'wer') : ''; };
    var stunden = []; for (var h = H0; h < H1; h++) stunden.push({ label: h + ':00', top: 'top: ' + ((h - H0) * 48) + 'px' });
    var HOEHE = (H1 - H0) * 48;
    var fristen = { 2: ['Finanzplan-Feedback an Tom'], 4: ['Pitchdeck Solaro (an uns)'] };
    var istTag = st.modus === 'Tag';
    var offs = istTag ? [st.tag] : [0, 1, 2, 3, 4, 5, 6].map(function (i) { return 7 * st.wo + i; });
    var amTag = function (o) { return T.filter(function (e) { return !self.ganz(e) && self.off(self.v(e, 'tag')) === o; }); };
    var ganzAm = function (o) { return T.filter(function (e) { return self.ganz(e) && self.off(self.v(e, 'tag')) <= o && self.off(self.endTag(e)) >= o; }); };
    // Überschneidungen nebeneinander: Gruppen bilden, Spalten vergeben
    var layout = function (liste) {
      var sortiert = liste.slice().sort(function (a, b) { return self.min(self.v(a, 'start')) - self.min(self.v(b, 'start')); });
      var gruppe = [], gruppeEnde = -1, pos = {};
      var abschliessen = function () { var n = 0; gruppe.forEach(function (g) { n = Math.max(n, g.sp + 1); }); gruppe.forEach(function (g) { pos[g.e.id] = { sp: g.sp, n: n }; }); gruppe = []; };
      sortiert.forEach(function (e) {
        var a = self.min(self.v(e, 'start')), b = Math.max(a + 15, self.min(self.ende(e)));
        if (a >= gruppeEnde) { abschliessen(); gruppeEnde = -1; }
        var belegt = gruppe.filter(function (g) { return g.b > a; }).map(function (g) { return g.sp; });
        var sp = 0; while (belegt.indexOf(sp) >= 0) sp++;
        gruppe.push({ e: e, sp: sp, b: b }); gruppeEnde = Math.max(gruppeEnde, b);
      });
      abschliessen();
      return pos;
    };
    var tage = offs.map(function (o) {
      var heute = o === 2, we = !istTag && (((o % 7) + 7) % 7) >= 5;
      var liste = amTag(o).filter(function (e) { var hh = +self.v(e, 'start').split(':')[0]; return hh >= H0 && hh < H1; });
      var lay = layout(liste);
      var slots = [];
      for (var j = 0; j < (H1 - H0) * 2; j++) { var z = self.zeit(H0 * 60 + j * 30); slots.push({ top: 'top: ' + (j * 24) + 'px', klasse: 'r-slot' + (j % 2 ? ' r-slot--halb' : ''), label: 'Neuer Termin ' + self.datumLabel(o) + ' ' + z, los: neuAn(o, z) }); }
      return {
        kopf: self.datumLabel(o) + (heute ? ' · heute' : ''), kopfKlasse: 'r-kopf' + (heute ? ' r-kopf--heute' : ''), istHeute: heute,
        fristen: fristen[o] || [],
        ganz: ganzAm(o).map(function (e) { return { titel: self.v(e, 'titel') + wer(e), klasse: 'r-ganz' + (self.v(e, 'feiertag') ? ' r-ganz--frei' : ''), los: oeffne(e) }; }),
        slots: slots,
        spaltenKlasse: 'r-tag' + (we ? ' r-tag--we' : ''),
        termine: liste.map(function (e) {
          var a = self.min(self.v(e, 'start')), b = self.min(self.ende(e));
          var hgt = Math.max(22, (b - a) / 60 * 48 - 2), p = lay[e.id];
          var breite = 'left: calc(3px + (100% - 6px) * ' + p.sp + ' / ' + p.n + '); width: calc((100% - 6px) / ' + p.n + ' - 2px); right: auto';
          return { titel: self.v(e, 'titel') || '(ohne Titel)', zeit: self.v(e, 'start') + '–' + self.ende(e) + wer(e),
            unter: unterText(e), klasse: klasse(e) + (self.eigen(e) ? '' : ' r-t--fremd'), pos: 'top: ' + (px(self.v(e, 'start')) + 1) + 'px; height: ' + hgt + 'px; ' + breite,
            aktiv: e.id === st.sel ? 'true' : 'false', fragen: fragt(e) && self.eigen(e), los: oeffne(e) };
        })
      };
    });
    // Monat September 2026 (1.9. = Dienstag), 35 Zellen ab Mo 31.08.
    var zellen = [];
    for (var d = 0; d < 35; d++) {
      var nr = d, fremd = nr < 1 || nr > 30, o = nr - 28;
      var label = nr < 1 ? '31.08.' : nr > 30 ? (nr - 30) + '.10.' : nr + '.';
      var es = nr >= 1 ? amTag(o).concat(ganzAm(o)) : [];
      var generisch = [];
      if (!fremd && nr < 28 && (nr % 7 === 0)) generisch.push('10:00 Jour fixe Team');
      if (!fremd && (nr === 8 || nr === 22)) generisch.push('13:30 Beratung Solaro');
      if (!fremd && (nr === 15)) generisch.push('11:00 Gespräch IHK');
      zellen.push({ tag: label, klasse: 'zelle' + (fremd ? ' zelle--fremd' : '') + (nr === 30 ? ' zelle--heute' : ''),
        neuLabel: 'Neuer Termin am ' + label, neu: neuAn(o, '10:00'),
        termine: es.map(function (e) { var s = self.v(e, 'status'); return { text: (self.ganz(e) ? '' : self.v(e, 'start') + ' ') + (self.v(e, 'titel') || '(ohne Titel)') + wer(e), stil: s === 'abgesagt' ? 'text-decoration: line-through; color: var(--ink-muted)' : self.nichtEingeladen(e).length && !self.eingeladene(e).length ? 'color: var(--ink-muted)' : '', los: oeffne(e) }; })
          .concat(generisch.map(function (g) { return { text: g, stil: 'color: var(--ink-muted)', los: function () { self.aendere([], 'Ältere Termine sind im Prototyp nur angedeutet', true); } }; }))
      });
    }
    // ——— Formular ———
    var e = this.aktuell(), ev = {};
    if (e) {
      var ext = this.externe(e), s = this.v(e, 'status') || 'fest', istNeu = !!e.istNeu;
      var inv = this.eingeladene(e), ne = this.nichtEingeladen(e), ant = this.antworten(e), vorbei = !istNeu && this.vorbei(e);
      var bearbeitbar = istNeu || (this.eigen(e) && !this.v(e, 'feiertag'));
      var meldePflicht = !istNeu && inv.length > 0 && !vorbei && s !== 'abgesagt';
      var inhaltlich = ['tag', 'endTag', 'start', 'ende', 'ganztag', 'ort'];
      var setze = function (obj, label) {
        if (istNeu) { self.setState({ neu: Object.assign({}, self.state.neu, obj) }); return; }
        var ch = Object.keys(obj).map(function (k) { return { id: e.id, feld: k, wert: obj[k], basis: e[k] }; });
        var wirkt = Object.keys(obj).some(function (k) { return inhaltlich.indexOf(k) >= 0; });
        if (meldePflicht && wirkt && !self.v(e, 'geaendert')) ch.push({ id: e.id, feld: 'geaendert', wert: true, basis: false });
        self.aendere(ch, label || (meldePflicht && wirkt ? 'Gespeichert – Änderung noch nicht an ' + inv.join(', ') + ' verschickt' : 'Gespeichert'));
      };
      var basisF = istNeu ? {
        fokus: function () {}, fertig: function () {},
        tippen: function (x) { var n = Object.assign({}, self.state.neu); n[x.target.getAttribute('data-feld')] = x.target.value; self.setState({ neu: n }); },
        wahl: function (x) { var n = Object.assign({}, self.state.neu); n[x.target.getAttribute('data-feld')] = x.target.value; self.setState({ neu: n }); }
      } : this.feld(e.id, e, 'Termin');
      var f = istNeu ? basisF : Object.assign({}, basisF, {
        fertig: function (x) {
          var fd = x.target.getAttribute('data-feld');
          if (fd !== 'ort' || !meldePflicht) return basisF.fertig(x);
          var alt = self._fokusAlt, neu = x.target.value; self._fokusAlt = undefined;
          if (alt === undefined || alt === neu) return;
          var ed = Object.assign({}, self.state.edits); ed[e.id] = Object.assign({}, ed[e.id], { ort: alt }); self.state.edits = ed;
          setze({ ort: neu });
        }
      });
      var oT = this.off(this.v(e, 'tag')), oE = this.off(this.endTag(e)), sZ = this.v(e, 'start'), eZ = this.ende(e), gt = !!this.v(e, 'ganztag');
      var fehler = !gt && (oE < oT || (oE === oT && this.min(eZ) <= this.min(sZ)));
      var titel = this.v(e, 'titel');
      ev = {
        f: f, bearbeitbar: bearbeitbar, nurLesen: !bearbeitbar,
        besitzText: this.v(e, 'feiertag') ? 'Gesetzlicher Feiertag (Bayern) – kommt aus dem Feiertagskalender.' : 'Termin von ' + this.v(e, 'wer') + ' – ändern kann nur ' + this.v(e, 'wer') + '. Du siehst ihn, weil ihr eure Kalender teilt.',
        lesen: [
          { k: 'Wann', w: gt ? this.datumLabel(oT) + (oE > oT ? ' – ' + this.datumLabel(oE) : '') + ' · ganztägig' : this.datumLabel(oT) + ' ' + sZ + ' – ' + (oE > oT ? this.datumLabel(oE) + ' ' : '') + eZ },
          { k: 'Ort', w: this.v(e, 'ort') || '–' }, { k: 'Mit', w: this.v(e, 'leute') || '–' }, { k: 'Gehört zu', w: this.v(e, 'vorgang') },
          { k: 'Kalender', w: this.v(e, 'feiertag') ? 'Feiertage Bayern' : this.v(e, 'wer') + ' (Outlook)' }
        ],
        titel: titel, tag: this.key(oT), endTag: this.key(oE), start: sZ, ende: eZ, ort: this.v(e, 'ort'), leute: this.v(e, 'leute'), vorgang: this.v(e, 'vorgang'),
        mitZeit: !gt, zeitFehler: fehler,
        setTag: function (x) { var n = self.off(x.target.value), dd = n - oT; setze({ tag: self.key(n), endTag: self.key(oE + dd) }); },
        setEndTag: function (x) { setze({ endTag: x.target.value }); },
        setStart: function (x) { var a = self.min(x.target.value), dauer = (oE - oT) * 1440 + self.min(eZ) - self.min(sZ); if (dauer <= 0) dauer = 60; var b = a + dauer; setze({ start: x.target.value, ende: self.zeit(b % 1440), endTag: self.key(oT + Math.floor(b / 1440)) }); },
        setEnde: function (x) { setze({ ende: x.target.value }); },
        hatExterne: ext.length > 0, externe: ext.join(', '),
        teamWahl: this.team().filter(function (n) { return n !== self.v(e, 'wer'); }).map(function (n) {
          var drin = self.teamIn(self.v(e, 'leute')).indexOf(n) >= 0;
          return { name: n, kuerzel: n[0], an: drin ? 'true' : 'false', los: function () {
            var tm = self.teamIn(self.v(e, 'leute')).filter(function (x) { return x !== n; }); if (!drin) tm.push(n);
            var ihr = n === 'Julia' ? 'ihrem' : 'seinem';
            setze({ leute: tm.concat(ext).join(', ') }, istNeu ? null : (drin ? n + ' ist nicht mehr dabei – der Termin verschwindet aus ' + ihr + ' Kalender' : n + ' sieht den Termin jetzt in ' + ihr + ' Kalender und bekommt eine Benachrichtigung'));
          } };
        }),
        teamHinweis: (function () { var tm = self.teamIn(self.v(e, 'leute')).filter(function (x) { return x !== self.v(e, 'wer'); }); if (!tm.length) return ''; return istNeu ? tm.join(' und ') + ' bekommt beim Speichern eine Benachrichtigung' : 'steht auch im Kalender von ' + tm.join(' und '); })(),
        externText: st.extEntwurf && st.extEntwurf.id === e.id ? st.extEntwurf.text : ext.join(', '),
        externTippen: function (x) { self.setState({ extEntwurf: { id: e.id, text: x.target.value } }); },
        externFertig: function () {
          var en = self.state.extEntwurf; if (!en || en.id !== e.id) return;
          var neuExt = self.personen(en.text); self.setState({ extEntwurf: null });
          if (neuExt.join(', ') === ext.join(', ')) return;
          var dazu = neuExt.filter(function (n) { return ext.indexOf(n) < 0; });
          setze({ leute: self.teamIn(self.v(e, 'leute')).concat(neuExt).join(', ') }, istNeu ? null : 'Gespeichert' + (dazu.length ? ' – ' + dazu.join(', ') + ' noch nicht eingeladen' : ''));
        },
        teilnehmer: ext.map(function (n) { var z = inv.indexOf(n) < 0 ? 'nicht eingeladen' : ant[n] || 'Antwort offen'; return { name: n, status: z, kuerzel: n.replace(/^(Prof\. |Dr\. )+/g, '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2), pille: 'kg-pille' + (z === 'Antwort offen' ? ' kg-pille--offen' : ''), stil: 'color: var(--ink-muted)', zeige: function (x) { var top = 80; try { var r = x.currentTarget.getBoundingClientRect(), k = x.currentTarget.closest('.kal').getBoundingClientRect(); top = Math.max(8, r.top - k.top - 12); } catch (er) {} self.setState({ tnHover: { name: n, top: top } }); } }; }),
        ganztag: gt, ganztagToggle: function () { setze({ ganztag: !gt }); },
        wiederholung: this.v(e, 'wiederholung') || 'keine', erinnerung: this.v(e, 'erinnerung') || '30 Min. vorher', kalender: this.v(e, 'kalender') || (ext.length ? 'Persönlich (Outlook)' : 'Teamkalender'), verfuegbar: this.v(e, 'verfuegbar') || 'belegt', notiz: this.v(e, 'notiz') || '',
        istNeu: istNeu, istAbgesagt: s === 'abgesagt',
        statusText: istNeu ? (ext.length ? 'Wird erst gespeichert, dann lädst du ein – nichts geht automatisch raus.' : 'Nur Team – steht nach dem Speichern direkt im Kalender.')
          : !bearbeitbar || s === 'abgesagt' ? ''
          : ne.length && !vorbei ? (inv.length ? ne.join(', ') + (ne.length === 1 ? ' ist' : ' sind') + ' noch nicht eingeladen.' : 'Steht vorläufig im Kalender. Einladung an ' + ne.join(', ') + ' ist noch nicht verschickt.')
          : this.v(e, 'geaendert') ? 'Geändert – ' + inv.join(', ') + (inv.length === 1 ? ' kennt' : ' kennen') + ' noch die alte Fassung. Erst „Änderung senden“ verschickt sie.'
          : this.offeneAntworten(e).length && !vorbei ? 'Einladung verschickt über dein Postfach · ' + this.offeneAntworten(e).join(', ') + ' hat noch nicht geantwortet.'
          : (ext.length ? 'Fest im Kalender.' : 'Interner Termin.'),
        anlegenLabel: 'Speichern',
        anlegen: function () {
          var n = Object.assign({}, self.state.neu); delete n.istNeu;
          if (!n.titel.trim()) n.titel = 'Neuer Termin';
          n.eingeladene = []; n.status = self.externe(n).length ? 'entwurf' : 'fest';
          self.setState({ neu: null, sel: n.id });
          var tm = self.teamIn(n.leute);
          self.aendere([{ id: '_neu', feld: 'termine', wert: self.wert('_neu', 'termine', []).concat([n]), basis: [] }], 'Termin gespeichert' + (tm.length ? ' – ' + tm.join(' und ') + ' benachrichtigt' : '') + (self.externe(n).length ? ' – Einladung an Externe noch nicht verschickt' : ''));
        },
        kannEinladen: bearbeitbar && !istNeu && s !== 'abgesagt' && ne.length > 0 && !vorbei,
        wartet: bearbeitbar && !istNeu && s !== 'abgesagt' && !vorbei && (ne.length > 0 || !!this.v(e, 'geaendert')),
        wartetText: ne.length && !vorbei ? (inv.length ? ne.join(', ') + (ne.length === 1 ? ' ist' : ' sind') + ' noch nicht eingeladen.' : 'Einladung noch nicht verschickt.') : 'Änderung noch nicht verschickt.',
        einladenLabel: inv.length ? 'Einladung an ' + ne.join(', ') + ' senden' : 'Einladung senden',
        einladen: function () { self.aendere([{ id: e.id, feld: 'eingeladene', wert: inv.concat(ne), basis: undefined }, { id: e.id, feld: 'status', wert: 'eingeladen', basis: e.status }, { id: e.id, feld: 'geaendert', wert: false, basis: false }], 'Einladung an ' + ne.join(', ') + ' über dein Postfach gesendet'); },
        kannAendern: bearbeitbar && !!this.v(e, 'geaendert') && s !== 'abgesagt',
        aenderungSenden: function () { self.aendere([{ id: e.id, feld: 'geaendert', wert: false, basis: false }], 'Änderung an ' + inv.join(', ') + ' über dein Postfach gesendet'); },
        kannAbsagen: bearbeitbar && !istNeu && s !== 'abgesagt' && !vorbei,
        absagenLabel: inv.length ? 'Absagen' : 'Verwerfen',
        absagen: function () {
          if (!inv.length) { self.setState({ sel: null }); self.aendere([{ id: e.id, feld: 'status', wert: 'verworfen', basis: e.status }], 'Termin verworfen'); return; }
          self.aendere([{ id: e.id, feld: 'status', wert: 'abgesagt', basis: e.status }, { id: e.id, feld: 'vorStatus', wert: s, basis: undefined }], 'Abgesagt – Absage an ' + inv.join(', ') + ' liegt als Entwurf in Mail');
        },
        wiederherstellen: function () { self.aendere([{ id: e.id, feld: 'status', wert: self.v(e, 'vorStatus') || e.status || 'fest', basis: e.status }], 'Termin wiederhergestellt'); },
        hatVorgangLink: !istNeu && this.v(e, 'vorgang').indexOf('–') !== 0, gehoertHref: this.bereichHref(this.v(e, 'vorgang')),
        zeigeWasKam: !istNeu && bearbeitbar && fragt(e),
        wasKamSpeichern: function (x) { if (x && x.preventDefault) x.preventDefault(); var t = self.state.wasText.trim(); if (!t) return; self.setState({ wasText: '' }); self.aendere([{ id: e.id, feld: 'ergebnis', wert: t, basis: e.ergebnis || '' }], 'Im Verlauf von „' + self.v(e, 'vorgang').split(' · ').pop() + '“ abgelegt'); },
        hatErgebnis: !istNeu && !!this.v(e, 'ergebnis'), ergebnis: this.v(e, 'ergebnis') || ''
      };
    }
    var meine = this.basis().filter(function (x) { return self.eigen(x) && self.v(x, 'status') !== 'abgesagt'; });
    var nach = meine.filter(fragt);
    var entw = meine.filter(function (x) { return !self.vorbei(x) && (self.nichtEingeladen(x).length > 0 || self.v(x, 'geaendert')); });
    var tagOpt = []; for (var t = 0; t < 14; t++) tagOpt.push(t);
    if (e) [this.off(this.v(e, 'tag')), this.off(this.endTag(e))].forEach(function (o) { if (tagOpt.indexOf(o) < 0) tagOpt.unshift(o); });
    var zeiten = []; for (var mz = 0; mz < 24 * 60; mz += 5) zeiten.push(this.zeit(mz));
    if (e) [this.v(e, 'start'), this.ende(e)].forEach(function (z) { if (zeiten.indexOf(z) < 0) zeiten.push(z); });
    var q = st.kSuche.trim().toLowerCase();
    var treffer = !q ? [] : T.filter(function (x) { return (self.v(x, 'titel') + ' ' + self.v(x, 'leute') + ' ' + self.v(x, 'ort')).toLowerCase().indexOf(q) >= 0; });
    var tnKarte = { zeigen: false, pos: '', name: '', rolle: '', zeilen: [], notiz: '' };
    if (st.tnHover && e) {
      var kz = this.kontaktZu(st.tnHover.name);
      tnKarte = { zeigen: true, pos: 'top: ' + st.tnHover.top + 'px', name: st.tnHover.name,
        rolle: kz ? kz.p.rolle + (kz.org ? ' · ' + kz.org : '') : 'noch nicht in Kontakte',
        zeilen: kz ? [{ k: 'E-Mail', w: kz.p.adressen[0].adresse }, { k: 'Telefon', w: kz.p.telefon || '–' }, { k: 'Letzter Kontakt', w: kz.p.letzter }, { k: 'Kontakt über', w: kz.p.ueber }] : [{ k: 'Hinweis', w: 'Beim Speichern als ungeprüfter Kontakt angelegt' }],
        notiz: kz && kz.p.notiz ? kz.p.notiz : '' };
    }
    return Object.assign(this.kcVals(), this.toastVals(), {
      sidebarChats: this.kgChats(),
      tnKarte: tnKarte, tnWeg: function () { self.setState({ tnHover: null }); },
      modi: ['Tag', 'Woche', 'Monat'], modus: st.modus, setModus: function (w) { self.setState({ modus: w }); },
      istTag: istTag, istWochenRaster: !istTag,
      zurueck: function () { if (self.state.modus === 'Monat') return self.aendere([], 'Im Prototyp gibt es nur den September', true); if (self.state.modus === 'Tag') self.setState({ tag: self.state.tag - 1 }); else self.setState({ wo: self.state.wo - 1 }); },
      vor: function () { if (self.state.modus === 'Monat') return self.aendere([], 'Im Prototyp gibt es nur den September', true); if (self.state.modus === 'Tag') self.setState({ tag: self.state.tag + 1 }); else self.setState({ wo: self.state.wo + 1 }); },
      heute: function () { self.setState({ wo: 0, tag: 2 }); },
      andereWoche: (istTag ? (st.tag < 0 || st.tag > 6) : st.wo !== 0) && st.modus !== 'Monat',
      kSuche: st.kSuche, kSucheTippen: function (x) { self.setState({ kSuche: x.target.value }); },
      hatSuche: !!q, trefferZahl: treffer.length === 1 ? '1 Treffer:' : treffer.length + ' Treffer' + (treffer.length ? ':' : ''),
      treffer: treffer.map(function (x) { return { titel: self.v(x, 'titel') + wer(x), wann: self.tagLabel(self.v(x, 'tag')) + (self.ganz(x) ? '' : ' ' + self.v(x, 'start')), los: oeffne(x) }; }),
      panelOffen: !st.panelZu, panelIstZu: !!st.panelZu,
      panelZu: function () { self.setState({ panelZu: true, sel: null, neu: null }); },
      panelAuf: function () { self.setState({ panelZu: false }); },
      panelNach: function () { self.setState({ panelZu: false, panelTab: 'nach', sel: null, neu: null }); },
      panelEinl: function () { self.setState({ panelZu: false, panelTab: 'einl', sel: null, neu: null }); },
      zeigeNach: (st.panelTab || 'nach') === 'nach', zeigeEinl: st.panelTab === 'einl',
      railNachAn: !st.panelZu && !st.sel && !st.neu && (st.panelTab || 'nach') === 'nach' ? 'true' : 'false',
      railEinlAn: !st.panelZu && !st.sel && !st.neu && st.panelTab === 'einl' ? 'true' : 'false',
      kalLayout: 'kal' + (st.panelZu ? ' kal--zu' : ''),
      scopes: ['Meins', 'Team'], scope: st.scope, setScope: function (w) { self.setState({ scope: w }); },
      istWoche: st.modus !== 'Monat', istMonat: st.modus === 'Monat',
      zeitraum: st.modus === 'Woche' ? 'KW ' + (40 + st.wo) + ' · ' + self.datumLabel(7 * st.wo).slice(3) + '–' + self.datumLabel(7 * st.wo + 6).slice(3) + '2026' : st.modus === 'Tag' ? self.datumLabel(st.tag) + '2026' : 'September 2026',
      quellenZeile: st.scope === 'Team' ? 'Kalender: Andreas (Outlook) · Julia (Outlook) · Mehmet (Outlook) · Teamkalender · Feiertage' : 'Kalender: Andreas (Outlook) · Teamkalender Gründungszentrum · Feiertage',
      neuerTermin: function () { var o = st.modus === 'Woche' && st.wo !== 0 ? 7 * st.wo : st.modus === 'Tag' ? st.tag : 2; neuAn(o, o === 2 ? '15:00' : '10:00')(); },
      rasterSpalten: (istTag ? 'grid-template-columns: 44px minmax(0, 1fr)' : 'grid-template-columns: 44px repeat(5, minmax(0, 1fr)) repeat(2, minmax(0, 0.7fr))') + '; grid-template-rows: auto ' + HOEHE + 'px',
      hoehe: 'height: ' + HOEHE + 'px',
      zeitraumOptionen: ['7–21 Uhr', '0–24 Uhr'], zeitraumWahl: st.ganzerTag ? '0–24 Uhr' : '7–21 Uhr', setZeitraumWahl: function (w) { self.setState({ ganzerTag: w === '0–24 Uhr' }); },
      ausserhalb: (function () { if (st.ganzerTag) return ''; var n = 0; offs.forEach(function (o) { n += amTag(o).filter(function (x) { var hh = +self.v(x, 'start').split(':')[0]; return hh < H0 || hh >= H1; }).length; }); return n ? n + (n === 1 ? ' Termin' : ' Termine') + ' außerhalb 7–21 Uhr' : ''; })(),
      ganzenTag: function () { self.setState({ ganzerTag: true }); },
      stunden: stunden, tage: tage, jetztTop: 'top: ' + px('14:40') + 'px', zellen: zellen,
      zeigeForm: !!e, zeigeUebersicht: !e, formTitel: e && e.istNeu ? 'Neuer Termin' : 'Termin', e: ev,
      schliessen: function () { self.setState({ sel: null, neu: null }); },
      tagOptionen: tagOpt.map(function (o) { return { wert: self.key(o), label: self.datumLabel(o) }; }),
      zeitOptionen: zeiten,
      vorgaenge: this.zuordnungen(),
      wasText: st.wasText, wasTippen: function (x) { self.setState({ wasText: x.target.value }); },
      nachtragen: nach.map(function (x) { return { titel: self.v(x, 'titel'), wann: self.tagLabel(self.v(x, 'tag')) + ' ' + self.v(x, 'start'), los: oeffne(x) }; }),
      nichtsNachzutragen: nach.length === 0, nachAnzahl: String(nach.length), nachKlasse: 'rail-n' + (nach.length ? '' : ' rail-n--leer'), entwAnzahl: String(entw.length), entwKlasse: 'rail-n' + (entw.length ? '' : ' rail-n--leer'),
      entwuerfe: entw.map(function (x) { return { titel: self.v(x, 'titel'), wann: self.tagLabel(self.v(x, 'tag')) + ' ' + self.v(x, 'start') + ' · ' + (self.v(x, 'geaendert') && !self.nichtEingeladen(x).length ? 'Änderung nicht verschickt' : 'Einladung nicht verschickt'), los: oeffne(x) }; }),
      keineEntwuerfe: entw.length === 0
    });
  }
}
