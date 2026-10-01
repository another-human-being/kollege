class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.basisState(), this.kcState(), { ansicht: 'Personen', filter: 'alle', suche: '', sel: 'lisa', oSel: 'solaro', merge: null, mWahl: null });
  }
  kcCfg() {
    var p = this.aktPerson();
    return { name: p ? this.wert(p.id, 'name', p.name) : 'Kontakte', anzahl: 'Mails, Termine, Bereiche', platzhalter: 'Frag oder notiere etwas zu dieser Person',
      antwort: 'Lisa hat zuletzt gestern den Pitchdeck-Entwurf geschickt, noch ohne Finanzteil. Offen von unserer Seite ist der Kontakt zu Frau Weber.',
      belege: [{ art: 'belegt', text: 'Pitchdeck-Entwurf ohne Finanzteil', quelle: 'Mail 29.09.' }, { art: 'belegt', text: 'Kontakt Frau Weber zugesagt', quelle: 'Chat 30.09.' }],
      luecke: 'Wie Lisa zu Terminen am Wochenende steht, kann ich aus ihren Mails nicht sagen.' };
  }
  personen() {
    var P = [
      { id: 'lisa', name: 'Lisa Meier', rolle: 'Gründer:in', org: 'Solaro', tage: 1, letzter: 'gestern · Mail', ueber: 'Andreas', mails: 'Andreas 9 Mails · Julia 2 Mails', telefon: '0151 2345 6789',
        adressen: [{ adresse: 'lisa@solaro.de', info: 'Hauptadresse · 9 Mails' }, { adresse: 'l.meier@gmx.de', info: '1 Mail · bestätigt 30.09.' }, { adresse: 'lisa.meier@uni-augsburg.de', info: 'Kalender · 2 Termine' }],
        notiz: 'Ansprechpartnerin für alles rund um den EXIST-Antrag. Antwortet meist abends.' },
      { id: 'tom', name: 'Tom Kraus', rolle: 'Gründer:in', org: 'Solaro', tage: 4, letzter: 'vor 4 T. · Mail', ueber: 'Andreas', mails: 'Andreas 4 Mails · Julia 1 Mail', adressen: [{ adresse: 'tom@solaro.de', info: 'Hauptadresse · 5 Mails' }] },
      { id: 'sara', name: 'Sara Yilmaz', rolle: 'Gründer:in', org: 'Kitchen Loop', tage: 2, letzter: 'vor 2 T. · Mail', ueber: 'Julia', mails: 'Julia 6 Mails · Andreas 1 Mail', adressen: [{ adresse: 'sara@kitchenloop.de', info: 'Hauptadresse · 7 Mails' }] },
      { id: 'ben', name: 'Ben Hofer', rolle: 'Gründer:in', org: 'Kitchen Loop', tage: 6, letzter: 'vor 6 T. · Termin', ueber: 'Julia', mails: 'Julia 3 Mails · Mehmet 2 Mails', adressen: [{ adresse: 'ben@kitchenloop.de', info: 'Hauptadresse · 5 Mails' }] },
      { id: 'jonas', name: 'Jonas Berg', rolle: 'Gründer:in', org: 'Nordlicht Analytics', tage: 23, letzter: 'vor 23 T. · Termin', ueber: 'Andreas', mails: 'Andreas 2 Mails', adressen: [{ adresse: 'jonas@nordlicht-analytics.de', info: 'Hauptadresse · 2 Mails' }] },
      { id: 'weber', name: 'Anna Weber', rolle: 'Partner', org: 'IHK Schwaben', tage: 12, letzter: 'vor 12 T. · Mail', ueber: 'Julia', mails: 'Julia 3 Mails', adressen: [{ adresse: 'anna.weber@schwaben.ihk.de', info: 'Hauptadresse · 3 Mails' }], notiz: 'Soll Jurorin beim Pitch-Abend werden; Rückmeldung steht aus.' },
      { id: 'vogt', name: 'Karin Vogt', rolle: 'Partner', org: 'Stadtwerke Augsburg', tage: 1, letzter: 'gestern · Mail', ueber: 'Andreas', mails: 'Andreas 2 Mails', adressen: [{ adresse: 'k.vogt@stadtwerke-augsburg.de', info: 'Hauptadresse · 2 Mails' }] },
      { id: 'lang', name: 'Petra Lang', rolle: 'Partner', org: 'Studierendenwerk Augsburg', tage: 12, letzter: 'vor 12 T. · Telefon', ueber: 'Julia', mails: 'Julia 4 Mails', adressen: [{ adresse: 'p.lang@studentenwerk-augsburg.de', info: 'Hauptadresse · 4 Mails' }] },
      { id: 'albrecht', name: 'Dr. Kerstin Albrecht', rolle: 'Mentor:in', org: 'Albrecht Consulting', tage: 34, letzter: 'vor 34 T. · Mail', ueber: 'Andreas', mails: 'Andreas 3 Mails', adressen: [{ adresse: 'k.albrecht@albrecht-consulting.de', info: 'Hauptadresse · 3 Mails' }] },
      { id: 'hartmann', name: 'Prof. Dr. Martin Hartmann', rolle: 'Uni-intern', org: 'Universität Augsburg', tage: 2, letzter: 'vor 2 T. · Mail', ueber: 'Andreas', mails: 'Andreas 6 Mails', adressen: [{ adresse: 'hartmann@uni-augsburg.de', info: 'Hauptadresse · 6 Mails' }] },
      { id: 'lmeier2', ungeprueft: true, name: 'L. Meier', rolle: 'Gründer:in', org: 'Solaro', tage: 40, letzter: 'vor 40 T. · Termin', ueber: 'Andreas', mails: 'Andreas 1 Mail', adressen: [{ adresse: 'l.meier@solaro-energy.de', info: '2 Termine, 1 Mail' }], grund: 'Absender in 2 Terminen und 1 Mail', quelle: 'Import Kalender' },
      { id: 'nora', ungeprueft: true, name: 'Nora Kim', rolle: 'Gründer:in', org: 'Greenbyte', tage: 1, letzter: 'gestern · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'nora@greenbyte.io', info: '1 Mail' }], grund: 'Anfrage über das StartHub-Postfach', quelle: 'Mail 29.09.' },
      { id: 'max', ungeprueft: true, name: 'Max Brandt', rolle: 'Gründer:in', org: '–', tage: 1, letzter: 'gestern · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'max.brandt@student.uni-augsburg.de', info: '1 Mail' }], grund: 'Anfrage Gründungsstipendium', quelle: 'Mail 29.09.' },
      { id: 'ott', ungeprueft: true, name: 'Sven Ott', rolle: 'Partner', org: 'Kitchen Loop Catering', tage: 7, letzter: 'vor 7 T. · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'ott@kl-catering.de', info: '1 Mail' }], grund: 'CC in einer Mail an Kitchen Loop', quelle: 'Mail 23.09.' },
      { id: 'redaktion', ungeprueft: true, name: 'Redaktion Augsburger Allgemeine', rolle: 'Sonstige', org: 'Augsburger Allgemeine', tage: 0, letzter: 'heute · Mail', ueber: 'StartHub-Postfach', mails: 'StartHub 1 Mail', adressen: [{ adresse: 'redaktion@augsburger-allgemeine.de', info: '1 Mail' }], grund: 'Presseanfrage', quelle: 'Mail heute 08:05' },
      { id: 'lmeyer', ungeprueft: true, name: 'Lisa Meyer', rolle: 'Sonstige', org: '–', tage: 90, letzter: 'vor 90 T. · Mail', ueber: 'Andreas', mails: 'Andreas 1 Mail', adressen: [{ adresse: 'lisa.meyer@student.uni-augsburg.de', info: '1 Mail' }], grund: 'Absenderin einer Mail zu Sprechzeiten', quelle: 'Import Mail 02.07.' }
    ];
    return this.wert('_neu', 'personen', []).concat(P);
  }
  orgs() {
    var O = [
      { id: 'solaro', name: 'Solaro', art: 'Gründungsteam', web: 'solaro.de', ort: 'Augsburg', ueber: 'Andreas', notiz: 'Solarspeicher für Balkonkraftwerke. EXIST-Antrag in Arbeit.' },
      { id: 'kl', name: 'Kitchen Loop', art: 'Gründungsteam', web: 'kitchenloop.de', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'nord', name: 'Nordlicht Analytics', art: 'Gründungsteam', web: 'nordlicht-analytics.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'ihk', name: 'IHK Schwaben', art: 'Partner', web: 'ihk.de/schwaben', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'swa', name: 'Stadtwerke Augsburg', art: 'Partner', web: 'sw-augsburg.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'stw', name: 'Studierendenwerk Augsburg', art: 'Partner', web: '', ort: 'Augsburg', ueber: 'Julia' },
      { id: 'ac', name: 'Albrecht Consulting', art: 'Mentor:in', web: '', ort: 'München', ueber: 'Andreas' },
      { id: 'uni', name: 'Universität Augsburg', art: 'Uni-intern', web: 'uni-augsburg.de', ort: 'Augsburg', ueber: 'Andreas' },
      { id: 'green', ungeprueft: true, name: 'Greenbyte', art: 'Gründungsteam', web: 'greenbyte.io', ort: '', ueber: 'StartHub-Postfach', grund: 'aus der Mail von Nora Kim' },
      { id: 'klc', ungeprueft: true, name: 'Kitchen Loop Catering', art: 'Partner', web: '', ort: '', ueber: 'StartHub-Postfach', grund: 'aus einer Mail-Signatur' },
      { id: 'aa', ungeprueft: true, name: 'Augsburger Allgemeine', art: 'Sonstige', web: 'augsburger-allgemeine.de', ort: 'Augsburg', ueber: 'StartHub-Postfach', grund: 'Presseanfrage' }
    ];
    return this.wert('_neu', 'orgs', []).concat(O);
  }
  vorgaengeFuer(org) {
    return ({
      'Solaro': [{ titel: 'Gründungsteams · Solaro', info: 'Vorgründung · Andreas', href: 'Gruendungsteams.dc.html' }, { titel: 'Events · Pitch-Abend', info: 'pitcht', href: 'Events.dc.html' }],
      'Kitchen Loop': [{ titel: 'Gründungsteams · Kitchen Loop', info: 'Vorgründung · Julia', href: 'Gruendungsteams.dc.html' }],
      'Nordlicht Analytics': [{ titel: 'Gründungsteams · Nordlicht Analytics', info: 'hängt · 23 T.', href: 'Gruendungsteams.dc.html' }],
      'IHK Schwaben': [{ titel: 'Events · Pitch-Abend', info: 'Jury', href: 'Events.dc.html' }],
      'Studierendenwerk Augsburg': [{ titel: 'Gründungsteams · Kitchen Loop', info: 'Mensa-Pilot', href: 'Gruendungsteams.dc.html' }],
      'Universität Augsburg': [{ titel: 'Lehre · Entrepreneurship Basics', info: 'WS 26/27', href: 'Lehre.dc.html' }],
      'Greenbyte': [{ titel: 'Gründungsteams · Greenbyte', info: 'ungeprüft', href: 'Gruendungsteams.dc.html' }]
    })[org] || [];
  }
  lebend(x) { return !this.wert(x.id, 'geloescht', false) && this.wert(x.id, 'geprueft', '') !== 'weg' && !this.wert(x.id, 'zusammengefuehrt', false); }
  aktPerson() { var self = this; return this.personen().filter(function (p) { return p.id === self.state.sel && self.lebend(p); })[0]; }
  renderVals() {
    var self = this, st = this.state, istP = st.ansicht === 'Personen';
    var alleP = this.personen(), alleO = this.orgs();
    var roh = istP ? alleP : alleO;
    var pruef = st.filter === 'ungeprüft';
    var P = this.pruefVals(roh, istP ? 88 : 31, istP ? 'Personen' : 'Organisationen');
    var ung = function (x) { return !!x.ungeprueft && !self.wert(x.id, 'geprueft', ''); };
    var q = st.suche.trim().toLowerCase();
    var liste = roh.filter(function (x) {
      if (!self.lebend(x)) return false;
      if (pruef) return ung(x);
      if (ung(x)) return false;
      var rolle = istP ? self.wert(x.id, 'rolle', x.rolle) : self.wert(x.id, 'art', x.art);
      if (st.filter !== 'alle' && rolle !== st.filter) return false;
      var text = istP ? self.wert(x.id, 'name', x.name) + ' ' + self.wert(x.id, 'org', x.org) + ' ' + self.wert(x.id, 'adressen', x.adressen).map(function (a) { return a.adresse; }).join(' ') : self.wert(x.id, 'name', x.name);
      return !q || text.toLowerCase().indexOf(q) >= 0;
    });
    var zeilen = liste.map(function (x) {
      var aktiv = istP ? x.id === st.sel : x.id === st.oSel;
      var unter;
      if (istP) unter = self.wert(x.id, 'rolle', x.rolle) + ' · ' + self.wert(x.id, 'org', x.org) + ' · ' + (pruef ? x.grund : 'zuletzt ' + x.letzter);
      else { var n = alleP.filter(function (p) { return self.lebend(p) && self.wert(p.id, 'org', p.org) === self.wert(x.id, 'name', x.name); }).length; unter = self.wert(x.id, 'art', x.art) + ' · ' + n + (n === 1 ? ' Person' : ' Personen') + (pruef ? ' · ' + x.grund : ''); }
      return { titel: self.wert(x.id, 'name', x.name), ueber: self.wert(x.id, 'ueber', x.ueber), unter: unter,
        unterStil: istP && x.tage >= 30 ? 'color: var(--ink-faint)' : '',
        pruef: pruef, normal: !pruef, aktiv: aktiv ? 'true' : 'false',
        gewaehlt: P.pruefIstGewaehlt(x.id), waehlen: P.pruefWaehle(x.id),
        los: function () { var s = { merge: null, mWahl: null, kcOffen: false }; if (istP) s.sel = x.id; else s.oSel = x.id; self.setState(s); } };
    });
    var orgNamen = ['–'].concat(alleO.filter(function (o) { return self.lebend(o); }).map(function (o) { return self.wert(o.id, 'name', o.name); }));

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
        { monat: 'September 2026', datum: '21.09.', art: 'Mail', text: 'Mail von Julia an Lisa Meier · Inhalt nur für Julia', privat: true },
        { monat: 'September 2026', datum: '12.09.', art: 'Mail', text: 'Fragen zum Gründungsstipendium', quelle: 'Mail', herkunft: 'Eingang' }
      ] : [{ monat: 'September 2026', datum: p.tage === 0 ? '30.09.' : 'vor ' + p.tage + ' T.', art: p.letzter.split('· ')[1] || 'Mail', text: 'Letzter Kontakt', quelle: p.letzter.split(' · ')[1] || 'Mail' }];
      var vgs = this.vorgaengeFuer(this.wert(p.id, 'org', p.org));
      pv = {
        f: this.feld(p.id, p, 'Kontakt'),
        name: this.wert(p.id, 'name', p.name), rolle: this.wert(p.id, 'rolle', p.rolle), org: this.wert(p.id, 'org', p.org),
        telefon: this.wert(p.id, 'telefon', p.telefon || ''), notiz: this.wert(p.id, 'notiz', p.notiz || ''),
        ueber: this.wert(p.id, 'ueber', p.ueber), ueberBerechnet: p.mails,
        letzter: p.letzter, letzterStil: p.tage >= 30 ? 'color: var(--attention)' : '',
        zurOrg: function () { var n = self.wert(p.id, 'org', p.org); var o = alleO.filter(function (o) { return self.wert(o.id, 'name', o.name) === n; })[0]; if (o) self.setState({ ansicht: 'Organisationen', oSel: o.id, filter: 'alle', merge: null }); },
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
      var leute = alleP.filter(function (x) { return self.lebend(x) && self.wert(x.id, 'org', x.org) === oname; });
      var ovg = this.vorgaengeFuer(oname);
      ov = {
        f: this.feld(o.id, o, 'Organisation'),
        name: oname, art: this.wert(o.id, 'art', o.art), web: this.wert(o.id, 'web', o.web || ''), ort: this.wert(o.id, 'ort', o.ort || ''), ueber: this.wert(o.id, 'ueber', o.ueber), notiz: this.wert(o.id, 'notiz', o.notiz || ''),
        personen: leute.map(function (x) { return { name: self.wert(x.id, 'name', x.name), rolle: self.wert(x.id, 'rolle', x.rolle), ueber: self.wert(x.id, 'ueber', x.ueber), los: function () { self.setState({ ansicht: 'Personen', sel: x.id, filter: 'alle', merge: null }); } }; }),
        personenAnzahl: leute.length, vorgaenge: ovg, keineVorgaenge: ovg.length === 0,
        istTeam: this.wert(o.id, 'art', o.art) === 'Gründungsteam',
        istUngeprueft: ung(o), grund: o.grund || '',
        uebernehmen: function () { self.aendere([{ id: o.id, feld: 'geprueft', wert: 'ok', basis: '' }], 'Übernommen: ' + o.name); },
        verwerfen: function () { self.aendere([{ id: o.id, feld: 'geprueft', wert: 'weg', basis: '' }], 'Verworfen: ' + o.name); }
      };
    }
    // ——— Zusammenführen ———
    var kand = [];
    if (p) {
      var nm = this.wert(p.id, 'name', p.name).split(' ').pop().toLowerCase().replace('meyer', 'meier');
      kand = alleP.filter(function (x) { return x.id !== p.id && self.lebend(x) && (self.wert(x.id, 'name', x.name).toLowerCase().replace('meyer', 'meier').indexOf(nm) >= 0); });
      if (!kand.length) kand = alleP.filter(function (x) { return x.id !== p.id && self.lebend(x) && ung(x); }).slice(0, 2);
    }
    var grundFuer = function (x) { return x.id === 'lmeier2' ? 'wahrscheinlich dieselbe Person: gleicher Nachname, Domain ähnlich wie Solaro' : x.id === 'lmeyer' ? 'eher eine andere Person: andere Schreibweise, Studierendenadresse' : 'keine Gemeinsamkeit erkannt – nur wählen, wenn du sicher bist'; };
    var w = st.mWahl ? alleP.filter(function (x) { return x.id === st.mWahl; })[0] : null;
    var fl = function (label, key) { return { label: label, an: st.filter === key ? 'true' : 'false', los: function () { self.setState({ filter: key, pAuswahl: {}, pAlle: false }); } }; };
    return Object.assign(this.kcVals(), this.toastVals(), P, {
      sidebarChats: this.kgChats(),
      zaehler: pruef ? P.pruefGesamt + ' ungeprüft' : zeilen.length + (istP ? ' Personen' : ' Organisationen'),
      ansichten: ['Personen', 'Organisationen'], ansicht: st.ansicht, setAnsicht: function (x) { self.setState({ ansicht: x, filter: 'alle', merge: null, pAuswahl: {}, pAlle: false }); },
      suche: st.suche, sucheTippen: function (e) { self.setState({ suche: e.target.value }); },
      filter: (istP ? [fl('alle', 'alle'), fl('Gründer:in', 'Gründer:in'), fl('Partner', 'Partner'), fl('Mentor:in', 'Mentor:in')] : [fl('alle', 'alle'), fl('Gründungsteam', 'Gründungsteam'), fl('Partner', 'Partner')]).concat([fl('ungeprüft · ' + P.pruefGesamt, 'ungeprüft')]),
      pruefModus: pruef,
      kopfZeile: !pruef && zeilen.length > 0, spalteLinks: istP ? 'Name' : 'Organisation',
      zeilen: zeilen, keine: zeilen.length === 0,
      neu: function () {
        var id = 'n' + Date.now();
        if (istP) { var np = { id: id, name: 'Neuer Kontakt', rolle: 'Gründer:in', org: '–', tage: 0, letzter: 'noch keiner', ueber: 'Andreas', mails: 'noch keine Mails', adressen: [{ adresse: '', info: 'neu · von Hand' }] };
          self.setState({ sel: id, filter: 'alle', merge: null }); self.aendere([{ id: '_neu', feld: 'personen', wert: [np].concat(self.wert('_neu', 'personen', [])), basis: [] }], 'Kontakt angelegt – Name oben ändern'); }
        else { var no = { id: id, name: 'Neue Organisation', art: 'Gründungsteam', web: '', ort: '', ueber: 'Andreas' };
          self.setState({ oSel: id, filter: 'alle', merge: null }); self.aendere([{ id: '_neu', feld: 'orgs', wert: [no].concat(self.wert('_neu', 'orgs', [])), basis: [] }], 'Organisation angelegt – Name oben ändern'); }
      },
      zeigePerson: !!p, p: pv, zeigeOrg: !!o, o: ov, nichtsOffen: istP ? !p : !o,
      rollen: ['Gründer:in', 'Mentor:in', 'Partner', 'Referent:in', 'Uni-intern', 'Sonstige'], orgArten: ['Gründungsteam', 'Partner', 'Mentor:in', 'Uni-intern', 'Sonstige'],
      orgNamen: orgNamen, ueberOptionen: ['Andreas', 'Julia', 'Mehmet', 'StartHub-Postfach'],
      mOffen: !!st.merge, mSuche: st.merge === 'suche', mVorschau: st.merge === 'vorschau' && !!w,
      mTitel: istP ? (p ? 'Mit ' + this.wert(p.id, 'name', p.name) + ' zusammenführen' : '') : (o ? 'Mit ' + this.wert(o.id, 'name', o.name) + ' zusammenführen' : ''),
      mergeAuf: function () { self.setState({ merge: 'suche', mWahl: null }); },
      mergeZu: function () { self.setState({ merge: null, mWahl: null }); },
      mergeZurueck: function () { self.setState({ merge: 'suche', mWahl: null }); },
      kandidaten: kand.map(function (x) { return { name: self.wert(x.id, 'name', x.name), adresse: self.wert(x.id, 'adressen', x.adressen)[0].adresse, umfang: x.adressen[0].info, grund: grundFuer(x), waehlen: function () { self.setState({ merge: 'vorschau', mWahl: x.id }); } }; }),
      mPunkte: w && p ? ['„' + w.name + '“ wird Teil von ' + this.wert(p.id, 'name', p.name), 'Adresse ' + w.adressen[0].adresse + ' kommt dazu', w.adressen[0].info + ' hängen danach an ' + this.wert(p.id, 'name', p.name), 'Rückgängig bleibt möglich'] : [],
      mergeLos: function () {
        if (!w || !p) return;
        var adr = self.wert(p.id, 'adressen', p.adressen);
        self.setState({ merge: null, mWahl: null });
        self.aendere([{ id: w.id, feld: 'zusammengefuehrt', wert: true, basis: false }, { id: p.id, feld: 'adressen', wert: adr.concat([{ adresse: w.adressen[0].adresse, info: 'übernommen von „' + w.name + '“' }]), basis: p.adressen }], 'Zusammengeführt: ' + w.name + ' → ' + self.wert(p.id, 'name', p.name));
      }
    });
  }
}
