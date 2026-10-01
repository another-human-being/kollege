class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), { vorschlagOffen: true, tab: 'Quellen', sel: 'einrichtung', anwText: '', einladText: '', zeitraum: 'weitere 12 Monate', iq: { Mail: true, Kalender: true, Netzlaufwerk: true }, teile: [], laeuft: false });
  }
  componentWillUnmount() { clearInterval(this.timer); }
  quellen() {
    return [
      { id: 'q-mail', titel: 'Dein Postfach', fuer: 'nur du – andere sehen Inhalte nie, nur Platzhalter', konto: 'andreas@gruendung.uni-augsburg.de', zuletzt: 'vor 2 Min.', liest: 'Eingang + Gesendet', senden: 'über dieses Postfach', erklaerung: 'Was du in Kollege sendest, geht über dieses Postfach und liegt danach in Outlook unter „Gesendet“.' },
      { id: 'q-kal', titel: 'Dein Kalender', fuer: 'nur du · Termine fürs Team sichtbar, Inhalte privat markierter Termine nicht', konto: 'Outlook · persönlich + Teamkalender', zuletzt: 'vor 2 Min.', liest: 'Termine ab 12 Monate zurück', erklaerung: 'Einladungen an Externe verschickt Kollege erst, wenn du „Einladung senden“ drückst.' },
      { id: 'q-starthub', titel: 'StartHub-Postfach', fuer: 'Team-Postfach · für alle sichtbar · von Julia eingerichtet', konto: 'starthub@uni-augsburg.de', zuletzt: 'vor 4 Min.', liest: 'Eingang + Gesendet', senden: 'über dieses Postfach', erklaerung: 'Neue Anfragen ohne Zuständigkeit erscheinen auf „Heute“ unter „Neu, niemand zuständig“, bis jemand übernimmt.' },
      { id: 'q-netz', titel: 'Netzlaufwerk', fuer: 'Team · Ordner „persoenlich\\<name>“ nur für die jeweilige Person', konto: 'über deinen Rechner im Uni-Netz', zuletzt: '10:42', liest: 'Word, Excel, PowerPoint, PDF · keine Bilder', pfad: '\\\\fs.uni-augsburg.de\\gruendung', erklaerung: 'Kollege liest Dateien nur, solange ein Rechner im Uni-Netz verbunden ist. Öffnen geht immer direkt in Word oder Excel; Änderungen landen auf dem Laufwerk.' }
    ];
  }
  personen() {
    return [
      { id: 'p-julia', name: 'Julia', rolle: 'Events, Team-Postfach', mail: 'verbunden', kal: 'verbunden', zuletzt: 'vor 6 Min.' },
      { id: 'p-mehmet', name: 'Mehmet', rolle: 'Social Media, Förderberatung', mail: 'Anmeldung abgelaufen', kal: 'nicht verbunden', zuletzt: 'vor 2 Std.' }
    ].concat(this.wert('_neu', 'personen', []));
  }
  anweisungen() {
    return [
      { id: 'a1', geltung: 'Events', von: 'Julia', datum: '03.09.', angewandt: '4× angewandt', text: 'Events: Einladung 4 Wochen vorher, Erinnerung 1 Woche vorher.', beziehung: 'Für die Gründungsnacht gilt stattdessen „Einladung 6 Wochen vorher“ – die speziellere Anweisung hat Vorrang.' },
      { id: 'a1b', geltung: 'Events', von: 'Julia', datum: '22.09.', angewandt: '1× angewandt', text: 'Gründungsnacht: Einladung 6 Wochen vorher.', beziehung: 'Gilt vor „Events: Einladung 4 Wochen vorher“ (spezieller).' },
      { id: 'a2', geltung: 'Events', von: 'Julia', datum: '03.09.', angewandt: '1× angewandt', text: 'Gründungsnacht: Save-the-Date 7 Wochen vorher.' },
      { id: 'a3', geltung: 'Gründungsteams', von: 'Mehmet', datum: '01.09.', angewandt: '11× angewandt', text: 'Beratungen ohne Folgetermin nach 3 Wochen als „hängt“ melden.' },
      { id: 'a4', geltung: 'Gründungsteams', von: 'Andreas', datum: '10.09.', angewandt: '2× angewandt', text: 'EXIST-Anträge: Pitchdeck spätestens 4 Wochen vor Einreichung anfordern.' },
      { id: 'a5', geltung: 'persönlich', von: 'Andreas · im Chat', datum: '15.09.', angewandt: '6× angewandt', text: 'Mails an Gründungsteams duzen.' },
      { id: 'a0', geltung: 'persönlich', von: 'Andreas · im Chat', datum: '30.09.', angewandt: 'noch nie angewandt', text: 'Hinweise zu Social Media nur montags.' },
      { id: 'a6', geltung: 'Alle', von: 'Andreas', datum: '30.09.', angewandt: '2× angewandt', text: 'Rechnungen sind keine Gründungsteams.', beziehung: 'Entstanden beim Prüfen („Warum verworfen?“).' }
    ].concat(this.wert('_neu', 'anweisungen', []));
  }
  ausschluesse() {
    return [
      { id: 'x1', art: 'Ordner', wert: 'Posteingang / Privat', geltung: 'persönlich', von: 'Andreas', wirkung: '312 Mails nicht gelesen' },
      { id: 'x2', art: 'Absender', wert: 'personalabteilung@uni-augsburg.de', geltung: 'Team', von: 'Julia', wirkung: '48 Mails nicht gelesen' },
      { id: 'x3', art: 'Domain', wert: '@steuerberatung-huber.de', geltung: 'persönlich', von: 'Andreas', wirkung: '12 Mails nicht gelesen' },
      { id: 'x4', art: 'Ordner', wert: 'Bewerbungen', geltung: 'Team', von: 'Mehmet', wirkung: '96 Mails nicht gelesen' }
    ].concat(this.wert('_neu', 'aus', []));
  }
  bereiche() {
    return [
      { id: 'gruendungsteams', name: 'Gründungsteams', spalten: ['Team', 'Phase', 'betreut von', 'letzter Kontakt', 'nächster Schritt'], phasen: ['Idee', 'Vorgründung', 'gegründet'], umfang: '3 aktiv · 52 ungeprüft', grund: '412 Mails mit 23 Teams, Ordner „Beratungen“ auf dem Netzlaufwerk' },
      { id: 'events', name: 'Events', spalten: ['Event', 'Datum', 'zuständig', 'Phase'], phasen: ['Planung', 'Einladung raus', 'vorbei'], umfang: '3 · 31 ungeprüft', grund: 'Ordner „Events“, 6 Veranstaltungen mit Einladungen an Verteiler' },
      { id: 'lehre', name: 'Lehre', spalten: ['Veranstaltung', 'Semester', 'nächste Sitzung'], phasen: [], umfang: '3 · 14 ungeprüft', grund: 'Ordner „Lehre“, wiederkehrende Termine im Hörsaal' },
      { id: 'socialmedia', name: 'Social Media', spalten: ['Beitrag', 'geplant für', 'Kanal', 'Phase'], phasen: ['Entwurf', 'geplant', 'veröffentlicht'], umfang: '5 · 21 ungeprüft', grund: 'Redaktionsplan, Instagram- und LinkedIn-Benachrichtigungen' }
    ].concat(this.wert('_neu', 'bereiche', []));
  }
  lebt(x) { return !this.wert(x.id, 'geloescht', false); }
  starten() {
    var self = this, st = this.state, f = { 'weitere 12 Monate': 1, 'weitere 24 Monate': 2, 'seit 2019': 6 }[st.zeitraum];
    var teile = [];
    if (st.iq.Mail) teile.push({ text: 'Mails', wert: 0, max: 5200 * f });
    if (st.iq.Kalender) teile.push({ text: 'Termine', wert: 0, max: 700 * f });
    if (st.iq.Netzlaufwerk) teile.push({ text: 'Dateien', wert: 0, max: 900 * f });
    if (!teile.length) return;
    this.setState({ teile: teile, laeuft: true });
    clearInterval(this.timer);
    this.timer = setInterval(function () {
      var t = self.state.teile.map(function (x) { return Object.assign({}, x, { wert: Math.min(x.max, x.wert + Math.ceil(x.max / 50)) }); });
      var fertig = t.every(function (x) { return x.wert >= x.max; });
      self.setState({ teile: t, laeuft: !fertig });
      if (fertig) { clearInterval(self.timer); self.aendere([], 'Import fertig – Neues steht in den Listen unter „ungeprüft“', true); }
    }, 120);
  }
  renderVals() {
    var self = this, st = this.state;
    var Q = this.quellen(), Pp = this.personen(), A = this.anweisungen().filter(function (a) { return self.lebt(a); }), X = this.ausschluesse().filter(function (x) { return self.lebt(x); });
    var verb = function (q) { return self.wert(q.id, 'verbunden', true); };
    var BR0 = this.bereiche(), reihe = this.wert('_reihe', 'liste', null) || BR0.map(function (b) { return b.id; });
    var BR = reihe.map(function (id) { return BR0.filter(function (b) { return b.id === id; })[0]; }).filter(Boolean);
    var istQ = st.tab === 'Quellen';
    var mehmetOk = this.wert('p-mehmet', 'erinnert', false);
    var zeile = function (id, titel, meta, unter, metaStil) { return { titel: titel, meta: meta, unter: unter, metaStil: metaStil || '', aktiv: st.sel === id ? 'true' : 'false', los: function () { self.setState({ sel: id }); } }; };
    var gruppen;
    if (istQ) {
      var offenListe = [];
      if (!Q.every(verb)) offenListe.push('eine Quelle ist getrennt');
      if (!mehmetOk) offenListe.push('Mehmet erinnern');
      var offeneSchritte = offenListe.length;
      gruppen = [
        { titel: 'Einrichtung', zeilen: [zeile('einrichtung', 'Einrichtung', offeneSchritte ? (5 - offeneSchritte) + ' von 5' : '5 von 5', offeneSchritte ? 'Noch offen: ' + offenListe.join(', ') : 'abgeschlossen', offeneSchritte ? 'color: var(--attention)' : '')] },
        { titel: 'Quellen', zeilen: Q.map(function (q) { return zeile(q.id, q.titel, verb(q) ? 'verbunden' : 'getrennt', q.konto + ' · ' + q.zuletzt, verb(q) ? '' : 'color: var(--attention)'); }) },
        { titel: 'Team', zeilen: Pp.map(function (p) { var warn = p.mail !== 'verbunden'; return zeile(p.id, p.name, warn ? (self.wert(p.id, 'erinnert', false) ? 'erinnert' : 'fehlt') : 'verbunden', 'Mail: ' + p.mail + ' · Kalender: ' + p.kal, warn && !self.wert(p.id, 'erinnert', false) ? 'color: var(--attention)' : ''); }) },
        { titel: 'Import', zeilen: [zeile('import', 'Import · 12 Monate', '214 ungeprüft', 'Okt. 2025 – Sep. 2026 · abgeschlossen 28.09.')] }
      ];
    } else if (st.tab === 'Bereiche') {
      gruppen = [{ titel: 'Reihenfolge wie in der Seitenleiste', zeilen: BR.map(function (b, i) { return zeile('b-' + b.id, self.wert(b.id, 'name', b.name), (i + 1) + '.', self.wert(b.id, 'spalten', b.spalten).length + ' Spalten · ' + (b.umfang || 'neu')); }).concat([{ titel: '+ Bereich', meta: '', unter: 'z. B. Partner und Kooperationen', metaStil: '', aktiv: 'false', los: function () {
        var id = 'bn' + Date.now(); self.setState({ sel: 'b-' + id });
        self.aendere([{ id: '_neu', feld: 'bereiche', wert: self.wert('_neu', 'bereiche', []).concat([{ id: id, name: 'Neuer Bereich', spalten: ['Titel', 'zuständig'], phasen: ['offen', 'erledigt'], umfang: '' }]), basis: [] }, { id: '_reihe', feld: 'liste', wert: reihe.concat([id]), basis: null }], 'Bereich angelegt – erscheint in der Seitenleiste unter „Bereiche“');
      } }]) }];
    } else {
      gruppen = [
        { titel: 'Anweisungen · ' + A.length, zeilen: A.map(function (a) { return zeile(a.id, self.wert(a.id, 'text', a.text), self.wert(a.id, 'geltung', a.geltung), a.von + ' · ' + a.angewandt); }) },
        { titel: 'Ausschlüsse · ' + X.length, zeilen: X.map(function (x) { return zeile(x.id, self.wert(x.id, 'wert', x.wert), self.wert(x.id, 'art', x.art), (self.wert(x.id, 'geltung', x.geltung) === 'Team' ? 'alle Postfächer' : 'dein Postfach') + ' · ' + x.wirkung); }).concat([{ titel: '+ Ausschluss hinzufügen', meta: '', unter: 'Absender, Domain oder Ordner', metaStil: '', aktiv: 'false', los: function () {
          var id = 'xn' + Date.now(); self.setState({ sel: id });
          self.aendere([{ id: '_neu', feld: 'aus', wert: self.wert('_neu', 'aus', []).concat([{ id: id, art: 'Domain', wert: '@beispiel.de', geltung: 'persönlich', von: 'Andreas', wirkung: 'wird nach dem Speichern berechnet' }]), basis: [] }], 'Ausschluss angelegt – Wert rechts eintragen');
        } }]) }
      ];
    }
    var sel = st.sel;
    var q = Q.filter(function (x) { return x.id === sel; })[0], p = Pp.filter(function (x) { return x.id === sel; })[0];
    var a = A.filter(function (x) { return x.id === sel; })[0], x = X.filter(function (y) { return y.id === sel; })[0];
    var qv = {}, tv = {}, av = {}, xv = {};
    if (q) {
      var on = verb(q);
      qv = { f: this.feld(q.id, q, 'Quelle'), titel: q.titel, fuer: q.fuer, konto: q.konto, liest: q.liest, erklaerung: q.erklaerung,
        status: on ? 'verbunden' : 'getrennt – nichts wird gelesen', statusStil: on ? '' : 'color: var(--attention)',
        zuletzt: on ? this.wert(q.id, 'zuletzt', q.zuletzt) : '–', verbunden: on, getrennt: !on,
        hatPfad: !!q.pfad, pfad: this.wert(q.id, 'pfad', q.pfad || ''), hatSenden: !!q.senden, senden: this.wert(q.id, 'senden', q.senden || ''),
        sync: function () { self.aendere([{ id: q.id, feld: 'zuletzt', wert: 'gerade eben', basis: q.zuletzt }], q.titel + ' abgeglichen', true); },
        trennen: function () { self.aendere([{ id: q.id, feld: 'verbunden', wert: false, basis: true }], q.titel + ' getrennt'); },
        verbinden: function () { self.aendere([{ id: q.id, feld: 'verbunden', wert: true, basis: true }], q.titel + ' verbunden'); } };
    }
    if (p) {
      var er = this.wert(p.id, 'erinnert', false), fehlt = p.mail !== 'verbunden';
      tv = { name: p.name, rolle: p.rolle,
        quellen: [{ name: 'Mail', status: p.mail, zuletzt: p.zuletzt, stil: p.mail === 'verbunden' ? '' : 'color: var(--attention)' }, { name: 'Kalender', status: p.kal, zuletzt: p.kal === 'verbunden' ? p.zuletzt : '–', stil: p.kal === 'verbunden' ? '' : 'color: var(--attention)' }],
        hatAktion: fehlt, aktionText: er ? 'Erneut erinnern' : (p.neu ? 'Einladung erneut senden' : 'Erinnern'),
        aktion: function () { self.aendere([{ id: p.id, feld: 'erinnert', wert: true, basis: false }], p.name + ' bekommt eine Erinnerung per Mail'); } };
    }
    if (a) {
      av = { f: this.feld(a.id, a, 'Anweisung'), text: this.wert(a.id, 'text', a.text), geltung: this.wert(a.id, 'geltung', a.geltung), von: a.von, datum: a.datum, angewandt: a.angewandt,
        hatBeziehung: !!a.beziehung, beziehung: a.beziehung || '',
        loeschen: function () { self.setState({ sel: null }); self.aendere([{ id: a.id, feld: 'geloescht', wert: true, basis: false }], 'Anweisung gelöscht'); } };
    }
    if (x) {
      xv = { f: this.feld(x.id, x, 'Ausschluss'), art: this.wert(x.id, 'art', x.art), wert: this.wert(x.id, 'wert', x.wert), geltung: this.wert(x.id, 'geltung', x.geltung), wirkung: x.wirkung,
        entfernen: function () { self.setState({ sel: null }); self.aendere([{ id: x.id, feld: 'geloescht', wert: true, basis: false }], 'Ausschluss entfernt – Mails werden wieder gelesen'); } };
    }
    var schritte = [
      { nr: '1', titel: 'Eigene Quellen verbinden', ok: verb(Q[0]) && verb(Q[1]), text: 'Postfach und Kalender – nur du siehst die Inhalte.', knopf: 'ansehen', ziel: 'q-mail' },
      { nr: '2', titel: 'StartHub-Postfach und Netzlaufwerk', ok: verb(Q[2]) && verb(Q[3]), text: 'Team-Postfach (von Julia eingerichtet) und \\\\fs.uni-augsburg.de\\gruendung.', knopf: 'ansehen', ziel: 'q-starthub' },
      { nr: '3', titel: 'Team einladen', ok: mehmetOk, text: mehmetOk ? 'Mehmet ist erinnert; sein Postfach fehlt, bis er sich anmeldet.' : 'Julia ist verbunden. Mehmets Anmeldung ist abgelaufen.', knopf: mehmetOk ? 'ansehen' : 'Mehmet erinnern', ziel: 'p-mehmet' },
      { nr: '4', titel: 'Bereiche festlegen', ok: !!this.wert('_einr', 'bereicheOk', true), text: 'Kollege schlägt Bereiche vor, ihr bestätigt oder passt an.', knopf: st.vorschlagOffen ? 'Vorschlag ausblenden' : 'Vorschlag ansehen', ziel: '_vorschlag' },
      { nr: '5', titel: 'Import der letzten 12 Monate', ok: true, text: '5.640 Mails, 760 Termine, 1.240 Dateien gelesen · 214 Einträge ungeprüft.', knopf: 'ansehen', ziel: 'import' }
    ];
    var bsel = BR.filter(function (b) { return 'b-' + b.id === st.sel; })[0], bv = {};
    if (bsel) {
      var sp = this.wert(bsel.id, 'spalten', bsel.spalten), ph = this.wert(bsel.id, 'phasen', bsel.phasen), pos = reihe.indexOf(bsel.id);
      var setSp = function (n, l) { self.aendere([{ id: bsel.id, feld: 'spalten', wert: n, basis: bsel.spalten }], l); };
      var setPh = function (n, l) { self.aendere([{ id: bsel.id, feld: 'phasen', wert: n, basis: bsel.phasen }], l); };
      var schieb = function (d) { return function () { var r = reihe.slice(), j = pos + d; if (j < 0 || j >= r.length) return; r[pos] = r[j]; r[j] = bsel.id; self.aendere([{ id: '_reihe', feld: 'liste', wert: r, basis: null }], 'Reihenfolge geändert'); }; };
      bv = { f: this.feld(bsel.id, bsel, 'Bereich'), name: this.wert(bsel.id, 'name', bsel.name), position: (pos + 1) + ' von ' + reihe.length, hoch: schieb(-1), runter: schieb(1),
        spalten: sp.map(function (s, i) { return { name: s, nr: String(i + 1), erste: i === 0, nichtErste: i > 0, htmlId: 'sp-' + i,
          aendern: function (e) { var n = sp.slice(); n[i] = e.target.value; setSp(n, 'Spalte umbenannt: ' + e.target.value); },
          weg: function () { setSp(sp.filter(function (x, j) { return j !== i; }), 'Spalte entfernt: ' + s); } }; }),
        spaltenZeile: sp.length + ' von max. 5', kannSpalte: sp.length < 5, voll: sp.length >= 5,
        spalteDazu: function () { if (sp.length >= 5) return; setSp(sp.concat(['Neue Spalte']), 'Spalte ergänzt'); },
        phasen: ph.map(function (p) { return { name: p, wegLabel: 'Phase entfernen: ' + p, weg: function () { setPh(ph.filter(function (x) { return x !== p; }), 'Phase entfernt: ' + p); } }; }),
        keinePhasen: ph.length === 0,
        phaseText: st.phaseText || '', phaseTippen: function (e) { self.setState({ phaseText: e.target.value }); },
        phaseDazu: function (e) { if (e && e.preventDefault) e.preventDefault(); var t = (self.state.phaseText || '').trim(); if (!t) return; self.setState({ phaseText: '' }); setPh(ph.concat([t]), 'Phase ergänzt: ' + t); },
        umfang: bsel.umfang || 'noch leer', seite: { gruendungsteams: 'Gruendungsteams.dc.html', events: 'Events.dc.html', lehre: 'Lehre.dc.html', socialmedia: 'SocialMedia.dc.html' }[bsel.id] || 'Einstellungen.dc.html' };
    }
    var faktor = { 'weitere 12 Monate': 1, 'weitere 24 Monate': 2, 'seit 2019': 6 }[st.zeitraum];
    return Object.assign(this.toastVals(), {
      sidebarChats: this.kgChats(),
      tabs: ['Quellen', 'Bereiche', 'Anweisungen'], tab: st.tab, tBereiche: st.tab === 'Bereiche',
      setTab: function (w) { self.setState({ tab: w, sel: w === 'Quellen' ? 'einrichtung' : w === 'Bereiche' ? 'b-gruendungsteams' : 'a1' }); },
      vorschlagOffen: !!st.vorschlagOffen,
      vorschlag: BR0.slice(0, 4).map(function (b) { return { name: b.name, grund: b.grund, spalten: b.spalten.join(' · ') }; }),
      vorschlagOk: !!this.wert('_einr', 'bereicheOk', true),
      vorschlagPasst: function () { self.aendere([{ id: '_einr', feld: 'bereicheOk', wert: true, basis: true }], 'Bereiche bestätigt – Import ordnet danach zu'); self.setState({ vorschlagOffen: false }); },
      vorschlagAnpassen: function () { self.setState({ tab: 'Bereiche', sel: 'b-gruendungsteams' }); },
      dBereich: !!bv.name, bv: bv,
      geltungen: ['Alle'].concat(BR.map(function (b) { return self.wert(b.id, 'name', b.name); })).concat(['persönlich']),
      tQuellen: istQ, tAnw: !istQ,
      gruppen: gruppen,
      anwText: st.anwText, anwTippen: function (e) { self.setState({ anwText: e.target.value }); },
      anwHinzu: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var t = self.state.anwText.trim(); if (!t) return;
        var id = 'an' + Date.now();
        self.setState({ anwText: '', sel: id });
        self.aendere([{ id: '_neu', feld: 'anweisungen', wert: self.wert('_neu', 'anweisungen', []).concat([{ id: id, geltung: 'persönlich', von: 'Andreas', datum: 'gerade eben', angewandt: 'noch nie angewandt', text: t }]), basis: [] }], 'Anweisung gespeichert – gilt ab jetzt');
      },
      einladText: st.einladText, einladTippen: function (e) { self.setState({ einladText: e.target.value }); },
      einladen: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var t = self.state.einladText.trim(); if (!t) return;
        var id = 'pn' + Date.now(), name = t.split('@')[0].split('.').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ');
        self.setState({ einladText: '', sel: id });
        self.aendere([{ id: '_neu', feld: 'personen', wert: self.wert('_neu', 'personen', []).concat([{ id: id, name: name, rolle: t, mail: 'eingeladen', kal: 'eingeladen', zuletzt: '–', neu: true }]), basis: [] }], 'Einladung an ' + t + ' gesendet');
      },
      dEinrichtung: sel === 'einrichtung', dQuelle: !!q, dPerson: !!p, dImport: sel === 'import', dAnweisung: !!a, dAusschluss: !!x,
      dLeer: !(sel === 'einrichtung' || q || p || sel === 'import' || a || x || bsel),
      q: qv, t: tv, a: av, x: xv,
      einrichtungZeile: schritte.filter(function (s) { return s.ok; }).length + ' von 5 Schritten erledigt · jede Person verbindet ihr eigenes Postfach',
      schritte: schritte.map(function (s) { return { nr: s.nr, titel: s.titel, text: s.text, knopf: s.knopf, status: s.ok ? '✓ erledigt' : 'offen', statusKlasse: s.ok ? 'schritt-ok' : 'schritt-offen',
        los: s.ziel === '_vorschlag' ? function () { self.setState({ vorschlagOffen: !self.state.vorschlagOffen }); } : s.knopf === 'Mehmet erinnern' ? function () { self.aendere([{ id: 'p-mehmet', feld: 'erinnert', wert: true, basis: false }], 'Mehmet bekommt eine Erinnerung per Mail'); } : function () { self.setState({ sel: s.ziel }); } }; }),
      ausAnzahl: X.length,
      zuAusschluessen: function () { self.setState({ tab: 'Anweisungen', sel: X.length ? X[0].id : null }); },
      importErgebnis: [{ was: 'Zeitraum', wert: 'Okt. 2025 – Sep. 2026' }, { was: 'Gelesen', wert: '5.640 Mails · 760 Termine · 1.240 Dateien' }, { was: 'Zugeordnet', wert: '1.180 Einträge zu Bereichen und Personen' }, { was: 'Neu angelegt', wert: 'Gründungsteams 52 · Events 31 · Lehre 14 · Social Media 21 · Kontakte 88 · Aufgaben 5 · Dateien 3' }],
      zeitraeume: ['weitere 12 Monate', 'weitere 24 Monate', 'seit 2019'], zeitraum: st.zeitraum, setZeitraum: function (w) { self.setState({ zeitraum: w }); },
      importQuellen: ['Mail', 'Kalender', 'Netzlaufwerk'].map(function (n) { return { name: n, an: !!st.iq[n], toggle: function () { var m = Object.assign({}, self.state.iq); m[n] = !m[n]; self.setState({ iq: m }); } }; }),
      schaetzung: 'etwa ' + (5200 * faktor).toLocaleString('de-DE') + ' Mails · Dauer etwa ' + ({ 1: '30 Min.', 2: '1 Std.', 6: '3 Std.' })[faktor],
      importStarten: function () { self.starten(); }, importLaeuft: st.laeuft,
      teile: st.teile.map(function (t) { return { text: t.text, zahl: t.wert.toLocaleString('de-DE') + ' / ' + t.max.toLocaleString('de-DE'), breite: 'width: ' + Math.round(100 * t.wert / t.max) + '%' }; })
    });
  }
}
