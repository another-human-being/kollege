  kgChats() {
    return [
      { id: 'c1', titel: 'Beratung Solaro, Pitchdeck', datum: 'heute', etikett: 'Solaro', angepinnt: true, href: 'Chat.dc.html' },
      { id: 'c2', titel: 'Social Media nur montags', datum: 'heute', href: 'Chat.dc.html' },
      { id: 'c3', titel: 'Was haben wir Solaro versprochen?', datum: 'gestern', etikett: 'Solaro', href: 'Chat.dc.html' },
      { id: 'c4', titel: 'Einladung Gründungsnacht', datum: '28.09.', etikett: 'Gründungsnacht 2026', href: 'Chat.dc.html' },
      { id: 'c5', titel: 'Wie lange dauert EXIST?', datum: '25.09.', href: 'Chat.dc.html' },
      { id: 'c6', titel: 'Notiz zu Tom', datum: '24.09.', etikett: 'Tom Kraus', href: 'Chat.dc.html' }
    ];
  }
  kcState() { return { kcOffen: false, kcMsgs: [], kcStream: null, kcLaden: false, kcPrivat: false, kcNotizen: [] }; }
  kcCfg() { return { name: 'Eintrag', anzahl: '0 Einträge', platzhalter: 'Frag oder notiere etwas', antwort: '', belege: [], luecke: '' }; }
  kcSenden(text) {
    var self = this, cfg = this.kcCfg(), frage = text.indexOf('?') >= 0, privat = this.state.kcPrivat;
    this.setState({ kcOffen: true, kcLaden: true, kcMsgs: this.state.kcMsgs.concat([{ typ: 'du', text: text }]) });
    setTimeout(function () {
      var antwort = '', rest = [];
      if (frage && cfg.antwort && !/wie lange|dauer|chance/i.test(text)) {
        antwort = cfg.antwort;
        rest = cfg.belege.map(function (b) { return { typ: 'aussage', art: b.art, text: b.text, quelle: b.quelle }; });
      } else if (frage) {
        rest = [{ typ: 'luecke', bekannt: cfg.luecke }];
      } else {
        antwort = 'Notiert bei ' + cfg.name + (privat ? ' – privat, nur für dich sichtbar.' : '.');
        var punkte = ['Notiz im Verlauf von „' + cfg.name + '“ abgelegt' + (privat ? ' (privat)' : '')];
        var folgen = '';
        if (/ bis |frist|morgen|freitag|montag|nächste woche/i.test(text)) { punkte.push('Aufgabe für dich angelegt: ' + (text.length > 52 ? text.slice(0, 52) + '…' : text)); folgen = 'entfernt auch 1 Aufgabe'; }
        rest = [{ typ: 'karte', punkte: punkte, privat: privat, folgen: folgen, linkText: 'Im Verlauf ansehen', linkHref: '#verlauf' }];
        self.setState({ kcNotizen: [{ text: text, privat: privat }].concat(self.state.kcNotizen) });
      }
      self.kcStreamen(antwort, rest);
    }, 800);
  }
  kcStreamen(voll, rest) {
    var self = this;
    if (!voll) { this.setState({ kcLaden: false, kcMsgs: this.state.kcMsgs.concat(rest) }); return; }
    this.setState({ kcLaden: false, kcStream: { voll: voll, n: 0, rest: rest } });
    var t = setInterval(function () {
      var s = self.state.kcStream;
      if (!s) { clearInterval(t); return; }
      var n = Math.min(s.voll.length, s.n + 4);
      if (n >= s.voll.length) { clearInterval(t); self.setState({ kcStream: null, kcMsgs: self.state.kcMsgs.concat([{ typ: 'kollege', text: s.voll }], s.rest) }); }
      else self.setState({ kcStream: { voll: s.voll, n: n, rest: s.rest } });
    }, 30);
  }
  kcVals() {
    var self = this, st = this.state, cfg = this.kcCfg();
    var msgs = (st.kcMsgs || []).slice();
    if (st.kcStream) msgs.push({ typ: 'kollege', text: st.kcStream.voll.slice(0, st.kcStream.n), streamt: true });
    return {
      sidebarChats: this.kgChats(),
      kcName: cfg.name, kcKontext: cfg.name + ' · ' + cfg.anzahl, kcPlatzhalter: cfg.platzhalter,
      kcOffen: !!st.kcOffen, kcLaden: !!st.kcLaden,
      kcMsgs: msgs.map(function (m) { return Object.assign({ istDu: m.typ === 'du', istKollege: m.typ === 'kollege', istAussage: m.typ === 'aussage', istKarte: m.typ === 'karte', istLuecke: m.typ === 'luecke', streamt: false }, m); }),
      kcSenden: function (t) { self.kcSenden(t); },
      kcZu: function () { self.setState({ kcOffen: false }); },
      kcAuf: function () { self.setState({ kcOffen: true }); },
      kcHatMsgs: (st.kcMsgs || []).length > 0,
      kcPrivat: !!st.kcPrivat,
      kcPrivatToggle: function () { self.setState({ kcPrivat: !self.state.kcPrivat }); },
      kcNotizen: st.kcNotizen || []
    };
  }
  // „Gründungsteams · Solaro“ → Seite des Bereichs
  bereichHref(v) { var b = String(v || '').split(' · ')[0]; return ({ 'Gründungsteams': 'Gruendungsteams.dc.html', 'Events': 'Events.dc.html', 'Lehre': 'Lehre.dc.html', 'Social Media': 'SocialMedia.dc.html' })[b] || 'Main.dc.html'; }
  zuordnungen() { return ['Gründungsteams · Solaro', 'Gründungsteams · Kitchen Loop', 'Gründungsteams · Nordlicht Analytics', 'Gründungsteams · Greenbyte', 'Gründungsteams · Lern-App (Max Brandt)', 'Events · Gründungsnacht 2026', 'Events · Pitch-Abend', 'Lehre · Entrepreneurship Basics', 'Lehre · Design Thinking Workshop', 'Social Media · Pitch-Abend ankündigen', 'Social Media · Rückblick Sommerfest', 'Social Media · Porträt: Lisa Meier (Solaro)', '– (ohne Bereich)']; }
  // ——— Bearbeiten, Rückgängig, Prüfen (gemeinsam für alle Werkzeuge) ———
  basisState() { return { edits: {}, letzte: null, sel: null, pAuswahl: {}, pAlle: false, pWarumOffen: false, pWarum: '' }; }
  wert(id, feld, fallback) { var e = this.state.edits[id]; return e && e[feld] !== undefined ? e[feld] : fallback; }
  aendere(changes, label, ohneUndo) {
    var ed = Object.assign({}, this.state.edits), alt = [], self = this;
    changes.forEach(function (c) { ed[c.id] = Object.assign({}, ed[c.id]); alt.push({ id: c.id, feld: c.feld, vorher: self.wert(c.id, c.feld, c.basis) }); ed[c.id][c.feld] = c.wert; });
    this.setState({ edits: ed, letzte: { changes: alt, label: label, ohneUndo: !!ohneUndo } });
    clearTimeout(this._tt); this._tt = setTimeout(function () { self.setState({ letzte: null }); }, 9000);
  }
  toastVals() {
    var self = this, l = this.state.letzte;
    return {
      zeigeToast: !!l, toastText: l ? l.label : '', toastKannZurueck: !!l && !l.ohneUndo,
      toastZu: function () { self.setState({ letzte: null }); },
      toastUndo: function () {
        var l = self.state.letzte; if (!l) return;
        var ed = Object.assign({}, self.state.edits);
        l.changes.forEach(function (c) { ed[c.id] = Object.assign({}, ed[c.id]); ed[c.id][c.feld] = c.vorher; });
        self.setState({ edits: ed, letzte: null });
      }
    };
  }
  // Direkt bearbeitbare Felder: tippen speichert still, Verlassen des Feldes zeigt „Gespeichert · Rückgängig“
  feld(id, basis, name) {
    var self = this;
    return {
      fokus: function (e) { self._fokusAlt = e.target.value; },
      tippen: function (e) { var f = e.target.getAttribute('data-feld'); var ed = Object.assign({}, self.state.edits); ed[id] = Object.assign({}, ed[id]); ed[id][f] = e.target.value; self.setState({ edits: ed }); },
      fertig: function (e) {
        var f = e.target.getAttribute('data-feld'), neu = e.target.value, alt = self._fokusAlt;
        self._fokusAlt = undefined;
        if (alt === undefined || alt === neu) return;
        var ed = Object.assign({}, self.state.edits); ed[id] = Object.assign({}, ed[id]); ed[id][f] = alt;
        self.state.edits = ed;
        self.aendere([{ id: id, feld: f, wert: neu, basis: basis[f] }], 'Gespeichert' + (name ? ': ' + name : ''));
      },
      wahl: function (e) { var f = e.target.getAttribute('data-feld'); self.aendere([{ id: id, feld: f, wert: e.target.value, basis: basis[f] }], 'Gespeichert'); }
    };
  }
  // Filter „ungeprüft“: Mehrfachauswahl + Übernehmen / Verwerfen (+ optional Warum)
  pruefVals(items, gesamt, art) {
    var self = this, st = this.state;
    var offen = items.filter(function (i) { return i.ungeprueft && !self.wert(i.id, 'geprueft', ''); });
    var gewaehlt = st.pAlle ? offen : offen.filter(function (i) { return st.pAuswahl[i.id]; });
    var bulk = self.wert('_pruef', art, false);
    var rest = bulk ? 0 : Math.max(0, gesamt - (items.filter(function (i) { return i.ungeprueft; }).length - offen.length));
    var anzahl = st.pAlle ? rest : gewaehlt.length;
    var anwenden = function (wert) {
      var warum = self.state.pWarum.trim();
      var ch = gewaehlt.map(function (i) { return { id: i.id, feld: 'geprueft', wert: wert, basis: '' }; });
      if (self.state.pAlle) ch.push({ id: '_pruef', feld: art, wert: true, basis: false });
      self.aendere(ch,
        anzahl + ' ' + art + (wert === 'ok' ? ' übernommen' : ' verworfen') + (wert === 'weg' && warum ? ' · gemerkt: „' + warum + '“' : ''));
      self.setState({ pAuswahl: {}, pAlle: false, pWarumOffen: false, pWarum: '' });
    };
    return {
      pruefGesamt: rest, pruefAlle: st.pAlle,
      pruefAlleToggle: function () { self.setState({ pAlle: !self.state.pAlle, pAuswahl: {} }); },
      pruefZeile: anzahl ? anzahl + ' ausgewählt' : rest + ' ungeprüft · einzeln anhaken oder alle wählen',
      pruefHatAuswahl: anzahl > 0,
      pruefUebernehmen: function () { anwenden('ok'); },
      pruefWarumAuf: function () { self.setState({ pWarumOffen: !self.state.pWarumOffen }); },
      pruefWarumOffen: st.pWarumOffen && anzahl > 0,
      pruefWarum: st.pWarum, pruefWarumTippen: function (e) { self.setState({ pWarum: e.target.value }); },
      pruefVerwerfen: function (e) { if (e && e.preventDefault) e.preventDefault(); anwenden('weg'); },
      pruefWaehle: function (id) { return function () { var m = Object.assign({}, self.state.pAuswahl); m[id] = !m[id]; self.setState({ pAuswahl: m, pAlle: false }); }; },
      pruefIstGewaehlt: function (id) { return st.pAlle || !!st.pAuswahl[id]; }
    };
  }
