class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { tSort: null, mKonf: {}, ansicht: 'Personen', filter: 'alle', liste: 'Alle Listen', sortierung: 'Name A–Z', suche: '', sel: 'lisa', oSel: 'solaro', merge: null, mWahl: null });
  }
  kcCfg() {
    var p = this.aktPerson();
    return { name: p ? this.wert(p.id, 'name', p.name) : 'Kontakte', anzahl: 'Mails, Termine, Bereiche', platzhalter: 'Frag oder notiere etwas zu dieser Person',
      antwort: 'Lisa hat zuletzt gestern den Pitchdeck-Entwurf geschickt, noch ohne Finanzteil. Offen von unserer Seite ist der Kontakt zu Frau Weber.',
      belege: [{ art: 'belegt', text: 'Pitchdeck-Entwurf ohne Finanzteil', quelle: 'Mail 29.09.' }, { art: 'belegt', text: 'Kontakt Frau Weber zugesagt', quelle: 'Chat 30.09.' }],
      luecke: 'Wie Lisa zu Terminen am Wochenende steht, kann ich aus ihren Mails nicht sagen.' };
  }
  personen() {
    return this.wert('_neu', 'personen', []).concat(this.kontaktDaten().personen);
  }
  orgs() {
    return this.wert('_neu', 'orgs', []).concat(this.kontaktDaten().orgs);
  }
  vorgaengeFuer(orgId) {
    return ({
      solaro: [{ titel: 'Gründungsteams · Solaro', info: 'Vorgründung · Andreas', href: 'Gruendungsteams.dc.html' }, { titel: 'Events · Pitch-Abend', info: 'pitcht', href: 'Events.dc.html' }],
      kl: [{ titel: 'Gründungsteams · Kitchen Loop', info: 'Vorgründung · Julia', href: 'Gruendungsteams.dc.html' }],
      nord: [{ titel: 'Gründungsteams · Nordlicht Analytics', info: 'hängt seit 23 Tagen', href: 'Gruendungsteams.dc.html' }],
      ihk: [{ titel: 'Events · Pitch-Abend', info: 'Jury', href: 'Events.dc.html' }],
      stw: [{ titel: 'Gründungsteams · Kitchen Loop', info: 'Mensa-Pilot', href: 'Gruendungsteams.dc.html' }],
      uni: [{ titel: 'Lehre · Entrepreneurship Basics', info: 'WS 26/27', href: 'Lehre.dc.html' }],
      green: [{ titel: 'Gründungsteams · Greenbyte', info: 'ungeprüft', href: 'Gruendungsteams.dc.html' }]
    })[orgId] || [];
  }
  listenStart() { return { lisa: ['Gründerinnen-Porträts'], weber: ['Jury'], albrecht: ['Mentor:innen', 'Jury'], hartmann: ['Jury', 'Lehre'], vogt: ['Partner'], lang: ['Partner'], sara: ['Newsletter'], ben: ['Newsletter'], tom: ['Newsletter'], jonas: ['Newsletter'] }; }
  alleListen() { return ['Jury', 'Mentor:innen', 'Partner', 'Newsletter', 'Gründerinnen-Porträts', 'Lehre']; }
  orgName(x) { var id = this.wert(x.id, 'orgId', x.orgId); if (!id) return '–'; var o = this.orgs().filter(function (y) { return y.id === id; })[0]; return o ? this.wert(o.id, 'name', o.name) : '–'; }
  lebend(x) { return !this.wert(x.id, 'geloescht', false) && this.wert(x.id, 'geprueft', '') !== 'weg' && !this.wert(x.id, 'zusammengefuehrt', false); }
  aktPerson() { var self = this; return this.personen().filter(function (p) { return p.id === self.state.sel && self.lebend(p); })[0]; }
  renderVals() {
    var self = this, st = this.state, istP = st.ansicht === 'Personen';
    var alleP = this.personen(), alleO = this.orgs();
    var roh = istP ? alleP : alleO;
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(roh, istP ? 57 : 31, istP ? 'Personen' : 'Organisationen');
    var ung = function (x) { return !!x.ungeprueft && !self.wert(x.id, 'geprueft', ''); };
    var q = st.suche.trim().toLowerCase();
    var LS = this.listenStart();
    var liste = roh.filter(function (x) {
      if (!self.lebend(x)) return false;
      if (pruef) return ung(x);
      if (st.filter === 'Dubletten?') return !!x.dublette;
      if (ung(x)) return false;
      var rolle = istP ? self.wert(x.id, 'rolle', x.rolle) : self.wert(x.id, 'art', x.art);
      if (st.filter !== 'alle' && rolle !== st.filter) return false;
      if (istP && st.liste !== 'Alle Listen' && self.wert(x.id, 'listen', LS[x.id] || []).indexOf(st.liste) < 0) return false;
      var text = istP ? self.wert(x.id, 'name', x.name) + ' ' + self.orgName(x) + ' ' + self.wert(x.id, 'adressen', x.adressen).map(function (a) { return a.adresse; }).join(' ') : self.wert(x.id, 'name', x.name);
      return !q || text.toLowerCase().indexOf(q) >= 0;
    });
    if (st.sortierung === 'Name A–Z') liste = liste.slice().sort(function (a, b) { return self.wert(a.id, 'name', a.name).replace(/^(Prof\. |Dr\. )+/, '') < self.wert(b.id, 'name', b.name).replace(/^(Prof\. |Dr\. )+/, '') ? -1 : 1; });
    if (st.sortierung === 'Zuletzt kontaktiert') liste = liste.slice().sort(function (a, b) { return (a.tage || 0) - (b.tage || 0); });
    if (st.sortierung === 'Organisation') liste = liste.slice().sort(function (a, b) { return self.orgName(a) < self.orgName(b) ? -1 : 1; });
    if (st.sortierung === 'Art') liste = liste.slice().sort(function (a, b) { return self.wert(a.id, 'art', a.art) < self.wert(b.id, 'art', b.art) ? -1 : 1; });
    var tabelle = liste.map(function (x) {
      var adr = istP ? self.wert(x.id, 'adressen', x.adressen) : [];
      return { id: x.id, tage: x.tage || 0, aktiv: (istP ? x.id === st.sel : x.id === st.oSel) ? 'true' : 'false', zellen: istP ? [self.wert(x.id, 'name', x.name), self.orgName(x), self.wert(x.id, 'rolle', x.rolle), adr.length ? adr[0].adresse : '–', self.wert(x.id, 'telefon', x.telefon || '–'), self.wert(x.id, 'ueber', x.ueber), x.letzter, self.wert(x.id, 'listen', LS[x.id] || []).join(', ') || '–']
        : [self.wert(x.id, 'name', x.name), self.wert(x.id, 'art', x.art), self.wert(x.id, 'web', x.web || '–'), self.wert(x.id, 'ort', x.ort || '–'), self.wert(x.id, 'ueber', x.ueber)],
        los: function () { var s = { zu: false, merge: null, kcOffen: false }; if (istP) s.sel = x.id; else s.oSel = x.id; self.setState(s); } };
    });
    if (st.tSort) tabelle.sort(function (a, b) { var i = st.tSort.i, x = istP && i === 6 ? a.tage : a.zellen[i], y = istP && i === 6 ? b.tage : b.zellen[i]; var r = x < y ? -1 : x > y ? 1 : 0; return st.tSort.auf ? r : -r; });
    var kopfNamen = istP ? ['Name', 'Organisation', 'Rolle', 'E-Mail', 'Telefon', 'Kontakt über', 'letzter Kontakt', 'Listen'] : ['Organisation', 'Art', 'Website', 'Ort', 'Kontakt über'];
    var tabelleKopf = kopfNamen.map(function (n, i) { var an = st.tSort && st.tSort.i === i; return { name: n + (an ? (st.tSort.auf ? ' ↑' : ' ↓') : ''), sort: an ? (st.tSort.auf ? 'ascending' : 'descending') : 'none', los: function () { var t = self.state.tSort; self.setState({ tSort: { i: i, auf: !(t && t.i === i && t.auf) } }); } }; });
    var zeilen = liste.map(function (x) {
      var aktiv = istP ? x.id === st.sel : x.id === st.oSel;
      var unter;
      if (istP) unter = self.wert(x.id, 'rolle', x.rolle) + ' · ' + self.orgName(x) + ' · ' + (pruef ? x.grund : 'zuletzt ' + x.letzter);
      else { var n = alleP.filter(function (p) { return self.lebend(p) && self.wert(p.id, 'orgId', p.orgId) === x.id; }).length; unter = self.wert(x.id, 'art', x.art) + ' · ' + n + (n === 1 ? ' Person' : ' Personen') + (pruef ? ' · ' + x.grund : ''); }
      return { titel: self.wert(x.id, 'name', x.name), ueber: self.wert(x.id, 'ueber', x.ueber), unter: unter,
        unterStil: '',
        pruef: pruef, normal: !pruef, aktiv: aktiv ? 'true' : 'false',
        gewaehlt: P.pruefIstGewaehlt(x.id), waehlen: P.pruefWaehle(x.id),
        los: function () { var s = { zu: false, merge: null, mWahl: null, kcOffen: false }; if (istP) s.sel = x.id; else s.oSel = x.id; self.setState(s); } };
    });
    var orgNamen = [{ id: '', name: '–' }].concat(alleO.filter(function (o) { return self.lebend(o); }).map(function (o) { return { id: o.id, name: self.wert(o.id, 'name', o.name) }; }));

    // ——— Person ———
    var p = istP ? this.aktPerson() : null, pv = {};
    if (p) {
      var adr = this.wert(p.id, 'adressen', p.adressen);
      var setAdr = function (neu, label) { self.aendere([{ id: p.id, feld: 'adressen', wert: neu, basis: p.adressen }], label); };
      var istLisa = p.id === 'lisa';
      var verlauf = istLisa ? [
        { monat: 'September 2026', datum: '30.09.', art: 'Notiz', text: 'Beratung EXIST-Antrag: Pitchdeck final bis Freitag', quelle: 'Chat' },
        { monat: 'September 2026', datum: '29.09.', art: 'Mail', text: 'Pitchdeck-Entwurf (ohne Finanzteil)', quelle: 'Mail', herkunft: 'Eingang' },
        { monat: 'September 2026', datum: '28.09.', art: 'Mail', text: 'Lisa (gmx): Kurze Frage zum Termin', quelle: 'Mail', herkunft: 'Eingang' },
        { monat: 'September 2026', datum: '24.09.', art: 'Mail', text: 'EXIST-Merkblatt an Lisa', quelle: 'Mail', herkunft: 'aus Outlook' },
        { monat: 'September 2026', datum: '21.09.', art: 'Mail', text: 'Mail von Julia an Lisa Meier · Inhalt nur für Julia', privat: true, privatFuer: 'Julia' },
        { monat: 'September 2026', datum: '12.09.', art: 'Mail', text: 'Fragen zum Gründungsstipendium', quelle: 'Mail', herkunft: 'Eingang' }
      ] : [{ monat: 'September 2026', datum: p.tage === 0 ? '30.09.' : 'vor ' + p.tage + ' Tagen', art: p.letzter.split('· ')[1] || 'Mail', text: 'Letzter Kontakt', quelle: p.letzter.split(' · ')[1] || 'Mail' }];
      var vgs = this.vorgaengeFuer(this.wert(p.id, 'orgId', p.orgId));
      pv = {
        f: this.feld(p.id, p, 'Kontakt'),
        name: this.wert(p.id, 'name', p.name), rolle: this.wert(p.id, 'rolle', p.rolle), orgId: this.wert(p.id, 'orgId', p.orgId) || '',
        notizFokus: function () { try { document.getElementById('k-notiz').focus(); } catch (e) {} },
        telefon: this.wert(p.id, 'telefon', p.telefon || ''), notiz: this.wert(p.id, 'notiz', p.notiz || ''),
        ueber: this.wert(p.id, 'ueber', p.ueber), ueberBerechnet: p.mails,
        letzter: p.letzter, letzterStil: p.tage >= 30 ? 'color: var(--attention)' : '',
        zurOrg: function () { var n = self.wert(p.id, 'orgId', p.orgId); var o = alleO.filter(function (o) { return o.id === n; })[0]; if (o) self.setState({ ansicht: 'Organisationen', oSel: o.id, filter: 'alle', merge: null }); },
        adressen: adr.map(function (a, i) {
          return { adresse: a.adresse, info: a.info || 'von Hand', htmlId: 'k-adr-' + i,
            fokus: function (e) { self._adrAlt = adr; },
            tippen: function (e) { var n = adr.slice(); n[i] = Object.assign({}, a, { adresse: e.target.value }); var ed = Object.assign({}, self.state.edits); ed[p.id] = Object.assign({}, ed[p.id], { adressen: n }); self.setState({ edits: ed }); },
            fertig: function () { var alt = self._adrAlt; self._adrAlt = undefined; if (!alt || alt[i] && alt[i].adresse === adr[i].adresse) return; var ed = Object.assign({}, self.state.edits); ed[p.id] = Object.assign({}, ed[p.id], { adressen: alt }); self.state.edits = ed; setAdr(adr, 'Adresse gespeichert'); },
            weg: function () { setAdr(adr.filter(function (x, j) { return j !== i; }), 'Adresse entfernt: ' + a.adresse); } };
        }),
        adresseDazu: function () { setAdr(adr.concat([{ adresse: '', info: 'neu · von Hand' }]), 'Adresszeile ergänzt – jetzt eintippen'); },
        vorgaenge: vgs, vorgaengeAnzahl: vgs.length, keineVorgaenge: vgs.length === 0,
        verlauf: verlauf,
        listen: self.wert(p.id, 'listen', LS[p.id] || []).map(function (l) { var cur = self.wert(p.id, 'listen', LS[p.id] || []); return { name: l, wegLabel: 'Aus Liste entfernen: ' + l, weg: function () { self.aendere([{ id: p.id, feld: 'listen', wert: cur.filter(function (y) { return y !== l; }), basis: LS[p.id] || [] }], 'Aus „' + l + '“ entfernt'); } }; }),
        listenMoeglich: self.alleListen().filter(function (l) { return self.wert(p.id, 'listen', LS[p.id] || []).indexOf(l) < 0; }),
        listeDazu: function (e) { var l = e.target.value; if (!l) return; self.aendere([{ id: p.id, feld: 'listen', wert: self.wert(p.id, 'listen', LS[p.id] || []).concat([l]), basis: LS[p.id] || [] }], 'Zu „' + l + '“ hinzugefügt'); },
        telHref: 'tel:' + String(self.wert(p.id, 'telefon', p.telefon || '')).replace(/\s/g, ''), hatTel: !!self.wert(p.id, 'telefon', p.telefon || ''),
        anrufen: function () { self.aendere([], 'Anruf über dein Telefon – danach fragt Kollege „Was kam raus?“', true); },
        loeschen: function () { self.aendere([{ id: p.id, feld: 'geloescht', wert: true, basis: false }], 'Gelöscht: ' + self.wert(p.id, 'name', p.name)); },
        istUngeprueft: ung(p), grund: p.grund || '', quelle: p.quelle || '',
        uebernehmen: function () { self.aendere([{ id: p.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + p.name); },
        verwerfen: function () { self.aendere([{ id: p.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + p.name); }
      };
    }
    // ——— Organisation ———
    var o = !istP ? alleO.filter(function (x) { return x.id === st.oSel && self.lebend(x); })[0] : null, ov = {};
    if (o) {
      var oname = this.wert(o.id, 'name', o.name);
      var leute = alleP.filter(function (x) { return self.lebend(x) && self.wert(x.id, 'orgId', x.orgId) === o.id; });
      var ovg = this.vorgaengeFuer(o.id);
      ov = {
        f: this.feld(o.id, o, 'Organisation'),
        name: oname, art: this.wert(o.id, 'art', o.art), web: this.wert(o.id, 'web', o.web || ''), ort: this.wert(o.id, 'ort', o.ort || ''), telefon: this.wert(o.id, 'telefon', o.telefon || ''), mail: this.wert(o.id, 'mail', o.mail || ''),
        verlauf: leute.slice().sort(function (a, b) { return (a.tage || 0) - (b.tage || 0); }).map(function (x) { return { monat: 'September 2026', datum: x.tage === 0 ? 'heute' : 'vor ' + x.tage + (x.tage === 1 ? ' Tag' : ' Tagen'), art: (x.letzter || '').split(' · ')[1] || 'Mail', text: self.wert(x.id, 'name', x.name) + ': letzter Kontakt', quelle: (x.letzter || '').split(' · ')[1] || '' }; }),
        keinVerlauf: leute.length === 0,
        loeschen: function () { self.setState({ oSel: null }); self.aendere([{ id: o.id, feld: 'geloescht', wert: true, basis: false }], 'Gelöscht: ' + oname + (leute.length ? ' – ' + leute.length + (leute.length === 1 ? ' Person bleibt' : ' Personen bleiben') + ' ohne Organisation erhalten' : '')); }, ueber: this.wert(o.id, 'ueber', o.ueber), notiz: this.wert(o.id, 'notiz', o.notiz || ''),
        personen: leute.map(function (x) { return { name: self.wert(x.id, 'name', x.name), rolle: self.wert(x.id, 'rolle', x.rolle), ueber: self.wert(x.id, 'ueber', x.ueber), los: function () { self.setState({ ansicht: 'Personen', sel: x.id, filter: 'alle', merge: null }); } }; }),
        personenAnzahl: leute.length, vorgaenge: ovg, keineVorgaenge: ovg.length === 0,
        istTeam: this.wert(o.id, 'art', o.art) === 'Gründungsteam',
        istUngeprueft: ung(o), grund: o.grund || '',
        uebernehmen: function () { self.aendere([{ id: o.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + o.name); },
        verwerfen: function () { self.aendere([{ id: o.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + o.name); }
      };
    }
    // ——— Zusammenführen: Kandidaten, Vorschau, Konflikte feldweise (Personen und Organisationen) ———
    var ziel = istP ? p : o, kand = [];
    var alleZ = istP ? alleP : alleO;
    if (ziel) {
      var nm = this.wert(ziel.id, 'name', ziel.name).split(' ')[istP ? this.wert(ziel.id, 'name', ziel.name).split(' ').length - 1 : 0].toLowerCase().replace('meyer', 'meier');
      kand = alleZ.filter(function (x) { return x.id !== ziel.id && self.lebend(x) && (self.wert(x.id, 'name', x.name).toLowerCase().replace('meyer', 'meier').indexOf(nm) >= 0); });
      if (!kand.length) kand = alleZ.filter(function (x) { return x.id !== ziel.id && self.lebend(x) && ung(x); }).slice(0, 2);
    }
    var grundFuer = function (x) { return x.id === 'lmeier2' ? 'wahrscheinlich dieselbe Person: gleicher Nachname, Domain ähnlich wie Solaro' : x.id === 'lmeyer' ? 'eher eine andere Person: andere Schreibweise, Studierendenadresse' : x.id === 'solaro2' ? 'wahrscheinlich dieselbe Organisation: gleicher Name, Termine mit Lisa Meier' : 'keine Gemeinsamkeit erkannt – nur wählen, wenn du sicher bist'; };
    var w = st.mWahl ? alleZ.filter(function (x) { return x.id === st.mWahl; })[0] : null;
    var FELDER = istP ? [['rolle', 'Rolle'], ['orgId', 'Organisation'], ['telefon', 'Telefon']] : [['art', 'Art'], ['web', 'Website'], ['ort', 'Ort'], ['telefon', 'Telefon']];
    var anzeige = function (x, f) { var v = self.wert(x.id, f, x[f]); return f === 'orgId' ? self.orgName(x) : (v || ''); };
    var konflikte = w && ziel ? FELDER.filter(function (f) { var a = anzeige(ziel, f[0]), b = anzeige(w, f[0]); return a && b && a !== '–' && b !== '–' && a !== b; }).map(function (f) {
      var nimmB = st.mKonf[f[0]] === 'b';
      var setze = function (wert) { return function () { var m = Object.assign({}, self.state.mKonf); m[f[0]] = wert; self.setState({ mKonf: m }); }; };
      return { feld: f[0], label: f[1], name: 'konf-' + f[0], a: anzeige(ziel, f[0]), b: anzeige(w, f[0]), aGewaehlt: !nimmB, bGewaehlt: nimmB, waehleA: setze('a'), waehleB: setze('b'), idA: 'konf-' + f[0] + '-a', idB: 'konf-' + f[0] + '-b' };
    }) : [];
    var leuteVon = function (x) { return alleP.filter(function (y) { return self.lebend(y) && self.wert(y.id, 'orgId', y.orgId) === x.id; }); };
    var mPunkte = !w || !ziel ? [] : istP
      ? ['„' + w.name + '“ wird Teil von ' + this.wert(ziel.id, 'name', ziel.name), 'Adresse ' + w.adressen[0].adresse + ' kommt dazu', w.adressen[0].info + ' hängen danach an ' + this.wert(ziel.id, 'name', ziel.name), 'Rückgängig bleibt möglich']
      : ['„' + w.name + '“ wird Teil von ' + this.wert(ziel.id, 'name', ziel.name), leuteVon(w).length + (leuteVon(w).length === 1 ? ' Person wechselt' : ' Personen wechseln') + ' zu ' + this.wert(ziel.id, 'name', ziel.name) + (leuteVon(w).length ? ': ' + leuteVon(w).map(function (y) { return y.name; }).join(', ') : ''), 'Bereiche und Verlauf hängen danach an ' + this.wert(ziel.id, 'name', ziel.name), 'Rückgängig bleibt möglich'];
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    return Object.assign(this.kcVals(), this.toastVals(), this.detailVals(), P, {
      sidebarChats: this.kgChats(),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : zeilen.length + (istP ? ' Personen' : ' Organisationen'),
      ansichten: ['Personen', 'Organisationen'], ansicht: st.ansicht, setAnsicht: function (x) { self.setState({ ansicht: x, filter: 'alle', merge: null, pAuswahl: {}, pAlle: false, sortierung: 'Name A–Z', tSort: null, liste: 'Alle Listen' }); },
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      filter: [fl('alle', 'alle')].concat((istP ? ['Gründer:in', 'Mentor:in', 'Partner', 'Referent:in', 'Uni-intern', 'Sonstige'] : ['Gründungsteam', 'Partner', 'Mentor:in', 'Uni-intern', 'Sonstige']).map(function (r) { return fl(r, r); })).concat([fl('Dubletten?', 'Dubletten?'), fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft')]),
      istPersonen: istP,
      pruefModus: pruef,
      listenOptionen: ['Alle Listen'].concat(this.alleListen()), listeWahl: st.liste, setListe: function (e) { self.setState({ liste: e.target.value }); },
      sortierungen: istP ? ['Name A–Z', 'Zuletzt kontaktiert', 'Organisation'] : ['Name A–Z', 'Art'], sortierung: st.sortierung, setSortierung: function (e) { self.setState({ sortierung: e.target.value, tSort: null }); },
      tabelleKopf: tabelleKopf,
      tabelleRaster: istP ? 'grid-template-columns: 1.3fr 1fr 0.8fr 1.5fr 1fr 0.8fr 0.9fr 1fr' : 'grid-template-columns: 1.3fr 1fr 1.2fr 1fr 1fr',
      tabelle: tabelle, istTabelle: !!st.zu && !pruef, istZeilen: !st.zu || pruef,
      importExport: function (e) { var w = e.target.value; if (!w) return; self.aendere([], w === 'csv-export' ? 'Export: ' + zeilen.length + ' Kontakte als CSV (aktuelle Filter)' : w === 'vcf' ? 'vCard-Import: 3 neue Kontakte – als „ungeprüft“ angelegt' : 'CSV-Import: Spalten zuordnen, dann prüfen', true); },
      kopfZeile: !pruef && zeilen.length > 0 && !st.zu, spalteLinks: istP ? 'Name' : 'Organisation',
      zeilen: zeilen, keine: zeilen.length === 0,
      neu: function () {
        var id = 'n' + Date.now();
        if (istP) { var np = { id: id, name: 'Neuer Kontakt', rolle: 'Gründer:in', orgId: '', tage: 0, letzter: 'noch keiner', ueber: 'Andreas', mails: 'noch keine Mails', adressen: [{ adresse: '', info: 'neu · von Hand' }] };
          self.setState({ zu: false, sel: id, filter: 'alle', suche: '', liste: 'Alle Listen', merge: null }); self.aendere([{ id: '_neu', feld: 'personen', wert: [np].concat(self.wert('_neu', 'personen', [])), basis: [] }], 'Kontakt angelegt – Name oben ändern'); }
        else { var no = { id: id, name: 'Neue Organisation', art: 'Gründungsteam', web: '', ort: '', ueber: 'Andreas' };
          self.setState({ zu: false, oSel: id, filter: 'alle', suche: '', merge: null }); self.aendere([{ id: '_neu', feld: 'orgs', wert: [no].concat(self.wert('_neu', 'orgs', [])), basis: [] }], 'Organisation angelegt – Name oben ändern'); }
      },
      zeigePerson: !!p, p: pv, zeigeOrg: !!o, o: ov, nichtsOffen: istP ? !p : !o,
      rollen: ['Gründer:in', 'Mentor:in', 'Partner', 'Referent:in', 'Uni-intern', 'Sonstige'], orgArten: ['Gründungsteam', 'Partner', 'Mentor:in', 'Uni-intern', 'Sonstige'],
      orgNamen: orgNamen, ueberOptionen: ['Andreas', 'Julia', 'Mehmet', 'StartHub-Postfach'],
      mOffen: !!st.merge, mSuche: st.merge === 'suche', mVorschau: st.merge === 'vorschau' && !!w,
      mTitel: ziel ? 'Mit ' + this.wert(ziel.id, 'name', ziel.name) + ' zusammenführen' : '', mFrage: istP ? 'Wer ist dieselbe Person? Kollege schlägt vor, du entscheidest.' : 'Welche Organisation ist dieselbe? Kollege schlägt vor, du entscheidest.',
      konflikte: konflikte, hatKonflikte: konflikte.length > 0, keineKandidaten: kand.length === 0,
      mergeAuf: function () { self.setState({ merge: 'suche', mWahl: null, mKonf: {} }); },
      mergeZu: function () { self.setState({ merge: null, mWahl: null }); },
      mergeZurueck: function () { self.setState({ merge: 'suche', mWahl: null }); },
      kandidaten: kand.map(function (x) { return { name: self.wert(x.id, 'name', x.name), adresse: istP ? self.wert(x.id, 'adressen', x.adressen)[0].adresse : (x.web || ''), umfang: istP ? x.adressen[0].info : leuteVon(x).length + (leuteVon(x).length === 1 ? ' Person' : ' Personen'), grund: grundFuer(x), waehlen: function () { self.setState({ merge: 'vorschau', mWahl: x.id }); } }; }),
      mPunkte: mPunkte,
      mergeLos: function () {
        if (!w || !ziel) return;
        var ch = [{ id: w.id, feld: 'zusammengefuehrt', wert: true, basis: false }];
        konflikte.forEach(function (k) { if (self.state.mKonf[k.feld] === 'b') ch.push({ id: ziel.id, feld: k.feld, wert: self.wert(w.id, k.feld, w[k.feld]), basis: ziel[k.feld] }); });
        if (istP) { var adr = self.wert(ziel.id, 'adressen', ziel.adressen); ch.push({ id: ziel.id, feld: 'adressen', wert: adr.concat([{ adresse: w.adressen[0].adresse, info: 'übernommen von „' + w.name + '“' }]), basis: ziel.adressen }); }
        else leuteVon(w).forEach(function (y) { ch.push({ id: y.id, feld: 'orgId', wert: ziel.id, basis: y.orgId }); });
        self.setState({ merge: null, mWahl: null, mKonf: {} });
        self.aendere(ch, 'Zusammengeführt: ' + w.name + ' → ' + self.wert(ziel.id, 'name', ziel.name));
      }
    });
  }
}
